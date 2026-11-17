import React, { useEffect } from 'react';
import { RotateCcw, Trophy, Target, Zap, ShieldAlert, Home } from 'lucide-react';
import { sound } from '../game/audio';
import { GameStats } from '../game/types';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onHome,
}) => {
  const isNewHighScore = stats.score > 0 && stats.score >= stats.highScore;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        sound.playMenuClick();
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/85 select-none animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-[0_0_50px_rgba(244,63,94,0.15)] flex flex-col gap-6 text-center">
        {/* Header with Alert Icon */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
          </div>
          <span className="text-xs uppercase tracking-widest text-rose-400 font-semibold">Integridad del Casco Cero</span>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1">MISIÓN FALLIDA</h2>
        </div>

        {/* Score & New High Score Banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
          {isNewHighScore && (
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-600/60 px-3 py-1 rounded-full animate-bounce">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>¡NUEVO RÉCORD HISTÓRICO!</span>
            </div>
          )}
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Puntuación Final</span>
          <span className="font-mono tabular-nums text-4xl font-extrabold text-white mt-0.5 tracking-tight drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            {stats.score.toString().padStart(6, '0')}
          </span>
          <div className="mt-2 text-xs text-slate-400 font-mono tabular-nums">
            Récord Actual: {stats.highScore.toString().padStart(6, '0')}
          </div>
        </div>

        {/* Detailed Mission Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-left">
          <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Oleada Final</span>
              <span className="font-mono tabular-nums text-base font-bold text-slate-200">
                {stats.wave}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Bajas Enemigas</span>
              <span className="font-mono tabular-nums text-base font-bold text-slate-200">
                {stats.enemiesDestroyed}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Precisión</span>
              <span className="font-mono tabular-nums text-base font-bold text-slate-200">
                {stats.accuracy}%
              </span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Combo Máximo</span>
              <span className="font-mono tabular-nums text-base font-bold text-slate-200">
                x{stats.maxCombo > 0 ? (1 + Math.floor(stats.maxCombo / 4) * 0.5).toFixed(1) : '1.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              sound.playMenuClick();
              onRestart();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <RotateCcw className="w-4 h-4" />
            <span>DESPLEGAR OTRA NAVE (REINTENTAR)</span>
          </button>

          <button
            onClick={() => {
              sound.playMenuClick();
              onHome();
            }}
            className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Volver al Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
