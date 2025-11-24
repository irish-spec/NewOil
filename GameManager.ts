import { INVESTMENTS, UPGRADES, ACHIEVEMENTS } from './constants';
import { GameState, InvestmentState, SpecialistState, SpecialistType, InvestmentStatus, TICK_RATE_MS } from './types';
import { calculateCost, calculateCEOCost, calculateXP, calculateXPMultiplier } from './utils';

// Default State
const getInitialState = (): GameState => ({
  money: 0,
  totalMoneyRun: 0,
  priorMoney: 0,
  startTime: Date.now(),
  lastSaveTime: Date.now(),
  investments: INVESTMENTS.map(def => ({
    defId: def.id,
    level: 0,
    status: InvestmentStatus.IDLE,
    currentProgressMs: 0,
    ceoCooldownProgressMs: 0,
    ceoLevel: 0,
    efficiencyStacks: 0,
    negotiatorTriggerCount: 0
  })),
  upgradesBought: [],
  achievementsUnlocked: [],
  specialists: [
    { type: SpecialistType.ADVISOR, level: 0, targetIdx: 0, timerMs: 0, activeEndTimeMs: 0 },
    { type: SpecialistType.EFFICIENCY, level: 0, targetIdx: 4, timerMs: 0, activeEndTimeMs: 0 }, // Defaults to Oil Sands
    { type: SpecialistType.CONSULTANT, level: 0, targetIdx: 0, timerMs: 0, activeEndTimeMs: 0 },
    { type: SpecialistType.NEGOTIATOR, level: 0, targetIdx: 0, timerMs: 0, activeEndTimeMs: 0 },
  ]
});

export class GameManager {
  state: GameState;
  private listeners: (() => void)[] = [];

  constructor() {
    // Load from local storage or init
    const saved = localStorage.getItem('oilTycoonSave');
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        
        // Migration: Add missing fields if loading old save
        this.state.investments.forEach((inv: any) => {
          if (inv.status === undefined) inv.status = inv.isRunning ? InvestmentStatus.RUNNING : InvestmentStatus.IDLE;
          if (inv.ceoLevel === undefined) inv.ceoLevel = 0;
          if (inv.ceoCooldownProgressMs === undefined) inv.ceoCooldownProgressMs = 0;
          if (inv.efficiencyStacks === undefined) inv.efficiencyStacks = 0;
          if (inv.negotiatorTriggerCount === undefined) inv.negotiatorTriggerCount = 0;
        });
        
        this.processOfflineProgress();
        
      } catch (e) {
        this.state = getInitialState();
        this.state.money = 5; 
      }
    } else {
      this.state = getInitialState();
      this.state.money = 5; 
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  processOfflineProgress() {
    const now = Date.now();
    const elapsed = now - this.state.lastSaveTime;
    if (elapsed > 1000) {
      // Very basic simulation: just run tick logic in chunks or estimate
      // For simplicity/safety in this prototype, we'll run a max of 1000 ticks or simulate time directly
      // Calculating exact offline is complex with interactions. 
      // Let's just process specialists and rough income.
      
      // We will perform a "Fast Forward"
      // Cap at 24 hours to prevent freezing
      const cap = 24 * 60 * 60 * 1000;
      const timeToSim = Math.min(elapsed, cap);
      
      // To avoid freezing, we calculate standard rates
      // This is a simplified offline catchup
      this.state.investments.forEach((inv, idx) => {
        if (inv.level > 0 && inv.ceoLevel > 0) {
           const prodTime = this.getProductionTime(idx);
           const ceoDelay = prodTime / inv.ceoLevel;
           const cycleTime = prodTime + ceoDelay;
           const cycles = Math.floor(timeToSim / cycleTime);
           
           if (cycles > 0) {
             const revPerCycle = this.calculateRevenueForInvestment(idx);
             const totalRev = revPerCycle * cycles;
             this.state.money += totalRev;
             this.state.totalMoneyRun += totalRev;
           }
        }
      });

      // Update specialist timers
      this.state.specialists.forEach(spec => {
        if (spec.level > 0) {
          // Add time
          spec.timerMs += timeToSim;
          // Note: we aren't triggering their effects repeatedly offline to avoid complexity,
          // except maybe Advisors.
        }
      });
      
      this.state.lastSaveTime = now;
    }
  }

  tick(dt: number) {
    const now = Date.now();
    let moneyGained = 0;

    // 1. Process Investments
    this.state.investments.forEach((inv, index) => {
      if (inv.level === 0) return;

      const totalTime = this.getProductionTime(index);

      if (inv.status === InvestmentStatus.RUNNING) {
        inv.currentProgressMs += dt;
        if (inv.currentProgressMs >= totalTime) {
          // Cycle Complete
          const revenue = this.calculateRevenueForInvestment(index);
          moneyGained += revenue;
          this.state.totalMoneyRun += revenue;
          
          inv.currentProgressMs = 0;
          
          // Next State Logic
          if (inv.ceoLevel > 0) {
            inv.status = InvestmentStatus.CEO_COOLDOWN;
            inv.ceoCooldownProgressMs = 0;
          } else {
            inv.status = InvestmentStatus.IDLE;
          }
        }
      } else if (inv.status === InvestmentStatus.CEO_COOLDOWN) {
        const cooldownTotal = totalTime / inv.ceoLevel;
        inv.ceoCooldownProgressMs += dt;
        
        if (inv.ceoCooldownProgressMs >= cooldownTotal) {
          // CEO Ready to work again
          inv.status = InvestmentStatus.RUNNING;
          inv.ceoCooldownProgressMs = 0;
        }
      }
    });

    // 2. Process Specialists
    this.state.specialists.forEach(spec => {
      // Check active durations
      if (spec.activeEndTimeMs > 0 && now > spec.activeEndTimeMs) {
        spec.activeEndTimeMs = 0; // Effect expired
      }

      if (spec.level > 0) {
        // Only charge timer if not currently active (for active-type specialists like Consultant/Negotiator)
        // or always charge? Usually you wait for cooldown.
        // Prompt says "available to work on that property again 8 hours after starting".
        // This implies timer runs always or starts after activation. Let's assume timer runs always to fill "bar".
        
        spec.timerMs += dt;
        
        // Frequency Formula: 24h / Level
        const cycleTimeMs = (24 * 60 * 60 * 1000) / spec.level;

        // Auto-trigger for passive ones, Manual trigger or Auto for others?
        // Advisor: "Slowly buy...". Usually automatic.
        // Efficiency: "Periodically increase...". Automatic.
        // Consultant/Negotiator: Prompt mentions "bar fills up".
        
        if (spec.timerMs >= cycleTimeMs) {
           this.handleSpecialistCycle(spec);
        }
      }
    });
    
    // Add Consultant Active Passive Income (Money per second)
    const consultant = this.state.specialists.find(s => s.type === SpecialistType.CONSULTANT);
    if (consultant && consultant.level > 0 && consultant.activeEndTimeMs > now) {
      // "gives 10 * (consultant levels) * ($/sec of the chosen property) dollars per second"
      const idx = consultant.targetIdx;
      const inv = this.state.investments[idx];
      if (inv.level > 0) {
        const prodTimeSec = this.getProductionTime(idx) / 1000;
        const revPerCycle = this.calculateRevenueForInvestment(idx); // Base rev + other multipliers
        const basePPS = revPerCycle / prodTimeSec;
        
        const bonusPerSec = 10 * consultant.level * basePPS;
        const bonusFrame = bonusPerSec * (dt / 1000);
        
        moneyGained += bonusFrame;
        this.state.totalMoneyRun += bonusFrame;
      }
    }

    this.state.money += moneyGained;

    // 3. Check Achievements
    this.checkAchievements();

    // 4. Save occasionally
    if (now - this.state.lastSaveTime > 10000) {
      this.save();
      this.state.lastSaveTime = now;
    }

    this.notify();
  }

  handleSpecialistCycle(spec: SpecialistState) {
    if (spec.type === SpecialistType.ADVISOR) {
      // Automatically buy 1 level free
      spec.timerMs = 0; // Reset
      const inv = this.state.investments[spec.targetIdx];
      // Check if unlocked? Assuming yes if visible.
      // Free level!
      inv.level += 1;
    } else if (spec.type === SpecialistType.EFFICIENCY) {
      // Permanently increase speed of target
      spec.timerMs = 0;
      const inv = this.state.investments[spec.targetIdx];
      inv.efficiencyStacks += 1;
    } else if (spec.type === SpecialistType.NEGOTIATOR) {
      // "When the Negotiators' bar fills up, the price ... will decrease dramatically."
      // "available for 1 hour?" implied by Consultant similarity or standard mechanic.
      // Let's set it active for 1 hour.
      if (spec.activeEndTimeMs === 0) {
        spec.activeEndTimeMs = Date.now() + (60 * 60 * 1000); // 1 Hour Active
        spec.timerMs = 0; // Reset charge
        // Increment trigger count for the target to reduce effectiveness if needed?
        // Prompt says "Times Run (Per Property)".
        this.state.investments[spec.targetIdx].negotiatorTriggerCount += 1;
      } else {
        // Already active, cap timer?
        spec.timerMs = (24 * 60 * 60 * 1000) / spec.level; 
      }
    } else if (spec.type === SpecialistType.CONSULTANT) {
      // Active for 1 hour
      if (spec.activeEndTimeMs === 0) {
        spec.activeEndTimeMs = Date.now() + (60 * 60 * 1000);
        spec.timerMs = 0;
      } else {
        spec.timerMs = (24 * 60 * 60 * 1000) / spec.level;
      }
    }
  }

  startProduction(idx: number) {
    const inv = this.state.investments[idx];
    if (inv.level > 0) {
      // Manual click overrides cooldown and starts immediately
      inv.status = InvestmentStatus.RUNNING;
      // If manual click happens during running, it does nothing or resets? 
      // Usually manual click in idle games just ensures it is running.
      // If waiting for CEO, force start.
      this.notify();
    }
  }

  getCost(idx: number, count: number): number {
    const inv = this.state.investments[idx];
    const def = INVESTMENTS[inv.defId];
    
    // Negotiator effect
    const negotiator = this.state.specialists.find(s => s.type === SpecialistType.NEGOTIATOR);
    let discount = 1.0;
    
    // Check if Negotiator is ACTIVE and targeting this
    if (negotiator && negotiator.activeEndTimeMs > Date.now() && negotiator.targetIdx === idx) {
       // "Times Run (Per Property) Price Reduction: 1->99%, 50->15%, 100->10%"
       const runs = inv.negotiatorTriggerCount;
       let reductionPercent = 0;
       if (runs <= 1) reductionPercent = 0.99;
       else if (runs < 50) {
          // Linear interpolation between 99% and 15%? 
          // 1 -> 0.99, 50 -> 0.15. 
          // Slope = (0.15 - 0.99) / 49 = -0.0171
          reductionPercent = 0.99 + (runs - 1) * ((0.15 - 0.99) / 49);
       } else if (runs < 100) {
          // 50 -> 0.15, 100 -> 0.10
          reductionPercent = 0.15 + (runs - 50) * ((0.10 - 0.15) / 50);
       } else {
         reductionPercent = 0.10;
       }
       discount = 1.0 - reductionPercent;
    }

    let totalCost = 0;
    for (let i = 0; i < count; i++) {
      const lvl = inv.level + i;
      totalCost += calculateCost(def.baseCost, lvl, def.costIncreaseFactor);
    }
    return totalCost * discount;
  }
  
  buyCEO(idx: number) {
    const inv = this.state.investments[idx];
    const cost = calculateCEOCost(INVESTMENTS[idx].baseCost, inv.ceoLevel);
    if (this.state.money >= cost) {
      this.state.money -= cost;
      inv.ceoLevel += 1;
      // Trigger update
      if (inv.status === InvestmentStatus.IDLE) {
         // Auto start if purchased? 
         inv.status = InvestmentStatus.RUNNING;
      }
      this.notify();
    }
  }

  buyInvestment(idx: number, count: number) {
    const cost = this.getCost(idx, count);
    if (this.state.money >= cost) {
      this.state.money -= cost;
      this.state.investments[idx].level += count;
      this.notify();
    }
  }

  // Purely calculating revenue per ONE production cycle
  calculateRevenueForInvestment(idx: number): number {
    const inv = this.state.investments[idx];
    const def = INVESTMENTS[inv.defId];
    
    // Base Revenue estimation
    const baseRevenue = def.baseCost / 1.5; 

    let revenue = baseRevenue * inv.level; 
    
    let multiplier = 1.0;
    
    // Upgrades
    UPGRADES.forEach(upg => {
      if (this.state.upgradesBought.includes(upg.id)) {
        if (upg.targetIdx === -1 || upg.targetIdx === idx) {
          multiplier *= upg.multiplier;
        }
      }
    });

    // Achievements
    ACHIEVEMENTS.forEach(ach => {
      if (this.state.achievementsUnlocked.includes(ach.id)) {
        if (ach.targetIdx === -1 || ach.targetIdx === idx) {
          if (ach.rewardValue > 1) {
            multiplier *= ach.rewardValue;
          }
        }
      }
    });
    
    // Global Retirement Multiplier
    multiplier *= this.getRetirementMultiplier();

    return revenue * multiplier;
  }

  getProductionTime(idx: number): number {
    const def = INVESTMENTS[idx];
    const inv = this.state.investments[idx];
    let speedDivisor = 1.0;

    // Achievements speed boost
    ACHIEVEMENTS.forEach(ach => {
      if (this.state.achievementsUnlocked.includes(ach.id)) {
        if (ach.targetIdx === -1 || ach.targetIdx === idx) {
          if (ach.rewardValue > 0 && ach.rewardValue < 1) {
            speedDivisor /= ach.rewardValue; 
          }
        }
      }
    });

    // Efficiency Specialist (Permanent Stacks)
    // "increase the speed ... by 1%". Assuming compound? Or linear? 
    // "1% speed increase" usually means Time * 0.99 or Speed * 1.01.
    // Let's assume Speed * (1.01 ^ stacks)
    if (inv.efficiencyStacks > 0) {
      speedDivisor *= Math.pow(1.01, inv.efficiencyStacks);
    }

    const adjustedTime = def.baseTimeMs / speedDivisor;
    return Math.max(100, adjustedTime);
  }

  checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
      if (this.state.achievementsUnlocked.includes(ach.id)) return;

      let unlocked = false;
      if (ach.targetIdx === -1) {
         const minLevel = Math.min(...this.state.investments.map(i => i.level));
         if (minLevel >= ach.thresholdLevel) unlocked = true;
      } else {
        if (this.state.investments[ach.targetIdx].level >= ach.thresholdLevel) {
          unlocked = true;
        }
      }

      if (unlocked) {
        this.state.achievementsUnlocked.push(ach.id);
      }
    });
  }

  buyUpgrade(upgradeId: number) {
    if (this.state.upgradesBought.includes(upgradeId)) return;
    const upg = UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;

    if (this.state.money >= upg.cost) {
      this.state.money -= upg.cost;
      this.state.upgradesBought.push(upg.id);
      this.notify();
    }
  }

  // Specialist Management
  hireSpecialist(type: SpecialistType) {
    const spec = this.state.specialists.find(s => s.type === type);
    if (!spec) return;

    // Prompt: "increasing the Negotiator's level costs 1000 times more than the cost of the existing level."
    // Original prompt said: "1000 times more than...". This might imply exponential growth of 1000x? That's insane.
    // Or maybe "1000 times cost of existing level 1"? 
    // Let's assume standard Idle logic: Cost = Base * (Growth ^ Level). 
    // If growth is 1000x, you can only buy 1 or 2. 
    // Let's use 1000 * 10^Level? No, that's too much.
    // Let's assume Cost = 1,000,000 * (2 ^ Level) or something for late game specialists.
    // Advisor/Efficiency are early game. Negotiator/Consultant are late.
    
    let base = 10000;
    if (type === SpecialistType.CONSULTANT || type === SpecialistType.NEGOTIATOR) {
        base = 100000000; // Late game
    }
    
    // The prompt says "1000 times more than the cost of the existing level".
    // This implies Cost(L) = Cost(L-1) * 1000. 
    // If L0 cost 0, L1 cost X. L2 cost 1000X. L3 cost 1,000,000X.
    // This is extremely steep. But fits "Negotiator... very late".
    
    const growth = 1000;
    const cost = base * Math.pow(growth, spec.level);

    if (this.state.money >= cost) {
      this.state.money -= cost;
      spec.level++;
      this.notify();
    }
  }
  
  getSpecialistCost(type: SpecialistType): number {
    const spec = this.state.specialists.find(s => s.type === type);
    if (!spec) return 0;
    let base = 10000;
    if (type === SpecialistType.CONSULTANT || type === SpecialistType.NEGOTIATOR) {
        base = 100000000;
    }
    return base * Math.pow(1000, spec.level);
  }
  
  setSpecialistTarget(type: SpecialistType, targetIdx: number) {
    const spec = this.state.specialists.find(s => s.type === type);
    if (spec) {
      spec.targetIdx = targetIdx;
      this.notify();
    }
  }

  // Retirement
  getRetirementMultiplier(): number {
    const lifetime = this.state.priorMoney;
    // XP = Lifetime / 6.725B
    const xp = calculateXP(lifetime);
    return calculateXPMultiplier(xp);
  }

  getPotentialRetirementMultiplier(): number {
    const lifetime = this.state.priorMoney + this.state.totalMoneyRun;
    const xp = calculateXP(lifetime);
    return calculateXPMultiplier(xp);
  }

  retire() {
    const lifetime = this.state.priorMoney + this.state.totalMoneyRun;
    
    // Reset State
    const newState = getInitialState();
    newState.priorMoney = lifetime;
    // Keep achievements?
    newState.achievementsUnlocked = this.state.achievementsUnlocked; 
    
    this.state = newState;
    this.state.startTime = Date.now();
    this.save();
    this.notify();
  }

  save() {
    localStorage.setItem('oilTycoonSave', JSON.stringify(this.state));
  }

  hardReset() {
    localStorage.removeItem('oilTycoonSave');
    location.reload();
  }
}

export const gameManager = new GameManager();