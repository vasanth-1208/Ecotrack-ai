import PDFDocument from 'pdfkit';
import { CarbonFootprint, User, AIInsights } from '../types';
import { PredictionPoint } from './predictionService';
import { BENCHMARKS } from '../config/emissionFactors';

export class PDFService {
  /**
   * Generates a beautifully formatted PDF sustainability report and pipes it to a writable stream.
   */
  public static generateReport(
    user: User,
    latest: CarbonFootprint,
    insights: AIInsights,
    predictions: PredictionPoint[],
    score: number,
    scoreBreakdown: {
      reductionScore: number;
      renewableScore: number;
      challengeScore: number;
      goalScore: number;
      learningScore: number;
    },
    stream: NodeJS.WritableStream
  ): void {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Pipe output stream
    doc.pipe(stream);

    // Color Palette
    const primaryColor = '#065F46'; // Emerald Dark
    const secondaryColor = '#10B981'; // Emerald Light
    const darkTextColor = '#1F2937'; // Slate Dark
    const lightTextColor = '#6B7280'; // Slate Light
    const warningColor = '#EF4444'; // Red
    const safeColor = '#10B981'; // Green
    const accentBgColor = '#F3F4F6'; // Grey Light

    // --- PAGE 1: EXECUTIVE SUMMARY ---

    // Top Brand Header Accent Bar
    doc.rect(0, 0, 595.28, 15).fill(primaryColor);

    // Title & Logo Block
    doc.moveDown(1.5);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(26).text('ECOTRACK AI');
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(10).text('Your Personalized Carbon Intelligence & Sustainability Report');
    
    // Metadata block right-aligned
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(10).text(`Report Date: ${new Date().toLocaleDateString()}`, 380, 50, { align: 'right', width: 165 });
    doc.fillColor(lightTextColor).font('Helvetica').text(`User Profile: ${user.fullName}`, 380, 65, { align: 'right', width: 165 });
    doc.text(`Email: ${user.email}`, 380, 78, { align: 'right', width: 165 });
    doc.text(`User Level: Level ${user.level}`, 380, 91, { align: 'right', width: 165 });

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#E5E7EB').lineWidth(1).stroke();

    // Sustainability Score Widget
    doc.moveDown(1.5);
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(14).text('Sustainability Score', 50, 130);
    
    // Draw Score Background Card
    doc.roundedRect(50, 150, 495, 75, 6).fill(accentBgColor);
    
    // Draw large circular score text
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(32).text(`${score}`, 80, 165);
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(12).text('/ 100', 140, 182);

    // Score status message
    let statusText = 'Eco Champion';
    let statusColor = safeColor;
    if (score < 40) {
      statusText = 'Needs Attention';
      statusColor = warningColor;
    } else if (score < 70) {
      statusText = 'Active Climate Reducer';
      statusColor = '#F59E0B'; // Amber
    }

    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(14).text(statusText, 200, 165);
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(10).text('Weighted: 40% Reduction, 20% Renewables, 15% Goals, 15% Challenges, 10% Quizzes', 200, 185);

    // Score Breakdown Table
    doc.moveDown(2);
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(12).text('Score Breakdown:', 50, 240);
    
    const startY = 260;
    const colWidth = 95;
    const items = [
      { name: 'Reductions', val: scoreBreakdown.reductionScore, wt: '40%' },
      { name: 'Renewables', val: scoreBreakdown.renewableScore, wt: '20%' },
      { name: 'Challenges', val: scoreBreakdown.challengeScore, wt: '15%' },
      { name: 'Goals Set', val: scoreBreakdown.goalScore, wt: '15%' },
      { name: 'Quizzes Pass', val: scoreBreakdown.learningScore, wt: '10%' },
    ];

    items.forEach((item, idx) => {
      const xPos = 50 + idx * colWidth;
      // Draw sub-box
      doc.roundedRect(xPos, startY, 90, 45, 4).fill('#FFFFFF').strokeColor('#E5E7EB').lineWidth(1).stroke();
      doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(10).text(item.name, xPos + 5, startY + 5, { width: 80, align: 'center' });
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text(`${item.val}/100`, xPos + 5, startY + 20, { width: 80, align: 'center' });
      doc.fillColor(lightTextColor).font('Helvetica').fontSize(8).text(`Weight: ${item.wt}`, xPos + 5, startY + 33, { width: 80, align: 'center' });
    });

    // Executive Summary Text
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(14).text('Monthly Emissions Summary', 50, 325);
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(10).text(insights.reportSummary.replace(/\*\*/g, ''), 50, 345, { lineGap: 3, width: 495 });

    // Table: Current Emissions breakdown
    const tableY = 410;
    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(12).text('Carbon Footprint Details (Current Month)', 50, tableY);
    
    // Header
    doc.rect(50, tableY + 20, 495, 20).fill(primaryColor);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('Emission Source Category', 60, tableY + 25);
    doc.text('Emissions (kg CO2)', 300, tableY + 25, { align: 'right', width: 120 });
    doc.text('Contribution %', 430, tableY + 25, { align: 'right', width: 100 });

    // Rows
    const rows = [
      { name: 'Transportation (Commutes & Flights)', val: latest.transportEmissions },
      { name: 'Home Energy (Electricity & LPG)', val: latest.energyEmissions },
      { name: 'Food Habits & Diet', val: latest.foodEmissions },
      { name: 'Shopping Habits (Online & Electronics)', val: latest.shoppingEmissions },
      { name: 'Waste Generation & Disposal', val: latest.wasteEmissions },
    ];

    let currentY = tableY + 40;
    rows.forEach((row, i) => {
      // Zebra striping
      if (i % 2 === 0) {
        doc.rect(50, currentY, 495, 20).fill('#F9FAFB');
      }
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(10).text(row.name, 60, currentY + 5);
      doc.text(Math.round(row.val).toString(), 300, currentY + 5, { align: 'right', width: 120 });
      
      const pct = Math.round((row.val / (latest.totalEmissions || 1)) * 100);
      doc.text(`${pct}%`, 430, currentY + 5, { align: 'right', width: 100 });
      currentY += 20;
    });

    // Total Row
    doc.rect(50, currentY, 495, 22).fill(accentBgColor);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('Total Monthly Carbon Footprint', 60, currentY + 6);
    doc.text(Math.round(latest.totalEmissions).toString(), 300, currentY + 6, { align: 'right', width: 120 });
    doc.text('100%', 430, currentY + 6, { align: 'right', width: 100 });

    // Footnote
    doc.fillColor(lightTextColor).font('Helvetica-Oblique').fontSize(8).text('Calculations are based on standard greenhouse gas emission factors.', 50, currentY + 30);

    // Page number
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(9).text('Page 1 of 2', 50, 780, { align: 'center', width: 495 });

    // --- PAGE 2: BENCHMARKING, PREDICTIONS & RECOMMENDATIONS ---
    doc.addPage();

    // Top Accent Bar
    doc.rect(0, 0, 595.28, 15).fill(primaryColor);

    // Benchmarking
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('National & Global Benchmarking', 50, 40);
    
    // Average comparison details
    const annualizedFootprint = latest.totalEmissions * 12;
    const indiaAvg = BENCHMARKS.INDIA_ANNUAL_AVERAGE;
    const globalAvg = BENCHMARKS.GLOBAL_ANNUAL_AVERAGE;

    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(11).text(`Your Annualized Footprint: ${Math.round(annualizedFootprint)} kg CO2 / year`, 50, 65);
    
    // Progress Bars / Comparative visual
    const barWidth = 300;
    const drawBenchmarkBar = (title: string, value: number, userVal: number, y: number) => {
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(10).text(title, 50, y);
      
      // Gray background bar
      doc.roundedRect(200, y - 2, barWidth, 12, 4).fill('#E5E7EB');
      
      // Benchmark marker
      const maxVal = Math.max(value, userVal) * 1.15;
      const benchmarkWidth = (value / maxVal) * barWidth;
      const userWidth = (userVal / maxVal) * barWidth;
      
      // User fill
      doc.roundedRect(200, y - 2, userWidth, 12, 4).fill(userVal <= value ? '#34D399' : '#F87171');
      
      // Target line for benchmark
      doc.moveTo(200 + benchmarkWidth, y - 5).lineTo(200 + benchmarkWidth, y + 15).strokeColor(primaryColor).lineWidth(1.5).stroke();
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8).text(`${Math.round(value)} kg`, 200 + benchmarkWidth - 15, y - 13);
      doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(9).text(`${Math.round(userVal)} kg (You)`, 200 + userWidth - 20, y + 13);
    };

    drawBenchmarkBar('vs. India Average', indiaAvg, annualizedFootprint, 110);
    drawBenchmarkBar('vs. Global Average', globalAvg, annualizedFootprint, 150);

    // Percentile rank text
    doc.moveDown(3);
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(10).text(insights.peerComparison, 50, 190, { width: 495 });

    // Predictions
    doc.moveDown(1.5);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('Future Carbon Trends & Predictions', 50, 225);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(10).text('Based on your activity history, here are the projected emissions for the next 3 months:', 50, 245);

    if (predictions.length > 0) {
      const predY = 265;
      doc.rect(50, predY, 495, 18).fill(primaryColor);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text('Forecast Month', 60, predY + 4);
      doc.text('Projected Emissions (kg CO2)', 200, predY + 4, { align: 'center', width: 180 });
      doc.text('Confidence Range (95% CI)', 380, predY + 4, { align: 'right', width: 150 });

      predictions.forEach((pred, index) => {
        const rowY = predY + 18 + index * 18;
        if (index % 2 === 0) {
          doc.rect(50, rowY, 495, 18).fill('#F9FAFB');
        }
        doc.fillColor(darkTextColor).font('Helvetica').fontSize(9).text(pred.date, 60, rowY + 4);
        doc.text(`${Math.round(pred.emissions)} kg`, 200, rowY + 4, { align: 'center', width: 180 });
        doc.text(`${Math.round(pred.confidenceMin)} - ${Math.round(pred.confidenceMax)} kg`, 380, rowY + 4, { align: 'right', width: 150 });
      });
    }

    // AI Roadmaps & Action Plan
    doc.moveDown(2);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('AI Sustainability Action Plan', 50, 360);

    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(11).text('Immediate Roadmaps:', 50, 385);
    let roadmapY = 400;
    insights.roadmap.immediateTargets.slice(0, 3).forEach((target) => {
      doc.fillColor(secondaryColor).fontSize(12).text('•', 55, roadmapY);
      doc.fillColor(darkTextColor).font('Helvetica').fontSize(10).text(target, 70, roadmapY, { width: 470 });
      roadmapY += 16;
    });

    doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(11).text('Weekly Recommended Habits (SDG Aligned):', 50, roadmapY + 10);
    
    let actionY = roadmapY + 25;
    insights.weeklyActionPlan.slice(0, 3).forEach((act) => {
      doc.roundedRect(50, actionY, 495, 36, 4).fill(accentBgColor);
      doc.fillColor(darkTextColor).font('Helvetica-Bold').fontSize(10).text(act.habit, 60, actionY + 6, { width: 320 });
      
      const sdgStr = act.sdgAlignments.join(', ');
      doc.fillColor(primaryColor).font('Helvetica').fontSize(8).text(`Aligned: ${sdgStr}`, 60, actionY + 20);
      
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text(act.impact, 370, actionY + 6, { width: 165, align: 'right' });
      doc.fillColor(lightTextColor).font('Helvetica').fontSize(8).text(`Difficulty: ${act.difficulty.toUpperCase()}`, 370, actionY + 20, { width: 165, align: 'right' });

      actionY += 42;
    });

    // Offset suggestions
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Carbon Offset Recommendation (SDG 13)', 50, actionY + 10);
    doc.fillColor(darkTextColor).font('Helvetica').fontSize(10).text(
      `To completely neutralize your monthly footprint, we suggest offsetting ${insights.roadmap.recommendedOffsetsKg} kg CO2 through local projects (e.g. planting ${Math.round(insights.roadmap.recommendedOffsetsKg / 22)} trees or investing in community wind farms).`,
      50, actionY + 25, { width: 495 }
    );

    // Footer copyright
    doc.fillColor(lightTextColor).font('Helvetica').fontSize(8).text('© 2026 EcoTrack AI. Supporting UN Sustainable Development Goals (SDG 7, 11, 12, 13).', 50, 770, { align: 'center', width: 495 });
    doc.fontSize(9).text('Page 2 of 2', 50, 780, { align: 'center', width: 495 });

    // End stream
    doc.end();
  }
}
export default PDFService;
