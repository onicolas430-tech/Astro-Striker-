export const GAME_CONFIG = {
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 1200,
  
  PLAYER: {
    WIDTH: 44,
    HEIGHT: 52,
    MAX_HP: 100,
    MAX_SHIELD: 100,
    SPEED: 480, // pixels per second
    ACCELERATION: 2800,
    FRICTION: 0.88,
    FIRE_COOLDOWN_SINGLE: 0.165, // seconds between shots
    FIRE_COOLDOWN_DUAL: 0.135,
    FIRE_COOLDOWN_TRIPLE: 0.125,
    FIRE_COOLDOWN_SPREAD: 0.135,
    INVULNERABLE_TIME: 1.2, // seconds after hit
    BULLET_SPEED: 820,
    BULLET_RADIUS: 4,
    BULLET_DAMAGE: 22,
  },

  ENEMIES: {
    SCOUT: {
      WIDTH: 32,
      HEIGHT: 32,
      HP: 50,
      POINTS: 100,
      SPEED: 230,
      COLOR: '#38bdf8', // Cyan
      SHOOT_COOLDOWN: 2.6,
      DROP_CHANCE: 0.18,
    },
    INTERCEPTOR: {
      WIDTH: 42,
      HEIGHT: 40,
      HP: 125,
      POINTS: 250,
      SPEED: 150,
      COLOR: '#f43f5e', // Rose/Crimson
      SHOOT_COOLDOWN: 1.65,
      DROP_CHANCE: 0.28,
    },
    HEAVY: {
      WIDTH: 56,
      HEIGHT: 56,
      HP: 300,
      POINTS: 600,
      SPEED: 85,
      COLOR: '#a855f7', // Violet
      SHOOT_COOLDOWN: 2.5,
      DROP_CHANCE: 0.48,
    },
  },

  POWERUP: {
    DROP_CHANCE: 0.20, // fallback base chance
    DURATION: 12, // 12 seconds for multi-shot lasers
    SPEED_DURATION: 10, // 10 seconds for speed boost
    RAPID_DURATION: 10, // 10 seconds for rapid fire
    SPEED_MULTIPLIER: 1.45, // +45% movement speed & acceleration
    RAPID_MULTIPLIER: 0.55, // 45% faster fire rate
    SPEED: 95,
    RADIUS: 18,
    MAGNET_RADIUS: 120,
    MAGNET_SPEED: 380,
  },

  STARS: {
    COUNT: 110,
    LAYERS: 3,
  },

  COMBO_TIMEOUT: 2.8, // seconds before combo resets
};
