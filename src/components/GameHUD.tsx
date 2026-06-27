/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Trophy, Swords, Shield, Volume2, HelpCircle } from 'lucide-react';

interface GameHUDProps {
  score: number;
  kills: number;
  floor: number;
  health: number;
  maxHealth: number;
  onRestart: () => void;
  gameState: 'menu' | 'playing' | 'gameover' | 'victory';
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  kills,
  floor,
  health,
  maxHealth,
  onRestart,
  gameState
}) => {
  if (gameState !== 'playing') return null;

  const healthPercentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));

  return (
    <div className="absolute top-0 inset-x-0 z-40 pointer-events-none p-8 flex flex-col md:flex-row justify-between items-start gap-4">
      
      {/* LEFT: Elegant Health Vitals Tracking Panel */}
      <div className="flex flex-col gap-3.5 pointer-events-auto bg-[#050505]/85 backdrop-blur-md px-5 py-4 rounded-sm border border-white/10 shadow-xl max-w-xs w-full">
        
        {/* Vitals Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="w-full bg-[#1a1a1a] border border-white/10 h-3 rounded-sm overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-red-500">Vitals {Math.round(healthPercentage)}%</span>
            <span className="text-[10px] font-mono text-white/40">{health} / {maxHealth} HP</span>
          </div>
        </div>

      </div>

      {/* CENTER: Elegant Descent Elevation Tracker */}
      <div className="self-center flex flex-col items-center bg-[#050505]/90 border border-white/10 px-6 py-4 rounded-sm shadow-2xl pointer-events-auto backdrop-blur-md md:translate-x-0">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">Current Descent</span>
        <div className="text-3xl font-light tracking-tighter text-[#e0e0e0]">
          FLOOR <span className="font-black text-white">{floor}</span><span className="text-white/20"> / 05</span>
        </div>
        
        {/* Compact elegant progress markers */}
        <div className="flex gap-1.5 mt-3">
          {Array.from({ length: 5 }).map((_, i) => {
            const currentF = 5 - i;
            const isCompleted = currentF > floor;
            const isActive = currentF === floor;

            return (
              <div 
                key={i} 
                className={`h-1.5 w-6 rounded-sm transition-all duration-300 ${
                  isCompleted 
                    ? "bg-emerald-500" 
                    : isActive 
                    ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                    : "bg-white/10"
                }`}
                title={`Floor ${currentF}`}
              />
            );
          })}
        </div>
      </div>

      {/* RIGHT: Score & Foes stats styled like the design */}
      <div className="flex flex-col gap-4 pointer-events-auto self-end md:self-auto bg-[#050505]/85 backdrop-blur-md px-5 py-4 rounded-sm border border-white/10 shadow-xl w-48 text-right font-sans">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Honor Score</div>
          <div className="text-xl font-light text-white tracking-tighter">
            <span className="font-black text-amber-500">{score.toLocaleString()}</span> PTS
          </div>
        </div>

        <div className="border-t border-white/5 pt-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Kill Streak</div>
          <div className="text-3xl font-black text-red-600">x{kills}</div>
        </div>
      </div>

    </div>
  );
};
