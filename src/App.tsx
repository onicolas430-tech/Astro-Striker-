/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState, GameStats, Player } from './game/types';
import { sound } from './game/audio';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { TouchControls } from './components/TouchControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    wave: 1,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    enemiesDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 100,
  });
  const [player, setPlayer] = useState<Player | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // Detect touch capability
  useEffect(() => {
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStatsUpdate: (updatedStats, updatedPlayer) => {
        setStats({ ...updatedStats });
        setPlayer({ ...updatedPlayer });
      },
      onGameOver: (finalStats) => {
        setStats({ ...finalStats });
        setGameState('GAME_OVER');
      },
      onWaveAnnouncement: (waveNumber) => {
        setWaveAnnouncement(`¡OLEADA ${waveNumber}!`);
        setTimeout(() => {
          setWaveAnnouncement(null);
        }, 2200);
      },
    });

    engineRef.current = engine;

    // Load initial high score for TitleScreen
    try {
      const saved = localStorage.getItem('astro_striker_high_score');
      if (saved) {
        setStats(prev => ({ ...prev, highScore: parseInt(saved, 10) || 0 }));
      }
    } catch {
      // Ignore
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Start game handler
  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
      setGameState('PLAYING');
    }
  }, []);

  // Pause game handler
  const handlePauseGame = useCallback(() => {
    if (engineRef.current && gameState === 'PLAYING') {
      engineRef.current.pause();
      setGameState('PAUSED');
    }
  }, [gameState]);

  // Resume game handler
  const handleResumeGame = useCallback(() => {
    if (engineRef.current && gameState === 'PAUSED') {
      engineRef.current.resume();
      setGameState('PLAYING');
    }
  }, [gameState]);

  // Restart game handler
  const handleRestartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
      setGameState('PLAYING');
    }
  }, []);

  // Go to Title Menu
  const handleGoHome = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setGameState('TITLE');
    }
  }, []);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Global keyboard shortcuts (Pause, Mute)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'PLAYING') {
          handlePauseGame();
        } else if (gameState === 'PAUSED') {
          handleResumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, handlePauseGame, handleResumeGame, handleToggleMute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none touch-none">
      {/* 
        Game Canvas Container
        Aspect-ratio preserved (3:4 portrait arcade format), centered in viewport
      */}
      <div className="relative w-full h-full max-w-[900px] max-h-[1200px] aspect-[3/4] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={900}
          height={1200}
          className="w-full h-full object-contain cursor-crosshair rounded-none sm:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border-0 sm:border sm:border-slate-800/80"
        />

        {/* HUD Overlay (Playing & Paused states) */}
        {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
          <HUD
            stats={stats}
            player={player}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={handlePauseGame}
            waveAnnouncement={waveAnnouncement}
          />
        )}

        {/* Virtual Touch Controls (Only during active play on mobile) */}
        {gameState === 'PLAYING' && isTouchDevice && (
          <TouchControls
            onDirectionChange={(dir) => {
              if (engineRef.current) {
                engineRef.current.setVirtualDirection(dir);
              }
            }}
            onFireChange={(isFiring) => {
              if (engineRef.current) {
                engineRef.current.setVirtualFire(isFiring);
              }
            }}
          />
        )}

        {/* Title Screen Overlay */}
        {gameState === 'TITLE' && (
          <TitleScreen
            onStart={handleStartGame}
            highScore={stats.highScore}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Pause Modal */}
        {gameState === 'PAUSED' && (
          <PauseModal
            stats={stats}
            onResume={handleResumeGame}
            onRestart={handleRestartGame}
            onHome={handleGoHome}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'GAME_OVER' && (
          <GameOverModal
            stats={stats}
            onRestart={handleRestartGame}
            onHome={handleGoHome}
          />
        )}
      </div>
    </main>
  );
}
