import { Bullet, Enemy, FloatText, GameStats, Particle, Player, PowerUp, PowerUpType, Star, WeaponType } from './types';
import { GAME_CONFIG } from './constants';
import { sound } from './audio';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: GameStats, player: Player) => void;
  onGameOver: (stats: GameStats) => void;
  onWaveAnnouncement: (waveNumber: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Running state
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Screen shake & hitstop
  private screenShake: number = 0;
  private hitstopTimer: number = 0;

  // Game entities
  public player!: Player;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];
  private powerups: PowerUp[] = [];
  private stars: Star[] = [];

  // Progression & Waves
  private stats: GameStats = {
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
  };

  private waveTimer: number = 0;
  private waveEnemiesToSpawn: number = 0;
  private waveSpawnCooldown: number = 1.0;
  private waveSpawnTimer: number = 0;
  private inWaveTransition: boolean = false;
  private waveTransitionTimer: number = 0;

  // Input states
  private heldKeys = new Set<string>();
  private justPressed = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private isMouseDown = false;
  private touchTarget: { x: number; y: number } | null = null;
  private isTouchActive = false;
  private virtualDir = { x: 0, y: 0 };
  private virtualFire = false;

  public setVirtualDirection(dir: { x: number; y: number }) {
    this.virtualDir = dir;
  }

  public setVirtualFire(isFiring: boolean) {
    this.virtualFire = isFiring;
  }

  // Next unique ID generator
  private nextId = 1;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;
    this.callbacks = callbacks;

    this.loadHighScore();
    this.initStars();
    this.resetPlayer();
    this.setupEventListeners();
  }

  private loadHighScore() {
    try {
      const saved = localStorage.getItem('astro_striker_high_score');
      if (saved) {
        this.stats.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // Ignore
    }
  }

  private saveHighScore() {
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      try {
        localStorage.setItem('astro_striker_high_score', String(this.stats.highScore));
      } catch {
        // Ignore
      }
    }
  }

  private initStars() {
    this.stars = [];
    const width = this.canvas.width || GAME_CONFIG.CANVAS_WIDTH;
    const height = this.canvas.height || GAME_CONFIG.CANVAS_HEIGHT;

    for (let i = 0; i < GAME_CONFIG.STARS.COUNT; i++) {
      const layer = Math.floor(Math.random() * 3); // 0 = far, 1 = mid, 2 = near
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: layer === 2 ? 2.2 : layer === 1 ? 1.5 : 0.9,
        speed: layer === 2 ? 140 : layer === 1 ? 75 : 30,
        brightness: layer === 2 ? 0.9 : layer === 1 ? 0.65 : 0.35,
        twinkleSpeed: 2 + Math.random() * 4,
        twinkleOffset: Math.random() * Math.PI * 2,
        layer,
      });
    }
  }

  private resetPlayer() {
    const width = this.canvas.width || GAME_CONFIG.CANVAS_WIDTH;
    const height = this.canvas.height || GAME_CONFIG.CANVAS_HEIGHT;

    this.player = {
      x: width / 2,
      y: height - 120,
      vx: 0,
      vy: 0,
      width: GAME_CONFIG.PLAYER.WIDTH,
      height: GAME_CONFIG.PLAYER.HEIGHT,
      hp: GAME_CONFIG.PLAYER.MAX_HP,
      maxHp: GAME_CONFIG.PLAYER.MAX_HP,
      shield: GAME_CONFIG.PLAYER.MAX_SHIELD,
      maxShield: GAME_CONFIG.PLAYER.MAX_SHIELD,
      speed: GAME_CONFIG.PLAYER.SPEED,
      fireCooldown: GAME_CONFIG.PLAYER.FIRE_COOLDOWN_SINGLE,
      fireTimer: 0,
      invulnerableTimer: 0,
      weaponType: 'SINGLE',
      weaponTimer: 0,
      speedBoostTimer: 0,
      rapidFireTimer: 0,
      tilt: 0,
      thrusterIntensity: 0.6,
    };
  }

  public start() {
    this.isRunning = true;
    this.isPaused = false;
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.floatTexts = [];
    this.powerups = [];
    this.resetPlayer();

    this.stats.score = 0;
    this.stats.wave = 1;
    this.stats.combo = 0;
    this.stats.maxCombo = 0;
    this.stats.comboTimer = 0;
    this.stats.enemiesDestroyed = 0;
    this.stats.shotsFired = 0;
    this.stats.shotsHit = 0;
    this.stats.accuracy = 100;

    this.startWave(1);

    this.lastTime = performance.now();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.loop(this.lastTime);
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private startWave(waveNum: number) {
    this.stats.wave = waveNum;
    this.inWaveTransition = true;
    this.waveTransitionTimer = 2.0; // 2 seconds banner
    this.waveEnemiesToSpawn = 7 + waveNum * 4;
    this.waveSpawnCooldown = Math.max(0.5, 1.15 - waveNum * 0.08);
    this.waveSpawnTimer = 0.45;

    sound.playWaveStart();
    this.callbacks.onWaveAnnouncement(waveNum);
    this.addFloatingText(`¡OLEADA ${waveNum}!`, this.canvas.width / 2, this.canvas.height / 2 - 80, '#38bdf8', 34);
  }

  // --- Input handlers ---
  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    if (!this.heldKeys.has(code)) {
      this.justPressed.add(code);
    }
    this.heldKeys.add(code);

    // Prevent default scrolling on game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.justPressed.clear();
    this.isMouseDown = false;
    this.touchTarget = null;
    this.isTouchActive = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mousePos.x = (e.clientX - rect.left) * scaleX;
    this.mousePos.y = (e.clientY - rect.top) * scaleY;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.touchTarget = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
      this.isTouchActive = true;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.touchTarget = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      this.touchTarget = null;
      this.isTouchActive = false;
    }
  };

  // --- Main Simulation Loop ---
  private loop = (currentTime: number) => {
    this.animFrameId = requestAnimationFrame(this.loop);

    // Delta time in seconds, clamped to max 50ms (0.05s) to prevent physics explosion
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.05);

    if (!this.isRunning) {
      // Just render background stars for title idle screen
      this.updateStars(dt * 0.4);
      this.renderBackgroundOnly();
      return;
    }

    if (this.isPaused) {
      this.render();
      return;
    }

    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.render();
      return;
    }

    this.update(dt);
    this.render();

    // Clear one-shot edge triggers
    this.justPressed.clear();
  };

  // --- Update Simulation ---
  private update(dt: number) {
    this.updateStars(dt);
    this.updatePlayer(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updatePowerups(dt);
    this.handleCollisions();
    this.updateWaves(dt);
    this.updateStats(dt);
  }

  private updateStars(dt: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Weapon power-up timer
    if (p.weaponTimer > 0) {
      p.weaponTimer -= dt;
      if (p.weaponTimer <= 0) {
        p.weaponType = 'SINGLE';
        p.fireCooldown = GAME_CONFIG.PLAYER.FIRE_COOLDOWN_SINGLE;
        this.addFloatingText('Láser Estándar', p.x, p.y - 30, '#94a3b8', 16);
      }
    }

    // Speed boost timer
    if (p.speedBoostTimer > 0) {
      p.speedBoostTimer -= dt;
      if (p.speedBoostTimer <= 0) {
        p.speedBoostTimer = 0;
        this.addFloatingText('Velocidad Normal', p.x, p.y - 30, '#94a3b8', 16);
      }
    }

    // Rapid fire timer
    if (p.rapidFireTimer > 0) {
      p.rapidFireTimer -= dt;
      if (p.rapidFireTimer <= 0) {
        p.rapidFireTimer = 0;
        this.addFloatingText('Cadencia Normal', p.x, p.y - 30, '#94a3b8', 16);
      }
    }

    // Invulnerability timer
    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Shield passive regeneration (moderate recharge when avoiding hits)
    if (p.shield < p.maxShield && p.invulnerableTimer <= 0) {
      p.shield = Math.min(p.maxShield, p.shield + 2.2 * dt);
    }

    const hasSpeedBoost = p.speedBoostTimer > 0;
    const speedMult = hasSpeedBoost ? GAME_CONFIG.POWERUP.SPEED_MULTIPLIER : 1;
    const effectiveMaxSpeed = p.speed * speedMult;
    const effectiveAccel = GAME_CONFIG.PLAYER.ACCELERATION * speedMult;

    // Movement calculation
    let moveX = 0;
    let moveY = 0;

    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveY -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveY += 1;

    // Apply on-screen virtual directional pad if touched
    if (this.virtualDir.x !== 0) moveX += this.virtualDir.x;
    if (this.virtualDir.y !== 0) moveY += this.virtualDir.y;

    // Normalization for diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const invLen = 1 / Math.SQRT2;
      moveX *= invLen;
      moveY *= invLen;
    }

    // Touch drag override if active
    if (this.isTouchActive && this.touchTarget) {
      const dx = this.touchTarget.x - p.x;
      const dy = (this.touchTarget.y - 50) - p.y; // 50px offset so finger doesn't block ship
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        moveX = Math.max(-1, Math.min(1, dx / 30));
        moveY = Math.max(-1, Math.min(1, dy / 30));
      }
    }

    // Apply acceleration
    if (moveX !== 0 || moveY !== 0) {
      p.vx += moveX * effectiveAccel * dt;
      p.vy += moveY * effectiveAccel * dt;
      p.thrusterIntensity = Math.min(hasSpeedBoost ? 1.6 : 1.2, p.thrusterIntensity + 3.5 * dt);
    } else {
      p.thrusterIntensity = Math.max(hasSpeedBoost ? 0.7 : 0.4, p.thrusterIntensity - 2 * dt);
    }

    // Apply friction/drag
    p.vx *= Math.pow(GAME_CONFIG.PLAYER.FRICTION, dt * 60);
    p.vy *= Math.pow(GAME_CONFIG.PLAYER.FRICTION, dt * 60);

    // Speed clamping
    const currentSpeed = Math.hypot(p.vx, p.vy);
    if (currentSpeed > effectiveMaxSpeed) {
      const scale = effectiveMaxSpeed / currentSpeed;
      p.vx *= scale;
      p.vy *= scale;
    }

    // Move player
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Banking tilt based on horizontal velocity
    const targetTilt = Math.max(-1, Math.min(1, p.vx / effectiveMaxSpeed));
    p.tilt += (targetTilt - p.tilt) * Math.min(1, 14 * dt);

    // Screen bounds clamping
    const halfW = p.width / 2;
    const halfH = p.height / 2;
    if (p.x < halfW) {
      p.x = halfW;
      p.vx = 0;
    } else if (p.x > this.canvas.width - halfW) {
      p.x = this.canvas.width - halfW;
      p.vx = 0;
    }
    if (p.y < halfH + 60) {
      p.y = halfH + 60;
      p.vy = 0;
    } else if (p.y > this.canvas.height - halfH - 20) {
      p.y = this.canvas.height - halfH - 20;
      p.vy = 0;
    }

    // Emit thruster engine particles
    if (Math.random() < p.thrusterIntensity) {
      this.emitThrusterParticles(p);
    }

    // Shooting logic
    p.fireTimer -= dt;
    const wantsToFire =
      this.heldKeys.has('Space') ||
      this.isMouseDown ||
      this.isTouchActive ||
      this.virtualFire;

    if (wantsToFire && p.fireTimer <= 0) {
      this.firePlayerWeapon();
    }
  }

  private emitThrusterParticles(p: Player) {
    const leftEngineX = p.x - 12 + Math.random() * 4;
    const rightEngineX = p.x + 12 - Math.random() * 4;
    const engineY = p.y + p.height / 2 - 4;

    const hasSpeedBoost = p.speedBoostTimer > 0;
    const colors = hasSpeedBoost
      ? ['#34d399', '#10b981', '#67e8f9', '#ffffff']
      : ['#38bdf8', '#0284c7', '#67e8f9', '#ffffff'];

    [leftEngineX, rightEngineX].forEach(x => {
      this.particles.push({
        x,
        y: engineY,
        vx: (Math.random() - 0.5) * (hasSpeedBoost ? 55 : 40),
        vy: (hasSpeedBoost ? 260 : 180) + Math.random() * 120,
        life: 0.18 + Math.random() * 0.12,
        maxLife: 0.3,
        size: (hasSpeedBoost ? 3.2 : 2.5) + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'circle',
      });
    });

    // Wingtip speed streaks when speed boost is active
    if (hasSpeedBoost && Math.random() < 0.7) {
      [-p.width / 2 + 2, p.width / 2 - 2].forEach(offset => {
        this.particles.push({
          x: p.x + offset,
          y: p.y + p.height / 2 - 8,
          vx: 0,
          vy: 280,
          life: 0.15,
          maxLife: 0.15,
          size: 2,
          color: '#34d399',
          shape: 'spark',
        });
      });
    }
  }

  private firePlayerWeapon() {
    const p = this.player;
    const rapidMult = p.rapidFireTimer > 0 ? GAME_CONFIG.POWERUP.RAPID_MULTIPLIER : 1;
    p.fireTimer = p.fireCooldown * rapidMult;
    this.stats.shotsFired++;

    sound.playLaser(true);

    if (p.weaponType === 'SINGLE') {
      // Twin synchronized muzzle barrels
      [-10, 10].forEach(offset => {
        this.bullets.push({
          id: this.nextId++,
          x: p.x + offset,
          y: p.y - 14,
          vx: 0,
          vy: -GAME_CONFIG.PLAYER.BULLET_SPEED,
          radius: GAME_CONFIG.PLAYER.BULLET_RADIUS,
          damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE,
          isPlayer: true,
          color: p.rapidFireTimer > 0 ? '#fb923c' : '#38bdf8',
          glowColor: p.rapidFireTimer > 0 ? '#ea580c' : '#0284c7',
          life: 2.5,
        });
      });
    } else if (p.weaponType === 'DUAL') {
      // High-power heavy twin lasers
      [-14, 14].forEach(offset => {
        this.bullets.push({
          id: this.nextId++,
          x: p.x + offset,
          y: p.y - 16,
          vx: 0,
          vy: -GAME_CONFIG.PLAYER.BULLET_SPEED * 1.1,
          radius: GAME_CONFIG.PLAYER.BULLET_RADIUS * 1.3,
          damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE * 1.4,
          isPlayer: true,
          color: '#22d3ee',
          glowColor: '#0891b2',
          life: 2.5,
        });
      });
    } else if (p.weaponType === 'TRIPLE') {
      // Triple spread cannons
      const angles = [-0.18, 0, 0.18];
      angles.forEach((angle, idx) => {
        const offset = idx === 1 ? 0 : idx === 0 ? -14 : 14;
        const speed = GAME_CONFIG.PLAYER.BULLET_SPEED;
        this.bullets.push({
          id: this.nextId++,
          x: p.x + offset,
          y: p.y - 14,
          vx: Math.sin(angle) * speed,
          vy: -Math.cos(angle) * speed,
          radius: GAME_CONFIG.PLAYER.BULLET_RADIUS * 1.1,
          damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE * 1.1,
          isPlayer: true,
          color: '#facc15', // Amber energy bolts
          glowColor: '#eab308',
          life: 2.5,
        });
      });
    } else if (p.weaponType === 'SPREAD') {
      // 5-way Overcharged Spread Lasers
      const angles = [-0.34, -0.17, 0, 0.17, 0.34];
      angles.forEach((angle, idx) => {
        const offset = (idx - 2) * 8;
        const speed = GAME_CONFIG.PLAYER.BULLET_SPEED * 1.05;
        this.bullets.push({
          id: this.nextId++,
          x: p.x + offset,
          y: p.y - 14,
          vx: Math.sin(angle) * speed,
          vy: -Math.cos(angle) * speed,
          radius: GAME_CONFIG.PLAYER.BULLET_RADIUS * 1.15,
          damage: GAME_CONFIG.PLAYER.BULLET_DAMAGE * 1.05,
          isPlayer: true,
          color: '#fbbf24',
          glowColor: '#f59e0b',
          life: 2.5,
        });
      });
    }

    // Slight recoil
    p.y += 1.5;
  }

  private updateBullets(dt: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Remove off-screen or expired bullets
      if (b.y < -30 || b.y > height + 30 || b.x < -30 || b.x > width + 30 || b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.moveTimer += dt;
      e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);

      // Unique enemy movement behaviors
      if (e.type === 'SCOUT') {
        // Fast weaving sin wave
        e.y += e.vy * dt;
        e.x += Math.sin(e.moveTimer * 4.0) * 185 * dt;

        // Scouts fire quick downward plasma bolts
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.y < height - 280 && e.y > 40) {
          e.shootTimer = e.shootCooldown;
          this.fireScoutBullet(e);
        }
      } else if (e.type === 'INTERCEPTOR') {
        // Stalking pattern: moves down, tracks player X aggressively
        e.y += e.vy * dt;
        const dx = this.player.x - e.x;
        e.x += Math.sign(dx) * Math.min(Math.abs(dx), 120 * dt);

        // Shooting logic
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.y < height - 200 && e.y > 50) {
          e.shootTimer = e.shootCooldown;
          this.fireEnemyBullet(e);
        }
      } else if (e.type === 'HEAVY') {
        // Heavy armored core: slow drifting and rotating
        e.y += e.vy * dt;
        e.angle += e.rotSpeed * dt;

        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && e.y < height - 220 && e.y > 60) {
          e.shootTimer = e.shootCooldown;
          this.fireHeavySalvo(e);
        }
      }

      // Despawn off-screen enemies
      if (e.y > height + 60) {
        this.enemies.splice(i, 1);
      }
    }
  }

  private fireScoutBullet(e: Enemy) {
    sound.playLaser(false);
    this.bullets.push({
      id: this.nextId++,
      x: e.x,
      y: e.y + e.height / 2,
      vx: 0,
      vy: 330,
      radius: 4.5,
      damage: 14,
      isPlayer: false,
      color: '#38bdf8',
      glowColor: '#0284c7',
      life: 3.5,
    });
  }

  private fireEnemyBullet(e: Enemy) {
    sound.playLaser(false);
    // Aim vector toward player
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 385;

    this.bullets.push({
      id: this.nextId++,
      x: e.x,
      y: e.y + e.height / 2,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 5.5,
      damage: 19,
      isPlayer: false,
      color: '#f43f5e',
      glowColor: '#e11d48',
      life: 4.0,
    });
  }

  private fireHeavySalvo(e: Enemy) {
    sound.playLaser(false);
    // 3-way spread downward (5-way on Wave 5+)
    const angles = this.stats.wave >= 5 ? [-0.45, -0.22, 0, 0.22, 0.45] : [-0.3, 0, 0.3];
    angles.forEach(angle => {
      const speed = 295;
      this.bullets.push({
        id: this.nextId++,
        x: e.x,
        y: e.y + e.height / 2,
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,
        radius: 6,
        damage: 24,
        isPlayer: false,
        color: '#c084fc',
        glowColor: '#a855f7',
        life: 4.5,
      });
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.shape === 'spark') {
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatTexts.splice(i, 1);
      }
    }
  }

  private updatePowerups(dt: number) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const pu = this.powerups[i];
      pu.pulseTimer += dt * 5;

      // Magnetic attraction when player is nearby
      const dx = this.player.x - pu.x;
      const dy = this.player.y - pu.y;
      const dist = Math.hypot(dx, dy);

      if (dist < GAME_CONFIG.POWERUP.MAGNET_RADIUS && dist > 1) {
        const pullFactor = 1 - dist / GAME_CONFIG.POWERUP.MAGNET_RADIUS;
        const pullSpeed = GAME_CONFIG.POWERUP.MAGNET_SPEED * (0.4 + pullFactor * 0.6);
        pu.x += (dx / dist) * pullSpeed * dt;
        pu.y += (dy / dist) * pullSpeed * dt;
      } else {
        pu.x += pu.vx * dt;
        pu.y += pu.vy * dt;
        // Soft bounce off side edges so power-ups remain collectable
        if (pu.x < pu.radius + 10) {
          pu.x = pu.radius + 10;
          pu.vx = Math.abs(pu.vx);
        } else if (pu.x > width - pu.radius - 10) {
          pu.x = width - pu.radius - 10;
          pu.vx = -Math.abs(pu.vx);
        }
      }

      // Check collision with player
      if (dist < pu.radius + this.player.width * 0.55) {
        this.collectPowerup(pu);
        this.powerups.splice(i, 1);
        continue;
      }

      if (pu.y > height + 40) {
        this.powerups.splice(i, 1);
      }
    }
  }

  private collectPowerup(pu: PowerUp) {
    sound.playPowerup();
    const p = this.player;

    switch (pu.type) {
      case 'SHIELD':
        p.shield = p.maxShield;
        this.addFloatingText('¡ESCUDO RECARGADO!', p.x, p.y - 30, '#38bdf8', 20);
        this.createShockwave(p.x, p.y, '#38bdf8', 45);
        break;

      case 'TRIPLE':
        if (p.weaponType === 'TRIPLE' || p.weaponType === 'SPREAD') {
          // Stack upgrade to 5-way SPREAD multi-shot
          p.weaponType = 'SPREAD';
          p.fireCooldown = GAME_CONFIG.PLAYER.FIRE_COOLDOWN_SPREAD;
          this.addFloatingText('¡MULTILÁSER x5!', p.x, p.y - 30, '#fbbf24', 22);
        } else {
          p.weaponType = 'TRIPLE';
          p.fireCooldown = GAME_CONFIG.PLAYER.FIRE_COOLDOWN_TRIPLE;
          this.addFloatingText('¡LÁSER TRIPLE!', p.x, p.y - 30, '#facc15', 20);
        }
        p.weaponTimer = GAME_CONFIG.POWERUP.DURATION;
        this.createShockwave(p.x, p.y, '#facc15', 45);
        break;

      case 'SPEED':
        p.speedBoostTimer = GAME_CONFIG.POWERUP.SPEED_DURATION;
        this.addFloatingText('¡TURBO VELOCIDAD!', p.x, p.y - 30, '#34d399', 20);
        this.createShockwave(p.x, p.y, '#34d399', 45);
        break;

      case 'RAPID':
        p.rapidFireTimer = GAME_CONFIG.POWERUP.RAPID_DURATION;
        this.addFloatingText('¡FUEGO RÁPIDO!', p.x, p.y - 30, '#fb923c', 20);
        this.createShockwave(p.x, p.y, '#fb923c', 45);
        break;

      case 'REPAIR':
        p.hp = Math.min(p.maxHp, p.hp + 25);
        this.addFloatingText('+25 CASCO', p.x, p.y - 30, '#4ade80', 20);
        this.createShockwave(p.x, p.y, '#4ade80', 35);
        break;

      case 'EMP':
        sound.playEmp();
        this.screenShake = 16;
        this.createShockwave(p.x, p.y, '#c084fc', 220);
        this.addFloatingText('¡PULSO EMP!', p.x, p.y - 30, '#c084fc', 22);

        // Clear all enemy bullets and damage all enemies
        this.bullets = this.bullets.filter(b => b.isPlayer);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          e.hp -= 60;
          e.hitFlashTimer = 0.2;
          if (e.hp <= 0) {
            this.destroyEnemy(e, i);
          }
        }
        break;
    }
  }

  // --- Collision Detection ---
  private handleCollisions() {
    const p = this.player;

    // 1. Player Bullets vs Enemies
    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = this.bullets[bIdx];
      if (!b.isPlayer) continue;

      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b.radius + e.width / 2) {
          // Hit!
          this.stats.shotsHit++;
          e.hp -= b.damage;
          e.hitFlashTimer = 0.12;
          this.createHitSparks(b.x, b.y, b.color);
          sound.playHit();

          // Remove bullet
          this.bullets.splice(bIdx, 1);

          // Enemy destroyed?
          if (e.hp <= 0) {
            this.destroyEnemy(e, eIdx);
          }
          break;
        }
      }
    }

    // 2. Enemy Bullets vs Player
    if (p.invulnerableTimer <= 0) {
      for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = this.bullets[bIdx];
        if (b.isPlayer) continue;

        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < b.radius + p.width * 0.4) {
          this.bullets.splice(bIdx, 1);
          this.damagePlayer(b.damage, b.x, b.y);
          break;
        }
      }
    }

    // 3. Enemy Ship vs Player Ship (Physical Ramming)
    if (p.invulnerableTimer <= 0) {
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const e = this.enemies[eIdx];
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < (e.width + p.width) * 0.4) {
          this.damagePlayer(40, e.x, e.y);
          e.hp -= 50;
          if (e.hp <= 0) {
            this.destroyEnemy(e, eIdx);
          }
          break;
        }
      }
    }
  }

  private damagePlayer(amount: number, hitX: number, hitY: number) {
    const p = this.player;
    this.screenShake = 12;

    const hadShield = p.shield > 0;
    if (hadShield) {
      sound.playPlayerHit(true);
      p.shield -= amount;
      if (p.shield < 0) {
        // Spill over to HP
        p.hp += p.shield;
        p.shield = 0;
      }
      this.createShockwave(hitX, hitY, '#38bdf8', 25);
    } else {
      sound.playPlayerHit(false);
      p.hp -= amount;
      this.createExplosionParticles(hitX, hitY, 'small', '#f43f5e');
    }

    p.invulnerableTimer = GAME_CONFIG.PLAYER.INVULNERABLE_TIME;

    // Reset combo on hit
    this.stats.combo = 0;

    if (p.hp <= 0) {
      p.hp = 0;
      this.triggerGameOver();
    }
  }

  private destroyEnemy(e: Enemy, index: number) {
    this.enemies.splice(index, 1);
    this.stats.enemiesDestroyed++;

    // Increment combo
    this.stats.combo++;
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }
    this.stats.comboTimer = GAME_CONFIG.COMBO_TIMEOUT;

    // Score calculation with combo multiplier
    const multiplier = 1 + Math.floor(this.stats.combo / 4) * 0.5;
    const gainedScore = Math.round(e.points * multiplier);
    this.stats.score += gainedScore;
    this.saveHighScore();

    // Sound and visual juice based on enemy type
    if (e.type === 'HEAVY') {
      sound.playExplosion('large');
      this.hitstopTimer = 0.06; // 60ms freeze frame for impactful heavy kill
      this.screenShake = 14;
      this.createExplosionParticles(e.x, e.y, 'large', e.color);
      this.addFloatingText(`+${gainedScore}`, e.x, e.y, '#c084fc', 22);
    } else if (e.type === 'INTERCEPTOR') {
      sound.playExplosion('medium');
      this.hitstopTimer = 0.03;
      this.screenShake = 8;
      this.createExplosionParticles(e.x, e.y, 'medium', e.color);
      this.addFloatingText(`+${gainedScore}`, e.x, e.y, '#fb7185', 20);
    } else {
      sound.playExplosion('small');
      this.screenShake = 4;
      this.createExplosionParticles(e.x, e.y, 'small', e.color);
      this.addFloatingText(`+${gainedScore}`, e.x, e.y, '#38bdf8', 18);
    }

    if (this.stats.combo >= 4 && this.stats.combo % 4 === 0) {
      this.addFloatingText(`¡COMBO x${multiplier.toFixed(1)}!`, e.x, e.y - 25, '#facc15', 20);
    }

    // Power-up drop chance scaled by enemy tier
    const dropChance = GAME_CONFIG.ENEMIES[e.type].DROP_CHANCE ?? GAME_CONFIG.POWERUP.DROP_CHANCE;
    if (Math.random() < dropChance) {
      this.spawnPowerup(e.x, e.y);
    }
  }

  private spawnPowerup(x: number, y: number) {
    // Weighted random power-up drop favoring temporary combat upgrades (Multi-shot, Speed, Rapid-fire)
    const roll = Math.random();
    let type: PowerUpType = 'TRIPLE';
    if (roll < 0.26) type = 'TRIPLE';
    else if (roll < 0.50) type = 'SPEED';
    else if (roll < 0.68) type = 'RAPID';
    else if (roll < 0.82) type = 'SHIELD';
    else if (roll < 0.93) type = 'REPAIR';
    else type = 'EMP';

    this.powerups.push({
      id: this.nextId++,
      type,
      x,
      y,
      vx: (Math.random() - 0.5) * 60,
      vy: GAME_CONFIG.POWERUP.SPEED,
      radius: GAME_CONFIG.POWERUP.RADIUS,
      pulseTimer: 0,
      duration: 15,
    });
  }

  private triggerGameOver() {
    sound.playGameOver();
    this.screenShake = 22;
    this.createExplosionParticles(this.player.x, this.player.y, 'large', '#38bdf8');
    this.createExplosionParticles(this.player.x, this.player.y, 'large', '#f43f5e');
    this.isRunning = false;
    this.saveHighScore();
    this.callbacks.onGameOver(this.stats);
  }

  // --- Wave Management ---
  private updateWaves(dt: number) {
    if (this.inWaveTransition) {
      this.waveTransitionTimer -= dt;
      if (this.waveTransitionTimer <= 0) {
        this.inWaveTransition = false;
      }
      return;
    }

    // Spawn wave enemies
    if (this.waveEnemiesToSpawn > 0) {
      this.waveSpawnTimer -= dt;
      if (this.waveSpawnTimer <= 0) {
        this.waveSpawnTimer = this.waveSpawnCooldown;
        this.spawnWaveEnemy();
        this.waveEnemiesToSpawn--;
      }
    } else if (this.enemies.length === 0) {
      // Wave cleared! Start next wave
      this.startWave(this.stats.wave + 1);
    }
  }

  private spawnWaveEnemy() {
    const width = this.canvas.width;
    const wave = this.stats.wave;

    // Pick enemy type based on wave
    let type: 'SCOUT' | 'INTERCEPTOR' | 'HEAVY' = 'SCOUT';
    const roll = Math.random();

    if (wave === 1) {
      type = roll < 0.85 ? 'SCOUT' : 'INTERCEPTOR';
    } else if (wave === 2) {
      if (roll < 0.58) type = 'SCOUT';
      else if (roll < 0.92) type = 'INTERCEPTOR';
      else type = 'HEAVY';
    } else {
      if (roll < 0.38) type = 'SCOUT';
      else if (roll < 0.78) type = 'INTERCEPTOR';
      else type = 'HEAVY';
    }

    const cfg = GAME_CONFIG.ENEMIES[type];
    const margin = cfg.WIDTH;
    const spawnX = margin + Math.random() * (width - margin * 2);
    const spawnY = -cfg.HEIGHT;
    const hpScale = 1 + (wave - 1) * 0.18;

    this.enemies.push({
      id: this.nextId++,
      type,
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 40,
      vy: cfg.SPEED * (0.95 + Math.random() * 0.2),
      width: cfg.WIDTH,
      height: cfg.HEIGHT,
      hp: cfg.HP * hpScale,
      maxHp: cfg.HP * hpScale,
      points: cfg.POINTS,
      color: cfg.COLOR,
      shootCooldown: Math.max(0.75, cfg.SHOOT_COOLDOWN * Math.pow(0.95, wave - 1)),
      shootTimer: 0.5 + Math.random() * 1.1,
      moveTimer: Math.random() * 10,
      hitFlashTimer: 0,
      angle: 0,
      rotSpeed: (Math.random() - 0.5) * 2,
    });
  }

  private updateStats(dt: number) {
    // Combo decay
    if (this.stats.combo > 0) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        this.stats.combo = 0;
      }
    }

    // Accuracy calculation
    if (this.stats.shotsFired > 0) {
      this.stats.accuracy = Math.round((this.stats.shotsHit / this.stats.shotsFired) * 100);
    }

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 28 * dt);
    }

    // Callback notification (throttled to UI)
    this.callbacks.onStatsUpdate(this.stats, this.player);
  }

  // --- Visual FX Helpers ---
  private addFloatingText(text: string, x: number, y: number, color: string, size = 18) {
    this.floatTexts.push({
      id: this.nextId++,
      text,
      x,
      y,
      vy: -55,
      life: 0.9,
      maxLife: 0.9,
      color,
      size,
    });
  }

  private createHitSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.12 + Math.random() * 0.1,
        maxLife: 0.22,
        size: 2,
        color,
        shape: 'spark',
      });
    }
  }

  private createShockwave(x: number, y: number, color: string, radius: number) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.35,
      maxLife: 0.35,
      size: radius,
      color,
      shape: 'ring',
    });
  }

  private createExplosionParticles(x: number, y: number, size: 'small' | 'medium' | 'large', baseColor: string) {
    const count = size === 'large' ? 45 : size === 'medium' ? 26 : 14;
    const colors = [baseColor, '#f59e0b', '#f97316', '#ffffff', '#ef4444'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * (size === 'large' ? 260 : size === 'medium' ? 180 : 120);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * (size === 'large' ? 0.45 : 0.25),
        maxLife: 0.7,
        size: 2 + Math.random() * (size === 'large' ? 4.5 : 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() < 0.6 ? 'circle' : 'spark',
      });
    }

    // Central shockwave ring
    this.createShockwave(x, y, baseColor, size === 'large' ? 50 : 25);
  }

  // --- Rendering ---
  private renderBackgroundOnly() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Deep space gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#030712');
    bgGradient.addColorStop(0.5, '#090d1a');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    this.renderStars();
  }

  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();

    // Apply screen shake
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Deep space background
    this.renderBackgroundOnly();

    // 2. Powerups
    this.renderPowerups();

    // 3. Bullets
    this.renderBullets();

    // 4. Enemies
    this.renderEnemies();

    // 5. Player Ship
    if (this.player.hp > 0) {
      this.renderPlayer();
    }

    // 6. Particles
    this.renderParticles();

    // 7. Floating Combat Texts
    this.renderFloatTexts();

    ctx.restore();
  }

  private renderStars() {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const alpha = s.brightness * (0.8 + 0.2 * Math.sin(performance.now() * 0.003 * s.twinkleSpeed + s.twinkleOffset));
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderPlayer() {
    const ctx = this.ctx;
    const p = this.player;

    // Blink if invulnerable
    if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 12) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    // Banking rotation (tilt)
    const tiltAngle = p.tilt * 0.25; // max ~14 degrees
    ctx.rotate(tiltAngle);

    // Shield Dome Aura if active
    if (p.shield > 0) {
      const shieldRatio = p.shield / p.maxShield;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, p.width * 0.85, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${(0.3 + shieldRatio * 0.4).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = `rgba(56, 189, 248, ${(0.04 + shieldRatio * 0.08).toFixed(2)})`;
      ctx.fill();
      ctx.restore();
    }

    // Speed Boost Overdrive Aura
    if (p.speedBoostTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -p.height / 2 - 12);
      ctx.lineTo(p.width * 0.72, p.height / 2 + 6);
      ctx.lineTo(0, p.height / 2 - 4);
      ctx.lineTo(-p.width * 0.72, p.height / 2 + 6);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Thruster Engine Glow & Flame
    const hasSpeedBoost = p.speedBoostTimer > 0;
    const thrusterLength = (hasSpeedBoost ? 22 : 14) + p.thrusterIntensity * 16 + Math.random() * 6;
    const flameGrad = ctx.createLinearGradient(0, p.height / 2 - 4, 0, p.height / 2 + thrusterLength);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, hasSpeedBoost ? '#34d399' : '#38bdf8');
    flameGrad.addColorStop(1, 'transparent');

    [-12, 12].forEach(ox => {
      ctx.beginPath();
      ctx.moveTo(ox - (hasSpeedBoost ? 4 : 3), p.height / 2 - 4);
      ctx.lineTo(ox + (hasSpeedBoost ? 4 : 3), p.height / 2 - 4);
      ctx.lineTo(ox, p.height / 2 + thrusterLength);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();
    });

    // Main Starfighter Hull (Sleek aerodynamic delta wing)
    ctx.beginPath();
    // Nose cone
    ctx.moveTo(0, -p.height / 2);
    // Right wing tip
    ctx.lineTo(p.width / 2, p.height / 2 - 6);
    // Right engine notch
    ctx.lineTo(p.width / 2 - 6, p.height / 2);
    ctx.lineTo(p.width / 2 - 16, p.height / 2 - 4);
    // Center aft exhaust
    ctx.lineTo(0, p.height / 2 - 12);
    // Left engine notch
    ctx.lineTo(-(p.width / 2 - 16), p.height / 2 - 4);
    ctx.lineTo(-(p.width / 2 - 6), p.height / 2);
    // Left wing tip
    ctx.lineTo(-p.width / 2, p.height / 2 - 6);
    ctx.closePath();

    // Hull Gradient
    const hullGrad = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
    hullGrad.addColorStop(0, '#e2e8f0');
    hullGrad.addColorStop(0.5, '#94a3b8');
    hullGrad.addColorStop(1, '#334155');
    ctx.fillStyle = hullGrad;
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wing Cannons
    [-18, 18].forEach(ox => {
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(ox - 2, p.height / 2 - 24, 4, 16);
    });

    // Cockpit Canopy (Glowing Cyan Visor)
    ctx.beginPath();
    ctx.ellipse(0, -4, 5, 12, 0, 0, Math.PI * 2);
    const canopyGrad = ctx.createLinearGradient(0, -16, 0, 8);
    canopyGrad.addColorStop(0, '#38bdf8');
    canopyGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = canopyGrad;
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private renderBullets() {
    const ctx = this.ctx;

    for (const b of this.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.isPlayer) {
        // Player Laser Bolt with high-energy tail
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 10;

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius, b.radius * 2.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // White hot core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 0.5, b.radius * 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Enemy Plasma Orb
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 8;

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderEnemies() {
    const ctx = this.ctx;

    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Hit flash overlay (pure white when hit)
      const isFlashing = e.hitFlashTimer > 0;

      if (e.type === 'SCOUT') {
        // Dron Explorador: Fast triangular swept dart
        ctx.beginPath();
        ctx.moveTo(0, e.height / 2);
        ctx.lineTo(-e.width / 2, -e.height / 2);
        ctx.lineTo(0, -e.height / 2 + 8);
        ctx.lineTo(e.width / 2, -e.height / 2);
        ctx.closePath();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#0284c7';
        ctx.fill();
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Red visor eye
        ctx.fillStyle = isFlashing ? '#ffffff' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'INTERCEPTOR') {
        // Interceptor Carmesí: Heavy angular cruiser
        ctx.beginPath();
        ctx.moveTo(0, e.height / 2);
        ctx.lineTo(-e.width / 2, 0);
        ctx.lineTo(-e.width / 2 + 6, -e.height / 2);
        ctx.lineTo(0, -e.height / 2 + 10);
        ctx.lineTo(e.width / 2 - 6, -e.height / 2);
        ctx.lineTo(e.width / 2, 0);
        ctx.closePath();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#881337';
        ctx.fill();
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pulsing weapon charger core
        const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.008);
        ctx.fillStyle = isFlashing ? '#ffffff' : `rgba(244, 63, 94, ${pulse.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(0, 4, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'HEAVY') {
        // Mina Blindada / Núcleo Pesado: Rotating polygon
        ctx.rotate(e.angle);

        ctx.beginPath();
        const sides = 8;
        const radius = e.width / 2;
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const r = s % 2 === 0 ? radius : radius * 0.75;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        ctx.fillStyle = isFlashing ? '#ffffff' : '#4c1d95';
        ctx.fill();
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = isFlashing ? '#ffffff' : '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Micro Health Bar for heavy/damaged enemies
      if (e.hp < e.maxHp) {
        const barW = e.width * 0.8;
        const barH = 3;
        const barY = -e.height / 2 - 8;
        const hpRatio = Math.max(0, e.hp / e.maxHp);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(-barW / 2, barY, barW, barH);

        ctx.fillStyle = hpRatio > 0.4 ? '#4ade80' : '#ef4444';
        ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
      }

      ctx.restore();
    }
  }

  private renderPowerups() {
    const ctx = this.ctx;

    for (const pu of this.powerups) {
      ctx.save();
      ctx.translate(pu.x, pu.y);

      const pulse = 1 + 0.09 * Math.sin(pu.pulseTimer);
      ctx.scale(pulse, pulse);

      let color = '#38bdf8';
      let bgTint = 'rgba(14, 165, 233, 0.22)';
      let label = '';

      switch (pu.type) {
        case 'TRIPLE':
          color = '#facc15';
          bgTint = 'rgba(234, 179, 8, 0.22)';
          label = 'x3';
          break;
        case 'SPEED':
          color = '#34d399';
          bgTint = 'rgba(16, 185, 129, 0.22)';
          label = 'SPD';
          break;
        case 'RAPID':
          color = '#fb923c';
          bgTint = 'rgba(249, 115, 22, 0.22)';
          label = 'ROF';
          break;
        case 'SHIELD':
          color = '#38bdf8';
          bgTint = 'rgba(56, 189, 248, 0.22)';
          label = 'SHD';
          break;
        case 'REPAIR':
          color = '#4ade80';
          bgTint = 'rgba(74, 222, 128, 0.22)';
          label = '+HP';
          break;
        case 'EMP':
          color = '#c084fc';
          bgTint = 'rgba(168, 85, 247, 0.22)';
          label = 'EMP';
          break;
      }

      // Rotating dashed outer energy ring
      ctx.save();
      ctx.rotate(pu.pulseTimer * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, pu.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();

      // Hexagonal power-up capsule body
      ctx.beginPath();
      const sides = 6;
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 - Math.PI / 6;
        const px = Math.cos(a) * pu.radius;
        const py = Math.sin(a) * pu.radius;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fill();
      ctx.fillStyle = bgTint;
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Custom crisp vector icon per power-up type
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (pu.type === 'TRIPLE') {
        // Three diverging laser bolts
        [-0.35, 0, 0.35].forEach(ang => {
          ctx.save();
          ctx.rotate(ang);
          ctx.beginPath();
          ctx.moveTo(0, 6);
          ctx.lineTo(0, -7);
          ctx.strokeStyle = '#fef08a';
          ctx.stroke();
          ctx.restore();
        });
      } else if (pu.type === 'SPEED') {
        // Double upward speed chevrons
        [-3, 3].forEach(yOff => {
          ctx.beginPath();
          ctx.moveTo(-6, yOff + 3);
          ctx.lineTo(0, yOff - 3);
          ctx.lineTo(6, yOff + 3);
          ctx.strokeStyle = '#6ee7b7';
          ctx.stroke();
        });
      } else if (pu.type === 'RAPID') {
        // Lightning bolt
        ctx.beginPath();
        ctx.moveTo(2, -8);
        ctx.lineTo(-4, 1);
        ctx.lineTo(1, 1);
        ctx.lineTo(-2, 8);
        ctx.lineTo(5, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fillStyle = '#fdba74';
        ctx.fill();
      } else if (pu.type === 'SHIELD') {
        // Shield crest
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, -4);
        ctx.lineTo(5, 2);
        ctx.lineTo(0, 7);
        ctx.lineTo(-5, 2);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        ctx.strokeStyle = '#7dd3fc';
        ctx.stroke();
      } else if (pu.type === 'REPAIR') {
        // Medical/hull cross
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);
      } else if (pu.type === 'EMP') {
        // Concentric shockwave burst
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#e9d5ff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Micro tag below capsule for instant readability
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = color;
      ctx.fillText(label, 0, pu.radius + 6);

      ctx.restore();
    }
  }

  private renderParticles() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();

      if (p.shape === 'ring') {
        // Shockwave expansion ring
        const progress = 1 - alpha;
        const currentRadius = p.size * (0.3 + progress * 0.7);
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 3 * alpha);
        ctx.globalAlpha = alpha;
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderFloatTexts() {
    const ctx = this.ctx;

    for (const ft of this.floatTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.font = `bold ${ft.size}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
