import { InvestmentDef, UpgradeDef, AchievementDef } from './types';

// This data mirrors the structure described in the prompt.
// In a real scenario, we might fetch this, but here we statically define it for reliability.

export const INVESTMENTS_DATA: any[][] = [
  ["Gas Royalties", 2, 5, 1.08, 2000, "ic_gas_royalties"],
  ["Oil Royalties", 15, 70, 1.08, 4000, "ic_oil_royalties"],
  ["Gas Well", 130, 450, 1.11, 10000, "ic_gas_well"],
  ["Oil Well", 1100, 21000, 1.09, 20000, "ic_oil_well"],
  ["Oil Sands", 10000, 160000, 1.10, 50000, "ic_tar_sands"],
  ["Shale Play", 90000, 2200000, 1.08, 150000, "ic_shale_play"],
  ["Omani Field", 850000, 19400000, 1.08, 600000, "ic_omani_field"],
  ["Saudi Field", 7000000, 620000000, 1.07, 2400000, "ic_saudi_field"]
];

export const UPGRADES_DATA: any[][] = [
  [0, "Direct Deposit", "Gas Royalties profits x 3", 0, 75000, 3],
  [1, "New Pumps", "Oil Royalties profits x 3", 1, 250000, 3],
  [2, "Fracking", "Gas Well profits x 3", 2, 1000000, 3],
  [3, "Drilling Rigs", "Oil Well profits x 3", 3, 5000000, 3],
  [8, "In house Refining", "All Properties profits x 3", -1, 492075000, 3],
  [9, "Global Contracts", "All Properties profits x 5", -1, 5000000000, 5]
];

export const ACHIEVEMENTS_DATA: any[][] = [
  [0, "Gas Royalty Investor", "Gas Royalties level 10, profits x 3", 0, 10, 3],
  [1, "Oil Royalty Investor", "Oil Royalties level 10, profits x 3", 1, 10, 3],
  [2, "Gas Baron", "Gas Royalties level 25, speed x 2", 0, 25, 0.5],
  [3, "Oil Baron", "Oil Royalties level 25, speed x 2", 1, 25, 0.5],
  [4, "First Hundred", "Gas Royalties level 100, profits x 10", 0, 100, 10],
  [100, "Diversification", "All Properties Level 50, all profits x 2", -1, 50, 2]
];

// Hydrate typed objects
export const INVESTMENTS: InvestmentDef[] = INVESTMENTS_DATA.map((row, idx) => ({
  id: idx,
  name: row[0],
  baseCost: row[1],
  costIncreaseFactor: row[2], // Note: The logic for cost calculation depends on interpretation. Original game uses: Cost = Base + (Factor * (1.15^Level)). We will approximate.
  revenueMultiplier: row[3],
  baseTimeMs: row[4],
  imageName: row[5]
}));

export const UPGRADES: UpgradeDef[] = UPGRADES_DATA.map((row) => ({
  id: row[0],
  name: row[1],
  description: row[2],
  targetIdx: row[3],
  cost: row[4],
  multiplier: row[5]
}));

export const ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENTS_DATA.map((row) => ({
  id: row[0],
  name: row[1],
  description: row[2],
  targetIdx: row[3],
  thresholdLevel: row[4],
  rewardValue: row[5]
}));