import { GoogleGenerativeAI } from '@google/generative-ai';
import { CarbonFootprint, AIInsights, AIActionPlanItem, User } from '../types';
import { dbClient } from '../repositories/dbClient';

export class AIService {
  private static getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (err) {
      console.error('Error initializing Gemini AI SDK:', err);
      return null;
    }
  }

  /**
   * Generates deep sustainability insights for the user.
   */
  public static async generateInsights(user: User): Promise<AIInsights> {
    const footprints = await dbClient.getFootprintsByUserId(user.id);
    if (footprints.length === 0) {
      return this.generateDefaultInsights();
    }

    const latest = footprints[footprints.length - 1];
    const previous = footprints.length >= 2 ? footprints[footprints.length - 2] : null;

    // Detect spikes
    let spikeExplanation: string | null = null;
    if (previous && latest.totalEmissions > previous.totalEmissions * 1.1) {
      const pctIncrease = Math.round(((latest.totalEmissions - previous.totalEmissions) / previous.totalEmissions) * 100);
      
      // Determine what caused the spike
      const diffs = [
        { cat: 'Transportation', diff: latest.transportEmissions - previous.transportEmissions },
        { cat: 'Home Energy', diff: latest.energyEmissions - previous.energyEmissions },
        { cat: 'Food', diff: latest.foodEmissions - previous.foodEmissions },
        { cat: 'Shopping', diff: latest.shoppingEmissions - previous.shoppingEmissions },
        { cat: 'Waste', diff: latest.wasteEmissions - previous.wasteEmissions },
      ];
      const mainCause = diffs.sort((a, b) => b.diff - a.diff)[0];

      spikeExplanation = `Your emissions increased by ${pctIncrease}% this month compared to last month. This spike was primarily driven by higher ${mainCause.cat} activities. Implementing small changes, such as turning off idle equipment or driving 10km less per week, could save approximately ${Math.round(mainCause.diff * 0.4)} kg CO2 monthly.`;
    }

    // 1. Check if we can use Gemini
    const model = this.getGeminiModel();
    if (model) {
      try {
        const prompt = this.buildGeminiPrompt(user, latest, previous, spikeExplanation);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.parseGeminiResponse(text, latest, spikeExplanation);
      } catch (err) {
        console.error('Gemini API call failed, falling back to deterministic coach:', err);
      }
    }

    // 2. Fallback to deterministic AI engine
    return this.generateDeterministicInsights(user, latest, previous, spikeExplanation);
  }

  /**
   * Conversational chatbot service with AI Coach.
   */
  public static async chatWithCoach(user: User, message: string, chatHistory: { role: 'user' | 'model'; parts: string }[] = []): Promise<string> {
    const footprints = await dbClient.getFootprintsByUserId(user.id);
    const latest = footprints.length > 0 ? footprints[footprints.length - 1] : null;

    const model = this.getGeminiModel();
    if (model) {
      try {
        const systemInstruction = `You are the EcoTrack AI Sustainability Coach, an expert environmental advisor. 
You help individuals track, calculate, and reduce their carbon footprint.
User's Profile:
- Name: ${user.fullName}
- Level: ${user.level} (Points: ${user.points})
- Current Monthly Carbon Budget: ${user.carbonBudget} kg CO2
- Latest Monthly Emissions: ${latest ? latest.totalEmissions + ' kg CO2' : 'No emissions logged yet'}
${latest ? `Breakdown: Transport: ${latest.transportEmissions}kg, Energy: ${latest.energyEmissions}kg, Food: ${latest.foodEmissions}kg, Shopping: ${latest.shoppingEmissions}kg, Waste: ${latest.wasteEmissions}kg` : ''}

Rules:
1. Always align your recommendations with the UN Sustainable Development Goals (SDG 7, 11, 12, 13). Mention them where appropriate.
2. Be encouraging, highly practical, and keep your responses concise and easy to read. Use bullet points and bold formatting.
3. If asked about their specific footprint details, reference their profile data.
4. Calculate carbon savings mathematically whenever possible.`;

        const chat = model.startChat({
          history: chatHistory.map(h => ({
            role: h.role,
            parts: [{ text: h.parts }]
          })),
          generationConfig: {
            maxOutputTokens: 500,
          }
        });

        // Prefix the message with system context to keep the coach grounded
        const prompt = `System Instruction Context: ${systemInstruction}\nUser message: ${message}`;
        const result = await chat.sendMessage(prompt);
        return result.response.text();
      } catch (err) {
        console.error('Gemini Chat failed, falling back to rule-based coach responder:', err);
      }
    }

    return this.getDeterministicChatResponse(user, latest, message);
  }

  private static buildGeminiPrompt(user: User, latest: CarbonFootprint, previous: CarbonFootprint | null, spikeExplanation: string | null): string {
    return `Analyze the following carbon footprint data for user ${user.fullName} and generate a structured sustainability action report in JSON format.
    
User Stats:
- Monthly Carbon Budget: ${user.carbonBudget} kg CO2
- Active Monthly Emissions: ${latest.totalEmissions} kg CO2
  Breakdown:
  * Transportation: ${latest.transportEmissions} kg CO2
  * Home Energy: ${latest.energyEmissions} kg CO2
  * Food: ${latest.foodEmissions} kg CO2
  * Shopping: ${latest.shoppingEmissions} kg CO2
  * Waste: ${latest.wasteEmissions} kg CO2

${previous ? `Previous Month's Total Emissions: ${previous.totalEmissions} kg CO2` : ''}
${spikeExplanation ? `Detected Emission Spike: ${spikeExplanation}` : ''}

You MUST return a JSON object that strictly adheres to this structure (do not wrap in markdown quotes, output raw JSON only):
{
  "roadmap": {
    "immediateTargets": ["Target 1 (e.g. Reduce flight hours or car travel by 10%)", "Target 2"],
    "longTermGoals": ["Long term 1 (e.g. Install rooftop solar panel)", "Long term 2"],
    "recommendedOffsetsKg": 250
  },
  "weeklyActionPlan": [
    {
      "habit": "Switch to public transit twice a week",
      "impact": "Saves 15 kg CO2 / week",
      "difficulty": "easy",
      "sdgAlignments": ["SDG 11", "SDG 13"]
    }
  ],
  "peerComparison": "Compare user footprint with averages. E.g. 'Your emissions are 12% lower than the national average, placing you in the top 30% of eco-citizens.'",
  "reportSummary": "Provide a detailed executive paragraph discussing their largest contributors and positive trends."
}

Generate 3 high-impact weekly action plans mapped to SDGs (SDG 7, 11, 12, or 13). Set recommendedOffsetsKg as 50% of their totalEmissions.`;
  }

  private static parseGeminiResponse(text: string, latest: CarbonFootprint, spikeExplanation: string | null): AIInsights {
    try {
      // Strip any potential markdown wrapper
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const obj = JSON.parse(cleaned);
      return {
        roadmap: obj.roadmap || { immediateTargets: [], longTermGoals: [], recommendedOffsetsKg: 0 },
        weeklyActionPlan: obj.weeklyActionPlan || [],
        spikeExplanation,
        peerComparison: obj.peerComparison || '',
        reportSummary: obj.reportSummary || '',
      };
    } catch (err) {
      console.error('Failed to parse Gemini JSON output, falling back:', err);
      // Fallback if parsing fails
      return this.generateDeterministicInsights(null as any, latest, null, spikeExplanation);
    }
  }

  private static generateDefaultInsights(): AIInsights {
    return {
      roadmap: {
        immediateTargets: ['Log your first carbon footprint to generate immediate goals.'],
        longTermGoals: ['Aim to stay within a 350 kg CO2 monthly budget.'],
        recommendedOffsetsKg: 0
      },
      weeklyActionPlan: [
        { habit: 'Calculate your transport emissions', impact: 'Enables baseline tracking', difficulty: 'easy', sdgAlignments: ['SDG 13'] }
      ],
      spikeExplanation: null,
      peerComparison: 'Log footprint data to compare your emissions with national and global benchmarks.',
      reportSummary: 'Welcome to EcoTrack AI! Complete the Carbon Calculator wizard to receive deep AI sustainability reports, roadmaps, and SDG-aligned habits.'
    };
  }

  private static generateDeterministicInsights(user: User, latest: CarbonFootprint, _previous: CarbonFootprint | null, spikeExplanation: string | null): AIInsights {
    const total = latest.totalEmissions;
    const categories = [
      { name: 'Transportation', value: latest.transportEmissions, key: 'transportation' },
      { name: 'Home Energy', value: latest.energyEmissions, key: 'homeEnergy' },
      { name: 'Food Habits', value: latest.foodEmissions, key: 'food' },
      { name: 'Shopping Habits', value: latest.shoppingEmissions, key: 'shopping' },
      { name: 'Waste Generation', value: latest.wasteEmissions, key: 'waste' },
    ];

    const sortedCats = categories.sort((a, b) => b.value - a.value);
    const topCat = sortedCats[0];
    const secondCat = sortedCats[1];

    // Build Roadmap
    const immediateTargets: string[] = [];
    const longTermGoals: string[] = [];

    if (topCat.key === 'transportation') {
      immediateTargets.push('Reduce private vehicle use by 20% by carpooling or cycling.');
      immediateTargets.push('Replace one short car trip (<5km) per week with a bicycle ride.');
      longTermGoals.push('Consolidate air travel schedules to reduce annual flight hours.');
    } else if (topCat.key === 'homeEnergy') {
      immediateTargets.push('Reduce air conditioner usage by 1 hour daily.');
      immediateTargets.push('Switch remaining light bulbs to high-efficiency LEDs.');
      longTermGoals.push('Transition to solar power or join a community renewable energy network.');
    } else if (topCat.key === 'food') {
      immediateTargets.push('Introduce "Meatless Mondays" or swap 2 heavy meat meals for plant-based alternatives.');
      longTermGoals.push('Source food locally to reduce food miles emissions.');
    } else {
      immediateTargets.push('Opt for local stores over online shopping to save packaging and transport overhead.');
      immediateTargets.push('Follow a strict recycling schedule for plastics, glass, and paper.');
      longTermGoals.push('Implement composting to reduce organic waste going to landfills.');
    }

    // Add generic ones
    immediateTargets.push(`Stay strictly below your monthly carbon budget of ${user?.carbonBudget || 400} kg CO2.`);
    longTermGoals.push('Achieve a Climate Champion badge by completing 10 weekly challenges.');

    // Build weekly actions
    const weeklyActionPlan: AIActionPlanItem[] = [];
    
    // Action 1: Address Top Category
    if (topCat.key === 'transportation') {
      weeklyActionPlan.push({
        habit: 'Use public transport for your main commute twice this week',
        impact: `Reduces emissions by ~${Math.round(latest.inputs.carKm * 0.14 * 0.2)} kg CO2`,
        difficulty: 'medium',
        sdgAlignments: ['SDG 11', 'SDG 13']
      });
    } else if (topCat.key === 'homeEnergy') {
      weeklyActionPlan.push({
        habit: 'Unplug stand-by electronics (TV, PC) overnight',
        impact: 'Saves ~5 kg CO2 per week',
        difficulty: 'easy',
        sdgAlignments: ['SDG 7', 'SDG 13']
      });
    } else if (topCat.key === 'food') {
      weeklyActionPlan.push({
        habit: 'Adopt a vegan diet for 2 days this week',
        impact: `Saves ~6 kg CO2`,
        difficulty: 'easy',
        sdgAlignments: ['SDG 12', 'SDG 13']
      });
    } else {
      weeklyActionPlan.push({
        habit: 'Strictly recycle all plastics and metal cans',
        impact: 'Reduces waste footprint by 15%',
        difficulty: 'easy',
        sdgAlignments: ['SDG 12']
      });
    }

    // Action 2: Address Second Category
    if (secondCat.key === 'homeEnergy') {
      weeklyActionPlan.push({
        habit: 'Set thermostat of AC to 24°C instead of lower temperature',
        impact: 'Saves ~8 kg CO2 per week',
        difficulty: 'easy',
        sdgAlignments: ['SDG 7', 'SDG 13']
      });
    } else {
      weeklyActionPlan.push({
        habit: 'Compost organic kitchen waste to avoid methane release',
        impact: 'Saves ~4 kg CO2 per week',
        difficulty: 'medium',
        sdgAlignments: ['SDG 12']
      });
    }

    // Action 3: General Action
    weeklyActionPlan.push({
      habit: 'Use reusable shopping bags and avoid single-use plastics',
      impact: 'Reduces plastic waste by 0.5 kg/week',
      difficulty: 'easy',
      sdgAlignments: ['SDG 12', 'SDG 13']
      
    });

    // Offset recommendations (50% of latest total emissions)
    const recommendedOffsetsKg = Math.round(total * 0.5);

    // Benchmarking comparison text
    const indiaAvgMonthly = 1900 / 12;
    const globalAvgMonthly = 4700 / 12;

    let peerComparison = '';
    if (total < indiaAvgMonthly) {
      const diff = Math.round(((indiaAvgMonthly - total) / indiaAvgMonthly) * 100);
      peerComparison = `Excellent! Your monthly emissions are ${diff}% lower than the Indian national average (${Math.round(indiaAvgMonthly)} kg CO2/month). You are leading by example!`;
    } else if (total < globalAvgMonthly) {
      const diff = Math.round(((globalAvgMonthly - total) / globalAvgMonthly) * 100);
      peerComparison = `Good job. Your emissions are ${diff}% lower than the global average (${Math.round(globalAvgMonthly)} kg CO2/month), but they are higher than the average Indian household footprint.`;
    } else {
      const diff = Math.round(((total - globalAvgMonthly) / globalAvgMonthly) * 100);
      peerComparison = `Warning: Your footprint is ${diff}% higher than the global average. Focusing on reducing home electricity and vehicle transport will yield the fastest improvements.`;
    }

    const reportSummary = `Based on your logs, your total carbon footprint stands at **${Math.round(total)} kg CO2** this month. The leading contributor is **${topCat.name}** representing **${Math.round((topCat.value / total) * 100)}%** of your emissions, followed by **${secondCat.name}** at **${Math.round((secondCat.value / total) * 100)}%**. Staying within your monthly budget of **${user?.carbonBudget || 400} kg CO2** should be your primary goal.`;

    return {
      roadmap: {
        immediateTargets,
        longTermGoals,
        recommendedOffsetsKg,
      },
      weeklyActionPlan,
      spikeExplanation,
      peerComparison,
      reportSummary,
    };
  }

  private static getDeterministicChatResponse(user: User, latest: CarbonFootprint | null, message: string): string {
    const msg = message.toLowerCase();

    if (!latest) {
      return `Hello ${user.fullName}! I'm your AI Sustainability Coach. I don't see any logged carbon footprints yet. Please click on **Calculator** in the navigation bar to log your activities, and I'll analyze your emissions, identify spikes, and map out a customized action plan aligned with the UN SDGs (SDGs 7, 11, 12, 13). How can I help you today?`;
    }

    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return `Hello ${user.fullName}! I'm your AI Sustainability Coach. Based on your latest logs, your monthly footprint is **${Math.round(latest.totalEmissions)} kg CO2**. Your highest emission category is **${this.getHighestCategoryName(latest)}**. 

How can I assist you with carbon reduction strategies, SDG alignment, or setting up a carbon budget today?`;
    }

    if (msg.includes('budget')) {
      return `Your current monthly carbon budget is set to **${user.carbonBudget} kg CO2**.
Your spend for this month is **${Math.round(latest.totalEmissions)} kg CO2** (emissions).
${latest.totalEmissions <= user.carbonBudget ? `🟢 You are in the **Safe Zone**, with **${Math.round(user.carbonBudget - latest.totalEmissions)} kg CO2** remaining.` : `🔴 You are **Over Budget** by **${Math.round(latest.totalEmissions - user.carbonBudget)} kg CO2**.`}

To optimize your budget:
* Try using the **Simulator** page to see how switching diet or transport impacts your footprint.
* Take on a **Challenge** to earn points and practice green habits!`;
    }

    if (msg.includes('sdg') || msg.includes('unsdg') || msg.includes('esg')) {
      return `EcoTrack AI is fully aligned with the **United Nations Sustainable Development Goals**:
1. **SDG 7 (Affordable and Clean Energy)**: Supported when you reduce electricity or increase your renewable percentage (currently: **${latest.inputs.renewablePercentage}%**).
2. **SDG 11 (Sustainable Cities)**: Supported by using public transport (currently: **${latest.inputs.publicTransportKm} km**) or biking instead of driving.
3. **SDG 12 (Responsible Consumption)**: Supported by low food waste (currently: **${latest.inputs.foodWasteKg} kg**) and recycling.
4. **SDG 13 (Climate Action)**: Supported by reducing overall footprint and purchasing offsets.

By completing challenges and goals, you actively participate in global sustainability targets.`;
    }

    if (msg.includes('transport') || msg.includes('car') || msg.includes('flight') || msg.includes('travel')) {
      const transportEm = Math.round(latest.transportEmissions);
      return `Your transportation emissions are **${transportEm} kg CO2** (approx. **${Math.round(latest.transportEmissions / latest.totalEmissions * 100)}%** of your total footprint).
      
**Key recommendations (SDG 11):**
* Swap 2 car trips weekly with public transport or cycling.
* Reorganize/consolidate flights. A single flight hour emits **110 kg CO2**!
* Maintain correct tire pressure on your car to optimize fuel efficiency by 3%.`;
    }

    if (msg.includes('electricity') || msg.includes('energy') || msg.includes('lpg') || msg.includes('solar')) {
      const energyEm = Math.round(latest.energyEmissions);
      return `Your home energy emissions are **${energyEm} kg CO2** (approx. **${Math.round(latest.energyEmissions / latest.totalEmissions * 100)}%** of your total).

**Key recommendations (SDG 7):**
* Set your Air Conditioner thermostat to 24°C or higher. Every degree warmer saves ~6% energy.
* Replace active halogen lamps with LEDs (saves up to 80% lighting energy).
* Transition to clean energy. Increasing your renewable percentage to 50% would save you approximately **${Math.round(latest.inputs.electricityKwh * 0.4 * 0.5)} kg CO2** monthly.`;
    }

    if (msg.includes('food') || msg.includes('meat') || msg.includes('vegan') || msg.includes('vegetarian')) {
      return `Your diet type is registered as **${latest.inputs.dietType}**, giving a food footprint of **${Math.round(latest.foodEmissions)} kg CO2**.

**Key recommendations (SDG 12):**
* Switching from a heavy meat diet to a vegetarian diet reduces food emissions by **55%** (saving ~75 kg CO2/month).
* Buy locally sourced produce. This reduces transport-related food miles.
* Reduce food waste (currently: **${latest.inputs.foodWasteKg} kg**). Organic waste in landfills releases methane, a greenhouse gas 25x more potent than CO2.`;
    }

    return `I hear you! Reducing carbon emissions is a step-by-step journey. Based on your profile, here are three things you can do today:
1. **Explore the Simulator**: Model actions like going vegetarian or biking to check carbon and cash savings.
2. **Review your Action Plan**: Try checking the Roadmap tab for customized weekly tasks.
3. **Take a Quiz**: Visit the Education page to test your knowledge on SDGs and earn 50 points.

What would you like to discuss next? You can ask about "budget", "sdg", "transport", "energy", or "food".`;
  }

  private static getHighestCategoryName(latest: CarbonFootprint): string {
    const categories = [
      { name: 'Transportation', value: latest.transportEmissions },
      { name: 'Home Energy', value: latest.energyEmissions },
      { name: 'Food', value: latest.foodEmissions },
      { name: 'Shopping', value: latest.shoppingEmissions },
      { name: 'Waste', value: latest.wasteEmissions },
    ];
    return categories.sort((a, b) => b.value - a.value)[0].name;
  }
}
export default AIService;
