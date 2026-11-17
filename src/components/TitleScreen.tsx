import React, { useEffect } from 'react';
import { Play, Volume2, VolumeX, Shield, Zap, Target } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  onStart: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  // Listen for Enter or Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        sound.playMenuClick();
        onStart();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, onToggleMute]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-10 select-none pointer-events-auto bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80">
      {/* Top bar with audio button and high score */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
          <span className="text-sky-400 font-semibold">MÁXIMA PUNTUACIÓN</span>
          <span className="text-white font-bold">{highScore.toString().padStart(6, '0')}</span>
        </div>

        <button
          onClick={() => {
            sound.playMenuClick();
            onToggleMute();
          }}
          className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          <span className="hidden sm:inline">{isMuted ? 'Silenciado' : 'Sonido Activo'}</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto max-w-xl">
        {/* Bespoke Vector Spacefighter Insignia */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center relative">
            {/* Ambient cyan glow */}
            <div className="absolute inset-0 rounded-full bg-sky-500/10 blur-xl animate-pulse" />
            
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-[0_0_20px_rgba(56,189,248,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Reticle Ring */}
              <circle cx="50" cy="50" r="46" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
              <circle cx="50" cy="50" r="38" stroke="#38bdf8" strokeWidth="1.5" opacity="0.7" />

              {/* Starfighter Silhouette */}
              <path
                d="M50 15 L66 68 L58 72 L50 63 L42 72 L34 68 Z"
                fill="url(#shipGrad)"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              {/* Cockpit Visor */}
              <ellipse cx="50" cy="42" rx="4" ry="9" fill="#0284c7" stroke="#bae6fd" strokeWidth="1" />

              {/* Thruster Plume */}
              <path d="M46 72 L50 88 L54 72 Z" fill="url(#thrusterGrad)" />

              {/* Laser Cannons */}
              <line x1="32" y1="52" x2="32" y2="40" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="68" y1="52" x2="68" y2="40" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

              <defs>
                <linearGradient id="shipGrad" x1="50" y1="15" x2="50" y2="72" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f8fafc" />
                  <stop offset="0.6" stopColor="#94a3b8" />
                  <stop offset="1" stopColor="#334155" />
                </linearGradient>
                <linearGradient id="thrusterGrad" x1="50" y1="72" x2="50" y2="88" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8" />
                  <stop offset="1" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title Lockup */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
          ASTRO STRIKER
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 font-medium tracking-wide">
          Combate y Supervivencia de Caza Espacial
        </p>

        {/* Key Features Overview */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 w-full max-w-md text-left">
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-1">
            <Target className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-slate-200">Disparo Dinámico</span>
            <span className="text-[11px] text-slate-400">Láser dual y triple</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Escudo y Casco</span>
            <span className="text-[11px] text-slate-400">Blindaje reactivo</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">Oleadas Enemigas</span>
            <span className="text-[11px] text-slate-400">Drones y cruceros</span>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              sound.playMenuClick();
              onStart();
            }}
            className="group px-8 py-3.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-base rounded-xl shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:shadow-[0_0_35px_rgba(56,189,248,0.7)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>INICIAR MISIÓN</span>
          </button>

          <span className="text-xs text-slate-500 font-mono">
            Presiona <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Espacio</kbd> o <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Enter</kbd> para comenzar
          </span>
        </div>
      </div>

      {/* Flat Single-Line Control Hint */}
      <div className="w-full text-center text-xs text-slate-400 font-medium py-2 border-t border-slate-800/60">
        <span>WASD / Flechas Mover</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>Espacio / Clic Disparar</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>Esc Pausa</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>M Silenciar</span>
      </div>
    </div>
  );
};
