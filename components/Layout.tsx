import React, { ReactNode } from 'react';
import { formatMoney } from '../utils';

interface LayoutProps {
  money: number;
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = ["Properties", "CEOs", "Upgrades", "Achievements", "Stats", "Specialists", "Retire"];

export const Layout: React.FC<LayoutProps> = ({ money, children, activeTab, onTabChange }) => {
  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Top Bar */}
      <header className="flex-none p-4 bg-neutral-800 border-b border-neutral-700 shadow-md z-10 sticky top-0">
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
          <h1 className="text-xl font-bold text-yellow-500 uppercase tracking-widest hidden sm:block">Idle Oil Tycoon</h1>
          <div className="text-2xl sm:text-3xl font-mono text-green-400 font-bold bg-black px-4 py-1 rounded border border-neutral-700">
            ${formatMoney(money)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden relative w-full max-w-4xl mx-auto flex flex-col">
        {/* Navigation */}
        <nav className="flex-none bg-neutral-800 overflow-x-auto no-scrollbar border-b border-neutral-700">
          <div className="flex p-2 space-x-2">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-4 py-2 rounded text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      </main>
    </div>
  );
};
