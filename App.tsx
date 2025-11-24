import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { PropertyRow } from './components/PropertyRow';
import { gameManager } from './GameManager';
import { GameState, TICK_RATE_MS, SpecialistType } from './types';
import { UPGRADES, ACHIEVEMENTS, INVESTMENTS } from './constants';
import { formatMoney, calculateCEOCost, formatTime } from './utils';

// Hook to sync with game loop
function useGameState() {
  const [state, setState] = useState<GameState>(gameManager.state);
  const [_, setTick] = useState(0);

  useEffect(() => {
    // UI Update Loop (slower than game tick if needed, but here we sync)
    const sub = gameManager.subscribe(() => {
      setState({ ...gameManager.state }); // Force React update
    });

    // Game Logic Loop
    const interval = setInterval(() => {
      gameManager.tick(TICK_RATE_MS);
      setTick(t => t + 1); // Force re-render for progress bars
    }, TICK_RATE_MS);

    return () => {
      sub();
      clearInterval(interval);
    };
  }, []);

  return state;
}

export default function App() {
  const state = useGameState();
  const [activeTab, setActiveTab] = useState("Properties");
  const [buyAmount, setBuyAmount] = useState(1);

  return (
    <Layout money={state.money} activeTab={activeTab} onTabChange={setActiveTab}>
      
      {/* PROPERTIES TAB */}
      {activeTab === "Properties" && (
        <div className="space-y-2">
          {/* Buy Amount Selector */}
          <div className="bg-neutral-800 p-2 rounded mb-4 flex justify-center space-x-2 sticky top-0 z-10 shadow-lg border border-neutral-700">
             {[1, 10, 100].map(amt => (
               <button 
                key={amt}
                onClick={() => setBuyAmount(amt)}
                className={`px-4 py-1 rounded text-sm font-bold ${buyAmount === amt ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300'}`}
               >
                 x{amt}
               </button>
             ))}
          </div>

          <div className="space-y-3 pb-20">
            {state.investments.map((inv, idx) => {
              const cost = gameManager.getCost(idx, buyAmount);
              return (
                <PropertyRow 
                  key={idx}
                  index={idx}
                  investment={inv}
                  buyAmount={buyAmount}
                  currentMoney={state.money}
                  canAfford={state.money >= cost}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* CEOS TAB */}
      {activeTab === "CEOs" && (
        <div className="space-y-3">
          <div className="bg-blue-900/20 p-4 rounded text-sm text-neutral-300 border border-blue-800/50 mb-4">
            <h3 className="font-bold text-white mb-1">How CEOs Work</h3>
            <p>CEOs automate your properties. However, they need a break between cycles. Higher level CEOs work faster with smaller breaks.</p>
            <p className="mt-2 text-xs italic">Delay = Production Time / CEO Level</p>
          </div>
          
          {state.investments.map((inv, idx) => {
             if (inv.level === 0) return null; // Don't show CEO for unowned property
             
             const def = INVESTMENTS[idx];
             const ceoCost = calculateCEOCost(def.baseCost, inv.ceoLevel);
             const canAfford = state.money >= ceoCost;
             const prodTime = gameManager.getProductionTime(idx);
             const idleTime = inv.ceoLevel > 0 ? prodTime / inv.ceoLevel : 0;

             return (
               <div key={idx} className="bg-neutral-800 p-4 rounded border border-neutral-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex-1">
                    <h4 className="font-bold text-lg">{def.name} CEO</h4>
                    <div className="text-sm text-neutral-400">Current Level: <span className="text-white">{inv.ceoLevel}</span></div>
                    {inv.ceoLevel > 0 ? (
                      <div className="text-xs text-blue-300 mt-1">
                        Delay: {formatTime(idleTime)}
                      </div>
                    ) : (
                      <div className="text-xs text-red-400 mt-1">Not Hired (Manual Only)</div>
                    )}
                 </div>
                 
                 <button 
                   onClick={() => gameManager.buyCEO(idx)}
                   disabled={!canAfford}
                   className={`px-6 py-2 rounded font-bold min-w-[140px] flex flex-col items-center ${
                     canAfford ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-500'
                   }`}
                 >
                   <span>Hire / Upg</span>
                   <span className="text-xs opacity-80">${formatMoney(ceoCost)}</span>
                 </button>
               </div>
             )
          })}
        </div>
      )}

      {/* UPGRADES TAB */}
      {activeTab === "Upgrades" && (
        <div className="space-y-3">
           {UPGRADES.map(upg => {
             const isBought = state.upgradesBought.includes(upg.id);
             const canAfford = state.money >= upg.cost;
             
             if (isBought) return null; 

             return (
               <div key={upg.id} className="bg-neutral-800 p-4 rounded border border-neutral-700 flex justify-between items-center">
                 <div>
                   <h4 className="font-bold text-white">{upg.name}</h4>
                   <p className="text-sm text-neutral-400">{upg.description}</p>
                 </div>
                 <button
                   onClick={() => gameManager.buyUpgrade(upg.id)}
                   disabled={!canAfford}
                   className={`px-4 py-2 rounded text-sm font-bold ml-4 w-32 border ${
                     canAfford 
                       ? 'bg-blue-700 border-blue-600 hover:bg-blue-600 text-white' 
                       : 'bg-neutral-700 border-neutral-600 text-neutral-500'
                   }`}
                 >
                   ${formatMoney(upg.cost)}
                 </button>
               </div>
             )
           })}
           {state.upgradesBought.length > 0 && (
             <div className="mt-8">
               <h3 className="text-neutral-500 uppercase text-xs font-bold mb-2">Purchased</h3>
               {state.upgradesBought.map(id => {
                 const u = UPGRADES.find(x => x.id === id);
                 return u ? (
                   <div key={id} className="text-neutral-600 text-sm py-1 line-through">{u.name}</div>
                 ) : null
               })}
             </div>
           )}
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === "Achievements" && (
        <div className="space-y-3">
           {ACHIEVEMENTS.map(ach => {
             const unlocked = state.achievementsUnlocked.includes(ach.id);
             return (
               <div key={ach.id} className={`p-4 rounded border flex justify-between items-center ${
                 unlocked 
                   ? 'bg-green-900/20 border-green-800' 
                   : 'bg-neutral-800 border-neutral-700 opacity-70'
               }`}>
                 <div>
                   <h4 className={`font-bold ${unlocked ? 'text-green-400' : 'text-neutral-300'}`}>{ach.name}</h4>
                   <p className="text-sm text-neutral-400">{ach.description}</p>
                 </div>
                 <div className="text-2xl">
                   {unlocked ? '🏆' : '🔒'}
                 </div>
               </div>
             )
           })}
        </div>
      )}

      {/* SPECIALISTS TAB */}
      {activeTab === "Specialists" && (
        <div className="space-y-4">
          {state.specialists.map((spec) => {
             const cost = gameManager.getSpecialistCost(spec.type);
             const canAfford = state.money >= cost;
             const cycleTime = (24 * 60 * 60 * 1000) / (spec.level || 1);
             const isActive = spec.activeEndTimeMs > Date.now();
             const timeRemaining = isActive ? spec.activeEndTimeMs - Date.now() : 0;
             const isRecharging = spec.level > 0 && !isActive;

             return (
               <div key={spec.type} className="bg-neutral-800 p-4 rounded border border-neutral-700">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-bold text-lg text-yellow-500 flex items-center gap-2">
                       {spec.type}
                       {isActive && <span className="bg-green-600 text-white text-[10px] px-1 rounded animate-pulse">ACTIVE</span>}
                     </h3>
                     <p className="text-xs text-neutral-400">Level {spec.level} • Frequency: {formatTime(cycleTime)}</p>
                   </div>
                   <button
                     onClick={() => gameManager.hireSpecialist(spec.type)}
                     disabled={!canAfford}
                     className={`px-3 py-1 rounded text-xs font-bold ${
                       canAfford ? 'bg-green-700 text-white' : 'bg-neutral-700 text-neutral-500'
                     }`}
                   >
                     Upgrade (${formatMoney(cost)})
                   </button>
                 </div>
                 
                 <div className="mt-2">
                   <label className="text-xs text-neutral-500 block mb-1">Target Property</label>
                   <div className="flex flex-wrap gap-2">
                     {INVESTMENTS.slice(0, Math.max(3, state.investments.findIndex(i => i.level === 0) + 1)).map((inv, idx) => (
                       <button
                         key={inv.id}
                         onClick={() => gameManager.setSpecialistTarget(spec.type, idx)}
                         className={`px-2 py-1 text-xs rounded border transition-colors ${
                           spec.targetIdx === idx 
                             ? 'bg-yellow-600 border-yellow-500 text-white' 
                             : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                         }`}
                       >
                         {inv.name}
                       </button>
                     ))}
                   </div>
                 </div>
                 
                 {/* Progress / Status */}
                 {spec.level > 0 && (
                    <div className="mt-3">
                       <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                          <span>{isActive ? `Active: ${formatTime(timeRemaining)} left` : "Recharging..."}</span>
                          {!isActive && <span>{(spec.timerMs / cycleTime * 100).toFixed(0)}%</span>}
                       </div>
                       <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-700">
                         {isActive ? (
                           <div 
                              className="bg-green-500 h-full transition-all duration-1000 ease-linear"
                              style={{ width: `${(timeRemaining / (60*60*1000)) * 100}%` }}
                           />
                         ) : (
                           <div 
                             className="bg-purple-500 h-full transition-all duration-75" 
                             style={{ width: `${(spec.timerMs / cycleTime) * 100}%` }}
                           />
                         )}
                       </div>
                    </div>
                 )}
               </div>
             );
          })}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === "Stats" && (
         <div className="bg-neutral-800 p-6 rounded border border-neutral-700 text-neutral-300 font-mono space-y-2">
            <p>Runtime: {((Date.now() - state.startTime)/1000/60).toFixed(1)} minutes</p>
            <p>Run Earnings: <span className="text-green-400">${formatMoney(state.totalMoneyRun)}</span></p>
            <p>Lifetime Earnings: <span className="text-green-400">${formatMoney(state.priorMoney + state.totalMoneyRun)}</span></p>
            <div className="h-px bg-neutral-700 my-4"></div>
            <button 
              onClick={() => gameManager.hardReset()}
              className="text-red-500 text-xs hover:underline"
            >
              Hard Reset Save Data
            </button>
         </div>
      )}

      {/* RETIREMENT TAB */}
      {activeTab === "Retire" && (
        <div className="text-center p-8 bg-neutral-800 rounded border border-neutral-700">
           <h2 className="text-2xl text-white font-bold mb-4">Retirement</h2>
           <p className="text-neutral-400 mb-6">
             Reset your progress to gain experience. Experience multiplies all future profits permanently.
           </p>

           <div className="flex justify-center space-x-8 mb-8">
             <div className="text-center">
               <div className="text-neutral-500 text-sm">Current Multiplier</div>
               <div className="text-2xl font-bold text-yellow-500">
                 x{formatMoney(gameManager.getRetirementMultiplier())}
               </div>
             </div>
             <div className="text-center">
               <div className="text-neutral-500 text-sm">Multiplier After Retire</div>
               <div className="text-2xl font-bold text-green-500">
                 x{formatMoney(gameManager.getPotentialRetirementMultiplier())}
               </div>
             </div>
           </div>
           
           <button
             onClick={() => {
               if(confirm("Are you sure you want to retire? You will lose all property levels and money.")) {
                 gameManager.retire();
               }
             }}
             disabled={gameManager.getPotentialRetirementMultiplier() <= gameManager.getRetirementMultiplier()}
             className={`px-8 py-3 rounded text-lg font-bold shadow-lg ${
                gameManager.getPotentialRetirementMultiplier() > gameManager.getRetirementMultiplier()
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
             }`}
           >
             Retire & Prestige
           </button>
        </div>
      )}
    </Layout>
  );
}
