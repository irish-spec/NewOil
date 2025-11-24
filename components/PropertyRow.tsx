import React from 'react';
import { InvestmentState, InvestmentStatus } from '../types';
import { INVESTMENTS } from '../constants';
import { formatMoney, formatTime } from '../utils';
import { gameManager } from '../GameManager';

interface PropertyRowProps {
  index: number;
  investment: InvestmentState;
  buyAmount: number;
  canAfford: boolean;
  currentMoney: number;
}

export const PropertyRow: React.FC<PropertyRowProps> = ({ index, investment, buyAmount, canAfford, currentMoney }) => {
  const def = INVESTMENTS[investment.defId];
  
  const cost = gameManager.getCost(index, buyAmount);
  const revenue = gameManager.calculateRevenueForInvestment(index);
  const totalTime = gameManager.getProductionTime(index);
  
  let progressPercent = 0;
  if (investment.status === InvestmentStatus.RUNNING) {
    progressPercent = Math.min(100, (investment.currentProgressMs / totalTime) * 100);
  } else if (investment.status === InvestmentStatus.CEO_COOLDOWN && investment.ceoLevel > 0) {
    // Reverse bar or different color for cooldown?
    const cooldownTotal = totalTime / investment.ceoLevel;
    progressPercent = Math.min(100, (investment.ceoCooldownProgressMs / cooldownTotal) * 100);
  }

  const handleBuy = () => {
    gameManager.buyInvestment(index, buyAmount);
  };

  const handleStart = () => {
    gameManager.startProduction(index);
  };

  const isLocked = investment.level === 0 && cost > currentMoney;

  return (
    <div className={`flex flex-col sm:flex-row bg-neutral-800 rounded-lg p-3 border border-neutral-700 shadow-sm ${isLocked ? 'opacity-50 grayscale' : ''}`}>
      {/* Icon & Info */}
      <div className="flex items-center flex-1 mb-2 sm:mb-0">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-neutral-700 rounded-md flex items-center justify-center mr-4 text-2xl border border-neutral-600 shrink-0 select-none">
          {def.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
             <h3 className="font-bold text-lg text-white truncate">{def.name}</h3>
             <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded">Lvl {investment.level}</span>
          </div>
          <div className="text-green-400 font-mono text-sm flex items-center gap-2">
            <span>+${formatMoney(revenue)}</span>
            <span className="text-neutral-500 text-xs">{formatTime(totalTime)}</span>
            {investment.ceoLevel > 0 && <span className="text-xs bg-blue-900 text-blue-200 px-1 rounded">CEO {investment.ceoLevel}</span>}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-3 bg-neutral-900 rounded-full mt-2 overflow-hidden relative border border-neutral-700">
             {investment.status === InvestmentStatus.CEO_COOLDOWN ? (
               <div 
                  className="h-full bg-blue-500/50 transition-all duration-100 ease-linear"
                  style={{ width: `${100 - progressPercent}%` }} // Depleting bar for cooldown? or Filling? Let's do Filling for "Readying"
               />
             ) : (
               <div 
                 className="h-full bg-yellow-500 transition-all duration-100 ease-linear"
                 style={{ width: `${progressPercent}%` }}
               />
             )}
          </div>
          <div className="flex justify-between text-[10px] text-neutral-500 mt-0.5">
             {investment.status === InvestmentStatus.CEO_COOLDOWN ? (
               <span className="text-blue-400 animate-pulse">CEO Waiting...</span>
             ) : investment.status === InvestmentStatus.RUNNING ? (
               <span>Producing...</span>
             ) : (
               <span>Idle</span>
             )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex sm:flex-col justify-end items-center sm:items-end sm:ml-4 space-x-2 sm:space-x-0 sm:space-y-2 mt-2 sm:mt-0">
        <button
          onClick={handleStart}
          // Always enabled if bought, to allow manual override/speedup
          disabled={investment.level === 0 || investment.status === InvestmentStatus.RUNNING}
          className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold w-full sm:w-32 transition-all ${
            investment.status === InvestmentStatus.RUNNING
              ? 'bg-yellow-600/50 text-yellow-200 cursor-not-allowed' 
              : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg active:transform active:scale-95'
          }`}
        >
          {investment.status === InvestmentStatus.RUNNING ? 'Running' : 'START'}
        </button>

        <button
          onClick={handleBuy}
          disabled={!canAfford}
          className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold w-full sm:w-32 border flex flex-col items-center justify-center transition-colors ${
            canAfford 
              ? 'bg-green-700 border-green-600 hover:bg-green-600 text-white' 
              : 'bg-neutral-700 border-neutral-600 text-neutral-400 cursor-not-allowed'
          }`}
        >
          <span>Buy x{buyAmount}</span>
          <span className="text-xs font-mono opacity-80">${formatMoney(cost)}</span>
        </button>
      </div>
    </div>
  );
};
