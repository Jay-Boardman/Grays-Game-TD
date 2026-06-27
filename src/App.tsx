/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VRGameCanvas } from './components/VRGameCanvas';
import { GameHUD } from './components/GameHUD';
import { Shield, Skull, Trophy, RefreshCw, Swords, Play, Compass, ArrowRight, Home } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState<number>(0);
  const [kills, setKills] = useState<number>(0);
  const [floor, setFloor] = useState<number>(5);
  const [health, setHealth] = useState<number>(100);
  const [maxHealth, setMaxHealth] = useState<number>(100);

  // Triggered when restarting from Game Over or Victory screens
  const triggerManualRestart = () => {
    // We send a custom event or toggle a state. 
    // To cleanly trigger restart, we can just switch state to 'playing' and the child canvas will handle its own reset.
    // However, we can also force a complete remount of the canvas by using a key, ensuring all WebGL contexts reset!
    setScore(0);
    setKills(0);
    setFloor(5);
    setHealth(100);
    setGameState('playing');
  };

  const handleReturnToMenu = () => {
    setScore(0);
    setKills(0);
    setFloor(5);
    setHealth(100);
    setGameState('menu');
  };

  return (
    <div className="relative w-screen h-screen bg-[#050505] text-[#e0e0e0] font-sans overflow-hidden select-none">
      {/* Elegant Dark Theme Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,10,10,0.4)_0%,_transparent_70%)] opacity-60 pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-red-950/20 to-transparent pointer-events-none"></div>
      
      {/* 1. CORE VR THREE.JS CANVAS */}
      <VRGameCanvas 
        activeGameState={gameState}
        onScoreChange={setScore}
        onKillsChange={setKills}
        onFloorChange={setFloor}
        onHealthChange={setHealth}
        onGameStateChange={setGameState}
      />

      {/* 2. DYNAMIC OVERLAY HUD */}
      <GameHUD 
        score={score}
        kills={kills}
        floor={floor}
        health={health}
        maxHealth={maxHealth}
        gameState={gameState}
        onRestart={triggerManualRestart}
      />

      {/* 3. GAME OVER SCREEN OVERLAY */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm p-6 overflow-y-auto animate-fade-in">
          <div className="max-w-md w-full bg-[#0a0a0a] border border-red-600/30 rounded-sm p-8 text-center shadow-[0_0_40px_rgba(220,38,38,0.15)] flex flex-col items-center">
            
            <div className="w-20 h-20 bg-red-950/20 border border-red-500/20 rounded-sm flex items-center justify-center mb-6">
              <Skull className="w-10 h-10 text-red-500 animate-pulse" />
            </div>

            <h1 className="text-3xl font-light tracking-[0.2em] text-white uppercase mb-1">
              YOU FALLEN
            </h1>
            <span className="text-red-500 font-sans text-[10px] uppercase tracking-[0.3em] font-bold mb-6">
              The Tower claims another soul
            </span>

            {/* Performance Stats Board */}
            <div className="grid grid-cols-2 gap-3 w-full mb-8">
              <div className="bg-white/5 border border-white/10 rounded-sm p-4 text-left flex flex-col justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">HIGHEST FLOOR</span>
                <span className="text-white font-bold text-lg">Floor {floor}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-sm p-4 text-left flex flex-col justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">FOES DEFEATED</span>
                <span className="text-red-400 font-bold text-lg">{kills}</span>
              </div>
              <div className="bg-white/5 border border-red-600/30 rounded-sm p-4 text-left flex flex-col justify-between col-span-2">
                <span className="text-red-500 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 mb-1">
                  <Trophy className="w-3.5 h-3.5" /> FINAL SCORE
                </span>
                <span className="text-red-500 font-black text-2xl">{score.toLocaleString()} PTS</span>
              </div>
            </div>

            {/* Scavenger Advice */}
            <div className="text-left border-l-2 border-white/20 pl-4 py-2 mb-8 w-full">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">Scavenger Advice</div>
              <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider">
                Defeated skeletons and armored knights drop their weapons. Walk close and press <kbd className="bg-white/10 px-1 rounded text-white border border-white/20">E</kbd> to scavenge superior iron armaments. Throw them with <kbd className="bg-white/10 px-1 rounded text-white border border-white/20">R</kbd> for critical damage hits!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={triggerManualRestart}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-4 rounded-sm shadow-lg shadow-red-950/30 transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.2em]"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" /> REVIVE AND RETRY
              </button>

              <button
                onClick={handleReturnToMenu}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-4 rounded-sm transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.2em]"
              >
                <Home className="w-4 h-4" /> MAIN MENU
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* 4. VICTORY TRIUMPH SCREEN OVERLAY */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-md p-6 overflow-y-auto">
          <div className="max-w-md w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-sm p-8 text-center shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col items-center relative overflow-hidden">
            
            {/* Elegant glowing background laurel halo */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/5 blur-3xl rounded-full" />

            <div className="w-20 h-20 bg-cyan-950/20 border border-cyan-500/20 rounded-sm flex items-center justify-center mb-6 relative z-10">
              <Trophy className="w-10 h-10 text-cyan-400 animate-bounce" />
            </div>

            <h1 className="text-3xl font-light tracking-[0.2em] text-white uppercase mb-1 relative z-10">
              ESCAPE COMPLETE
            </h1>
            <span className="text-cyan-500 font-sans text-[10px] uppercase tracking-[0.3em] font-bold mb-6 relative z-10">
              You defeated the necromancer and escaped
            </span>

            {/* Victory Scoreboard */}
            <div className="bg-white/5 border border-white/10 rounded-sm p-5 w-full mb-8 relative z-10 flex flex-col gap-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em]">TOWER ESCAPE STATUS</span>
                <span className="text-emerald-400 font-bold uppercase text-[11px] tracking-widest">VICTORIOUS</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em]">FOES CRUSHED</span>
                <span className="text-white font-bold text-sm">{kills} SLAYS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.2em]">HIGHEST LEVEL</span>
                <span className="text-white font-bold text-sm">Floor 1 (Ground Floor)</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-cyan-500 text-[10px] uppercase tracking-[0.2em] flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" /> TOTAL HONOR SCORE
                </span>
                <span className="text-cyan-400 font-black text-2xl">{score.toLocaleString()} PTS</span>
              </div>
            </div>

            {/* Prose */}
            <div className="text-left border-l-2 border-white/20 pl-4 py-2 mb-8 relative z-10 w-full">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">Triumph Register</div>
              <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider">
                Your legendary physics-based combat triumphs will echo through the high spires for ages. The tower has been thoroughly descended! Can you escape again with an even higher honor score?
              </p>
            </div>

            <button
              onClick={triggerManualRestart}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-6 rounded-sm shadow-lg shadow-cyan-950/30 transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.2em] relative z-10"
            >
              <RefreshCw className="w-4 h-4" /> RE-ENTER THE SPIRE
            </button>
            
          </div>
        </div>
      )}

    </div>
  );
}
