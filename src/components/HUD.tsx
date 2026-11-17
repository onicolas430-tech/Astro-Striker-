import React from 'react';
import { Volume2, VolumeX, Pause, Shield, Heart, Zap, Crosshair, Gauge, Flame } from 'lucide-react';
import { GameStats, Player } from '../game/types';
import { GAME_CONFIG } from '../game/constants';

interface HUDProps {
  stats: GameStats;
  player: Player | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  waveAnnouncement: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  player,
  isMuted,
  onToggleMute,
  onPause,
  waveAnnouncement,
}) => {
  const hp = player ? Math.max(0, Math.round(player.hp)) : GAME_CONFIG.PLAYER.MAX_HP;
  const maxHp = player ? player.maxHp : GAME_CONFIG.PLAYER.MAX_HP;
  const shield = player ? Math.max(0, Math.round(player.shield)) : GAME_CONFIG.PLAYER.MAX_SHIELD;
  const maxShield = player ? player.maxShield : GAME_CONFIG.PLAYER.MAX_SHIELD;
  const hpRatio = hp / maxHp;
  const shieldRatio = shield / maxShield;

  const weaponName =
    !player || player.weaponType === 'SINGLE'
      ? 'Cañón Dual'
      : player.weaponType === 'DUAL'
      ? 'Láser Pesado'
      : player.weaponType === 'TRIPLE'
      ? 'Disparo Triple'
      : 'Multiláser x5';

  const weaponDuration = player && player.weaponTimer > 0 ? Math.ceil(player.weaponTimer) : null;
  const weaponRatio = player && player.weaponTimer > 0 ? Math.min(1, player.weaponTimer / GAME_CONFIG.POWERUP.DURATION) : 0;

  const speedDuration = player && player.speedBoostTimer > 0 ? Math.ceil(player.speedBoostTimer) : null;
  const speedRatio = player && player.speedBoostTimer > 0 ? Math.min(1, player.speedBoostTimer / GAME_CONFIG.POWERUP.SPEED_DURATION) : 0;

  const rapidDuration = player && player.rapidFireTimer > 0 ? Math.ceil(player.rapidFireTimer) : null;
  const rapidRatio = player && player.rapidFireTimer > 0 ? Math.min(1, player.rapidFireTimer / GAME_CONFIG.POWERUP.RAPID_DURATION) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Hull and Shield Status */}
        <div className="flex flex-col gap-2 min-w-[170px] sm:min-w-[210px] bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-rose-400">
                <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                CASCO
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                {hp} / {maxHp}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-150 rounded-full ${
                  hpRatio > 0.4 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hpRatio * 100))}%` }}
              />
            </div>
          </div>

          {/* Shield Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-sky-400">
                <Shield className="w-3.5 h-3.5 fill-sky-500/20" />
                ESCUDO
              </span>
              <span className="font-mono tabular-nums text-slate-300">
                {shield} / {maxShield}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, shieldRatio * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Score, Multiplier and Wave indicator */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-950/70 border border-slate-800/80 px-4 py-1.5 rounded-xl flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Puntuación</span>
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
              {stats.score.toString().padStart(6, '0')}
            </span>
          </div>

          {/* Combo badge if active */}
          {stats.combo > 1 && (
            <div className="mt-1.5 text-xs font-semibold tracking-wide text-amber-300 bg-amber-950/70 border border-amber-600/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>COMBO x{(1 + Math.floor(stats.combo / 4) * 0.5).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Right: Wave number, High Score & System Controls */}
        <div className="flex items-center gap-2">
          {/* Wave & High Score Cluster */}
          <div className="hidden sm:flex flex-col items-end bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-xl text-right">
            <div className="text-[11px] text-sky-400 font-bold uppercase tracking-wider">
              Oleada {stats.wave}
            </div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
              RÉCORD {stats.highScore.toString().padStart(6, '0')}
            </div>
          </div>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="pointer-events-auto p-2 sm:p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Pausar juego"
            className="pointer-events-auto p-2 sm:p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Center Wave Announcement Banner */}
      {waveAnnouncement && (
        <div className="self-center my-auto transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="bg-slate-950/90 border border-sky-500/50 shadow-[0_0_30px_rgba(56,189,248,0.3)] px-6 py-3 rounded-2xl text-center">
            <span className="text-xs uppercase tracking-widest text-sky-400 font-semibold block mb-0.5">Alerta de Sector</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase">
              {waveAnnouncement}
            </h2>
          </div>
        </div>
      )}

      {/* Bottom Perimeter Cluster */}
      <div className="flex items-end justify-between text-xs text-slate-400">
        {/* Active Weapon & Temporary Power-Up Buffs */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="bg-slate-950/65 border border-slate-800/80 px-3 py-1.5 rounded-xl flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                <Crosshair className={`w-3.5 h-3.5 ${weaponDuration !== null ? 'text-amber-400' : 'text-sky-400'}`} />
                {weaponName}
              </span>
              {weaponDuration !== null && (
                <span className="font-mono tabular-nums text-amber-400 font-semibold">
                  {weaponDuration}s
                </span>
              )}
            </div>
            {weaponDuration !== null && (
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-100 rounded-full"
                  style={{ width: `${weaponRatio * 100}%` }}
                />
              </div>
            )}
          </div>

          {speedDuration !== null && (
            <div className="bg-slate-950/65 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex flex-col gap-1 min-w-[125px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  Turbo
                </span>
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  {speedDuration}s
                </span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100 rounded-full"
                  style={{ width: `${speedRatio * 100}%` }}
                />
              </div>
            </div>
          )}

          {rapidDuration !== null && (
            <div className="bg-slate-950/65 border border-orange-500/40 px-3 py-1.5 rounded-xl flex flex-col gap-1 min-w-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium text-orange-300">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Fuego Rápido
                </span>
                <span className="font-mono tabular-nums text-orange-400 font-semibold">
                  {rapidDuration}s
                </span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 transition-all duration-100 rounded-full"
                  style={{ width: `${rapidRatio * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Accuracy and Enemies destroyed */}
        <div className="hidden sm:flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono tabular-nums">
          <span>PRECISIÓN: {stats.accuracy}%</span>
          <span className="text-slate-600">·</span>
          <span>BAJAS: {stats.enemiesDestroyed}</span>
        </div>
      </div>
    </div>
  );
};
