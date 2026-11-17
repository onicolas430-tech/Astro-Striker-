export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type WeaponType = 'SINGLE' | 'DUAL' | 'TRIPLE' | 'SPREAD';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  fireCooldown: number;
  fireTimer: number;
  invulnerableTimer: number;
  weaponType: WeaponType;
  weaponTimer: number; // Duration of power-up weapon
  speedBoostTimer: number; // Duration of movement speed boost
  rapidFireTimer: number; // Duration of rapid-fire overclock
  tilt: number; // -1 to 1 for banking animation
  thrusterIntensity: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  glowColor: string;
  life: number;
}

export type EnemyType = 'SCOUT' | 'INTERCEPTOR' | 'HEAVY';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  points: number;
  color: string;
  shootCooldown: number;
  shootTimer: number;
  moveTimer: number;
  hitFlashTimer: number;
  angle: number;
  rotSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'circle' | 'spark' | 'ring';
}

export interface FloatText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type PowerUpType = 'SHIELD' | 'TRIPLE' | 'SPEED' | 'RAPID' | 'REPAIR' | 'EMP';

export interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulseTimer: number;
  duration: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  layer: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  wave: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  enemiesDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  mouseX: number;
  mouseY: number;
  isTouch: boolean;
}
