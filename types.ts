export interface InvestmentDef {
  id: number;
  name: string;
  baseCost: number;
  costIncreaseFactor: number; // The "increase" from JSON, usually acts as exponential base or linear adder
  revenueMultiplier: number;
  baseTimeMs: number;
  imageName: string;
}

export interface UpgradeDef {
  id: number;
  name: string;
  description: string;
  targetIdx: number; // -1 for all
  cost: number;
  multiplier: number;
}

export interface AchievementDef {
  id: number;
  name: string;
  description: string;
  targetIdx: number;
  thresholdLevel: number;
  rewardValue: number; // >1 = profit mult, 0..1 = speed mult
}

// Runtime State Interfaces

export enum InvestmentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  CEO_COOLDOWN = 'CEO_COOLDOWN'
}

export interface InvestmentState {
  defId: number;
  level: number;
  
  // Production State
  status: InvestmentStatus;
  currentProgressMs: number;
  ceoCooldownProgressMs: number;

  // CEO
  ceoLevel: number;
  
  // Specialist specific trackers per property
  efficiencyStacks: number; // From Efficiency Manager
  negotiatorTriggerCount: number; // Times Negotiator has reduced price
}

export interface SpecialistState {
  type: SpecialistType;
  level: number;
  targetIdx: number; // Which property is this specialist assigned to?
  
  // Timing
  timerMs: number; // Accumulates towards activation
  activeEndTimeMs: number; // If currently active (Consultant/Negotiator effects)
}

export enum SpecialistType {
  ADVISOR = "Investment Advisor", // Auto buys levels
  EFFICIENCY = "Efficiency Manager", // Reduces speed
  CONSULTANT = "Consultant", // Big profit boost temporarily
  NEGOTIATOR = "Negotiator" // Reduces cost
}

export interface GameState {
  money: number;
  totalMoneyRun: number; // Money earned this run
  priorMoney: number; // Money earned in previous runs
  startTime: number;
  lastSaveTime: number;
  
  investments: InvestmentState[];
  upgradesBought: number[]; // IDs of bought upgrades
  achievementsUnlocked: number[]; // IDs of unlocked achievements
  
  specialists: SpecialistState[];
}

export const TICK_RATE_MS = 50;
export const AUTO_SAVE_MS = 30000;
