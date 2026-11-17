import React, { useEffect } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Home } from 'lucide-react';
import { sound } from '../game/audio';
import { GameStats } from '../game/types';

interface PauseModalProps {
  stats: GameStats;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  stats,
  onResume,
  onRestart,
  onHome,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        sound.playMenuClick();
        onResume();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume, onToggleMute]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-center">
        {/* Header */}
        <div>
          <span className="text-xs uppercase tracking-widest text-sky-400 font-semibold">Sistema en Espera</span>
          <h2 className="text-2xl font-bold text-white mt-1">MISIÓN EN PAUSA</h2>
        </div>

        {/* Current Mission Telemetry */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 grid grid-cols-2 gap-3 text-left">
          <div>
            <span className="text-[11px] text-slate-400 block">Puntuación</span>
            <span className="font-mono tabular-nums text-lg font-bold text-white">
              {stats.score.toString().padStart(6, '0')}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Oleada Actual</span>
            <span className="font-mono tabular-nums text-lg font-bold text-sky-400">
              {stats.wave}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Enemigos Derribados</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-200">
              {stats.enemiesDestroyed}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Precisión Láser</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-200">
              {stats.accuracy}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              sound.playMenuClick();
              onResume();
            }}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Reanudar Misión</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                sound.playMenuClick();
                onRestart();
              }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>

            <button
              onClick={() => {
                sound.playMenuClick();
                onToggleMute();
              }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
              <span>{isMuted ? 'Desmutear' : 'Silenciar'}</span>
            </button>
          </div>

          <button
            onClick={() => {
              sound.playMenuClick();
              onHome();
            }}
            className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Volver a la Base Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
