// Standard carbon emission factors (in kg CO2 per unit)
export const EMISSION_FACTORS = {
  transportation: {
    car: 0.18,          // kg CO2 per km (average petrol car)
    bike: 0.0,         // kg CO2 per km
    publicTransport: 0.04, // kg CO2 per km
    flight: 110.0,      // kg CO2 per hour
  },
  homeEnergy: {
    electricity: 0.4,   // kg CO2 per kWh
    lpg: 3.0,           // kg CO2 per kg
    renewableReductionFactor: 1.0, // multiplier reduction for renewable percentage (0 to 1)
  },
  food: {
    vegan: 1.5,        // kg CO2 per day
    vegetarian: 2.0,   // kg CO2 per day
    mixed: 3.0,        // kg CO2 per day
    heavyMeat: 4.5,    // kg CO2 per day
  },
  shopping: {
    onlinePurchase: 0.5, // kg CO2 per purchase
    electronics: 80.0,   // kg CO2 per item
    fastFashion: 10.0,   // kg CO2 per clothing item
  },
  waste: {
    foodWaste: 1.9,    // kg CO2 per kg
    plasticUsage: 2.0,  // kg CO2 per kg
    recyclingReductionFactor: 0.5, // 50% reduction for food waste/plastic if recycling is 100%
  }
};

// National & Global Benchmarking Averages (in kg CO2 per year)
export const BENCHMARKS = {
  INDIA_ANNUAL_AVERAGE: 1900.0, // kg CO2 per capita per year
  GLOBAL_ANNUAL_AVERAGE: 4700.0, // kg CO2 per capita per year
};

// SDG Mapping Details
export interface SDGInfo {
  number: number;
  title: string;
  description: string;
  icon: string;
}

export const SDG_MAPPINGS: Record<string, SDGInfo> = {
  SDG_7: {
    number: 7,
    title: "Affordable and Clean Energy",
    description: "Ensure access to affordable, reliable, sustainable and modern energy for all.",
    icon: "Zap"
  },
  SDG_11: {
    number: 11,
    title: "Sustainable Cities and Communities",
    description: "Make cities and human settlements inclusive, safe, resilient and sustainable.",
    icon: "Building"
  },
  SDG_12: {
    number: 12,
    title: "Responsible Consumption and Production",
    description: "Ensure sustainable consumption and production patterns.",
    icon: "ShoppingBag"
  },
  SDG_13: {
    number: 13,
    title: "Climate Action",
    description: "Take urgent action to combat climate change and its impacts.",
    icon: "ShieldAlert"
  }
};

// Map footprint components to SDGs
export const CATEGORY_SDG_MAP: Record<string, string[]> = {
  transportation: ["SDG_11", "SDG_13"],
  homeEnergy: ["SDG_7", "SDG_13"],
  food: ["SDG_12", "SDG_13"],
  shopping: ["SDG_12"],
  waste: ["SDG_12", "SDG_13"],
};
