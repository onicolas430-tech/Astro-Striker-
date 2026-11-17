import React from 'react';
import { Crosshair } from 'lucide-react';

interface TouchControlsProps {
  onDirectionChange: (dir: { x: number; y: number }) => void;
  onFireChange: (isFiring: boolean) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionChange,
  onFireChange,
}) => {
  const [activeDir, setActiveDir] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDirTouch = (x: number, y: number) => {
    setActiveDir({ x, y });
    onDirectionChange({ x, y });
  };

  const handleTouchEnd = () => {
    setActiveDir({ x: 0, y: 0 });
    onDirectionChange({ x: 0, y: 0 });
  };

  return (
    <div className="sm:hidden absolute inset-x-0 bottom-0 pointer-events-none z-20 p-4 flex items-end justify-between select-none pb-6">
      {/* Directional Pad */}
      <div
        className="pointer-events-auto w-36 h-36 bg-slate-900/60 border border-slate-800/80 rounded-2xl relative p-2 grid grid-cols-3 grid-rows-3 gap-1 backdrop-blur-sm"
        onTouchEnd={handleTouchEnd}
      >
        {/* Up */}
        <button
          onTouchStart={() => handleDirTouch(0, -1)}
          aria-label="Mover arriba"
          className={`col-start-2 row-start-1 rounded-lg flex items-center justify-center transition-colors ${
            activeDir.y === -1 ? 'bg-sky-500/40 text-white' : 'bg-slate-800/50 text-slate-400'
          }`}
        >
          ▲
        </button>
        {/* Left */}
        <button
          onTouchStart={() => handleDirTouch(-1, 0)}
          aria-label="Mover izquierda"
          className={`col-start-1 row-start-2 rounded-lg flex items-center justify-center transition-colors ${
            activeDir.x === -1 ? 'bg-sky-500/40 text-white' : 'bg-slate-800/50 text-slate-400'
          }`}
        >
          ◀
        </button>
        {/* Center dot */}
        <div className="col-start-2 row-start-2 rounded-full bg-slate-700/30 m-auto w-3 h-3" />
        {/* Right */}
        <button
          onTouchStart={() => handleDirTouch(1, 0)}
          aria-label="Mover derecha"
          className={`col-start-3 row-start-2 rounded-lg flex items-center justify-center transition-colors ${
            activeDir.x === 1 ? 'bg-sky-500/40 text-white' : 'bg-slate-800/50 text-slate-400'
          }`}
        >
          ▶
        </button>
        {/* Down */}
        <button
          onTouchStart={() => handleDirTouch(0, 1)}
          aria-label="Mover abajo"
          className={`col-start-2 row-start-3 rounded-lg flex items-center justify-center transition-colors ${
            activeDir.y === 1 ? 'bg-sky-500/40 text-white' : 'bg-slate-800/50 text-slate-400'
          }`}
        >
          ▼
        </button>
      </div>

      {/* Fire Action Button */}
      <button
        onTouchStart={e => {
          e.preventDefault();
          onFireChange(true);
        }}
        onTouchEnd={e => {
          e.preventDefault();
          onFireChange(false);
        }}
        aria-label="Disparar láser"
        className="pointer-events-auto w-24 h-24 rounded-full bg-gradient-to-tr from-sky-600/80 to-cyan-400/80 active:from-sky-400 active:to-cyan-300 border-2 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.5)] flex flex-col items-center justify-center text-slate-950 font-black text-xs transition-transform active:scale-95"
      >
        <Crosshair className="w-8 h-8 mb-0.5 stroke-[2.5]" />
        <span>FUEGO</span>
      </button>
    </div>
  );
};
