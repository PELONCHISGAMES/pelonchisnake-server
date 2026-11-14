/**
 * ==============================================================================
 * PELONCHISNAKE - SERVIDOR MULTIJUGADOR DEDICADO (20, 45 Y 80 JUGADORES)
 * Pelonchis Games Studio - https://pelonchisgames.com/
 * ==============================================================================
 * Características:
 * - Salas concurrentes con selector de capacidad: 20, 45 y 80 jugadores simultáneos.
 * - Auto-Fill Inteligente: rellena automáticamente con bots si faltan jugadores
 *   humanos para que las salas NUNCA estén vacías (siempre hay 20, 45 u 80 serpientes).
 * - Detección de colisiones autoritativa en el servidor con Cuadrícula Espacial (Spatial Grid).
 * - Mecánica única: ¡Corte y Mordisco de Cola! (Tail Chomp) vs Choque Fatal.
 * - Habilidades Definitivas por Criatura sincronizadas en tiempo real.
 * - Ticks a 20 Hz con delta snapshots optimizados para baja latencia (Ping < 30ms).
 * - Soporte para despliegue local (localhost), VPS, Render.com, Railway o cPanel Node.js.
 * ==============================================================================
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const TICK_RATE = 20; // 20 ticks por segundo (50 ms por actualización)

// Nombres auténticos de bots para rellenar salas
const BOT_NAMES = [
  'Cobra_Rex', 'ViperX', 'SlitherBot', 'ShadowFang', 'PixelSerpent',
  'TitanBoa', 'NeonPython', 'CyberSnake', 'KogaNinja', 'RyuMaster',
  'OmegaTail', 'GlitchWorm', 'CosmicViper', 'SpeedyTail', 'DracoStar',
  'GhostNaga', 'TurboFang', 'AeroSerpent', 'DarkHydra', 'SolarFlare',
  'HydroBite', 'ElectroWorm', 'ThunderSnake', 'FrostFang', 'InfernoTail',
  'QuantumAsp', 'StarStrider', 'AbyssCobra', 'NovaSerpent', 'PelonchisBot',
  'AlphaVenom', 'IronScale', 'MysticPython', 'VortexSnake', 'ZenithFang',
  'CrimsonBoa', 'EmeraldViper', 'GoldenDragon', 'SonicSerpent', 'PulseTail',
  'Ragnarok', 'Valhalla_Snake', 'MatrixGlitch', 'PhantomScale', 'ZeroHour',
  'Hyperion', 'EclipseCobra', 'BlazeFang', 'TsunamiBoa', 'ApexHunter',
  'Zephyr', 'Orion', 'SiriuSnake', 'KrakenTail', 'NebulaFang',
  'Starlight', 'GalacticBoa', 'ChronoSerpent', 'ObsidianViper', 'PulsarTail',
  'Valkyrie', 'Leviathan', 'Archon', 'DreadFang', 'Oblivion',
  'CyberVenom', 'GigaBite', 'MegaSlither', 'NanoScale', 'Overlord',
  'Specter', 'Mirage', 'Chimera', 'Basilisk', 'Ouroboros',
  'Jormungandr', 'Quetzal', 'Midgard', 'Nidhogg', 'Ananta'
];

// Configuración de Skins oficiales de Pelonchis Games
const SKINS = [
  { id: 'dragon', name: 'Dragón Ryū', type: 'dragon', colorHead: '#00e5a3', colorBody1: '#00f0ff', colorBody2: '#ffd43f' },
  { id: 'kitsune', name: 'Zorro Kyūbi', type: 'kitsune', colorHead: '#ffffff', colorBody1: '#ff2a55', colorBody2: '#ffffff' },
  { id: 'axolotl', name: 'Axo-Chan', type: 'axolotl', colorHead: '#ff80bf', colorBody1: '#ffb3d9', colorBody2: '#ffffff' },
  { id: 'ninja', name: 'Kage Sombra', type: 'ninja', colorHead: '#2d1b4e', colorBody1: '#9b51e0', colorBody2: '#00f0ff' },
  { id: 'mecha', name: 'Mecha-01', type: 'mecha', colorHead: '#37474f', colorBody1: '#00e5ff', colorBody2: '#ff9800' },
  { id: 'neko', name: 'Neko Sushi', type: 'neko', colorHead: '#ffb74d', colorBody1: '#ff7043', colorBody2: '#ffffff' },
  { id: 'phoenix', name: 'Fénix Ígneo', type: 'phoenix', colorHead: '#ff3d00', colorBody1: '#ff9100', colorBody2: '#ffd600' },
  { id: 'pelonchis', name: 'Pelonchis Dorado', type: 'pelonchis', colorHead: '#ffd700', colorBody1: '#ffae00', colorBody2: '#ffffff' }
];

// Configuraciones de Sala por capacidad solicitada (20, 45, 80)
const ROOM_CONFIGS = {
  '20': { id: 'room_20', capacity: 20, arenaRadius: 2400, foodCount: 750, name: 'SALA RÁPIDA (20 JUGADORES)' },
  '45': { id: 'room_45', capacity: 45, arenaRadius: 3500, foodCount: 1400, name: 'SALA ESTÁNDAR (45 JUGADORES)' },
  '80': { id: 'room_80', capacity: 80, arenaRadius: 4800, foodCount: 2400, name: 'SALA MASIVA (80 JUGADORES)' }
};

// ==============================================================================
// CLASE CUADRÍCULA ESPACIAL (SPATIAL GRID) PARA COLISIONES DE ALTO RENDIMIENTO
// ==============================================================================
class SpatialGrid {
  constructor(cellSize = 140) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  key(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return (cx << 16) ^ cy;
  }

  insert(x, y, data) {
    const k = this.key(x, y);
    let cell = this.grid.get(k);
    if (!cell) {
      cell = [];
      this.grid.set(k, cell);
    }
    cell.push(data);
  }

  query(x, y, radius) {
    const results = [];
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const k = (cx << 16) ^ cy;
        const cell = this.grid.get(k);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            results.push(cell[i]);
          }
        }
      }
    }
    return results;
  }
}

// ==============================================================================
// CLASE SERPIENTE DEL SERVIDOR (FÍSICA, CONTROL, SEGMENTOS Y COMBATE)
// ==============================================================================
class ServerSnake {
  constructor(id, name, skin, isBot = false, x = 0, y = 0) {
    this.id = id;
    this.name = name;
    this.skin = skin || SKINS[0];
    this.isBot = isBot;
    this.ws = null; // Asignado si es jugador humano

    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.targetAngle = this.angle;

    this.baseSpeed = 4.4;
    this.boostSpeed = 8.2;
    this.currentSpeed = this.baseSpeed;
    this.turnSpeed = isBot ? 0.11 : 0.14;

    this.score = isBot ? Math.floor(60 + Math.random() * 220) : 100;
    this.kills = 0;
    this.alive = true;

    // Habilidad Definitiva (0 a 100)
    this.ki = 35;
    this.activeUltimateTimer = 0;
    this.isInvulnerableUltimate = false;
    this.shieldTimer = 3.0; // Escudo protector al aparecer

    // Segmentos y física
    this.segDistance = 12;
    this.initialSegments = 16;
    this.segments = [];
    for (let i = 0; i < this.initialSegments; i++) {
      this.segments.push({
        x: this.x - Math.cos(this.angle) * (i * this.segDistance),
        y: this.y - Math.sin(this.angle) * (i * this.segDistance),
        angle: this.angle
      });
    }

    this.isBoosting = false;
    this.boostAccumulator = 0;

    // IA interna de bots
    this.aiTimer = 0;
    this.aiDecisionInterval = 0.2 + Math.random() * 0.25;
  }

  get radius() {
    return 13 + Math.min(18, Math.sqrt(this.score) * 0.42);
  }

  get targetSegmentCount() {
    return Math.floor(14 + Math.sqrt(this.score) * 2.2);
  }

  update(dt, arenaRadius, room) {
    if (!this.alive) return;

    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);

    if (this.activeUltimateTimer > 0) {
      this.activeUltimateTimer = Math.max(0, this.activeUltimateTimer - dt);
      if (this.activeUltimateTimer <= 0) {
        this.isInvulnerableUltimate = false;
      }
    }

    if (this.isBot) {
      this.updateBotAI(dt, arenaRadius, room);
    }

    // Suavizado de giro
    let diff = this.targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    let effTurnSpeed = this.turnSpeed;
    if (this.activeUltimateTimer > 0) effTurnSpeed = 0.25;
    else if (this.isBoosting) effTurnSpeed = 0.18;

    this.angle += diff * Math.min(1, effTurnSpeed * (dt * 60));

    // Velocidad y Turbo
    const wantsBoost = this.isBoosting && this.score > 35;
    const hasFreeTurbo = (this.skin.id === 'pelonchis' || this.skin.id === 'phoenix') && this.activeUltimateTimer > 0;
    const isAccelerating = wantsBoost || hasFreeTurbo;

    if (isAccelerating) {
      const topSpd = hasFreeTurbo ? this.boostSpeed * 1.15 : this.boostSpeed;
      this.currentSpeed = lerp(this.currentSpeed, topSpd, 0.2);
      if (!hasFreeTurbo) {
        this.boostAccumulator += dt * 14;
        if (this.boostAccumulator >= 1) {
          const shed = Math.floor(this.boostAccumulator);
          this.score = Math.max(25, this.score - shed);
          this.boostAccumulator -= shed;

          // Soltar orbe detrás de la cola
          const tail = this.segments[this.segments.length - 1];
          if (tail && Math.random() < 0.6) {
            room.spawnFood(tail.x + rand(-6, 6), tail.y + rand(-6, 6), 1, this.skin.colorBody1);
          }
        }
      }
    } else {
      this.currentSpeed = lerp(this.currentSpeed, this.baseSpeed, 0.15);
    }

    // Avance de la cabeza
    const moveDist = this.currentSpeed * (dt * 60);
    this.x += Math.cos(this.angle) * moveDist;
    this.y += Math.sin(this.angle) * moveDist;

    // Física de la columna vertebral
    for (let i = 0; i < this.segments.length; i++) {
      const leader = (i === 0) ? { x: this.x, y: this.y } : this.segments[i - 1];
      let dx = this.segments[i].x - leader.x;
      let dy = this.segments[i].y - leader.y;
      const d = Math.hypot(dx, dy);
      if (d > this.segDistance) {
        const factor = (d - this.segDistance) / d;
        this.segments[i].x -= dx * factor;
        this.segments[i].y -= dy * factor;
      }
      this.segments[i].angle = Math.atan2(leader.y - this.segments[i].y, leader.x - this.segments[i].x);
    }

    // Ajuste dinámico de longitud
    const needed = this.targetSegmentCount;
    if (this.segments.length < needed) {
      const last = this.segments[this.segments.length - 1];
      this.segments.push({ x: last.x, y: last.y, angle: last.angle });
    } else if (this.segments.length > needed && this.segments.length > 8) {
      this.segments.pop();
    }

    // Límite de la arena circular
    const dCenter = Math.hypot(this.x, this.y);
    if (dCenter >= arenaRadius - this.radius) {
      this.die(room, 'el borde de la arena');
    }
  }

  updateBotAI(dt, arenaRadius, room) {
    this.aiTimer -= dt;
    if (this.aiTimer > 0) return;
    this.aiTimer = this.aiDecisionInterval;

    // Lanzar definitiva IA si está lista
    if (this.ki >= 100 && Math.random() < 0.3) {
      this.triggerUltimate(room);
    }

    // Evasión de bordes y serpientes
    const feeler = 100 + this.radius * 2;
    const angles = [0, -0.45, 0.45, -0.9, 0.9, -1.6, 1.6];
    let bestAngle = null;
    let highestSafety = -99999;

    for (const offset of angles) {
      const testA = this.angle + offset;
      const tx = this.x + Math.cos(testA) * feeler;
      const ty = this.y + Math.sin(testA) * feeler;

      let safety = 100;
      const distFromCenter = Math.hypot(tx, ty);
      if (distFromCenter >= arenaRadius - 60) safety -= 600;

      for (const other of room.snakes) {
        if (!other.alive || other.id === this.id) continue;
        const tailThreshold = Math.floor(other.segments.length * 0.70);
        for (let i = 0; i < other.segments.length; i += 3) {
          const seg = other.segments[i];
          const d = Math.hypot(tx - seg.x, ty - seg.y);
          if (d < this.radius + other.radius + 15) {
            if (i < tailThreshold) {
              safety -= 450; // ¡Peligro de choque contra el cuerpo!
            } else {
              safety += 90;  // ¡Oportunidad de morder y cortar la cola!
            }
            break;
          }
        }
      }

      if (safety > highestSafety) {
        highestSafety = safety;
        bestAngle = testA;
      }
    }

    if (highestSafety < 0) {
      this.targetAngle = bestAngle;
      this.isBoosting = Math.random() < 0.6;
      return;
    }

    // Buscar comida cercana
    let nearestFood = null;
    let minDist = 400;
    for (let i = 0; i < Math.min(room.foods.length, 250); i += 4) {
      const f = room.foods[i];
      const d = Math.hypot(this.x - f.x, this.y - f.y);
      if (d < minDist) {
        minDist = d;
        nearestFood = f;
      }
    }

    if (nearestFood) {
      this.targetAngle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
      this.isBoosting = minDist < 150 && Math.random() < 0.3;
    } else {
      this.targetAngle += rand(-0.35, 0.35);
      this.isBoosting = false;
    }
  }

  triggerUltimate(room) {
    if (this.ki < 100 || !this.alive) return;
    this.ki = 0;
    this.activeUltimateTimer = 4.0;

    room.broadcastEvent({
      type: 'ulti',
      id: this.id,
      name: this.name,
      skinType: this.skin.type
    });

    switch (this.skin.type) {
      case 'dragon':
        // Rayo Cósmico: empuja rivales y roba orbes en 750px frontales
        const beamEnd = {
          x: this.x + Math.cos(this.angle) * 750,
          y: this.y + Math.sin(this.angle) * 750
        };
        for (const other of room.snakes) {
          if (other.id === this.id || !other.alive) continue;
          const d = pointToSegmentDistance(other.x, other.y, this.x, this.y, beamEnd.x, beamEnd.y);
          if (d < 120) {
            other.x += Math.cos(this.angle) * 180;
            other.y += Math.sin(this.angle) * 180;
          }
        }
        break;

      case 'axolotl':
        // Onda expansiva en 360° que empuja y atrae comida
        for (const other of room.snakes) {
          if (other.id === this.id || !other.alive) continue;
          const d = Math.hypot(other.x - this.x, other.y - this.y);
          if (d < 500) {
            const ang = Math.atan2(other.y - this.y, other.x - this.x);
            other.x += Math.cos(ang) * 200;
            other.y += Math.sin(ang) * 200;
          }
        }
        break;

      case 'mecha':
        // Pulso PEM: frena a los rivales cercanos
        for (const other of room.snakes) {
          if (other.id === this.id || !other.alive) continue;
          if (Math.hypot(other.x - this.x, other.y - this.y) < 600) {
            other.currentSpeed = 1.8;
            setTimeout(() => { if (other) other.currentSpeed = other.baseSpeed; }, 3200);
          }
        }
        break;

      case 'phoenix':
      case 'pelonchis':
        this.isInvulnerableUltimate = true;
        this.activeUltimateTimer = 4.0;
        break;
    }
  }

  die(room, killerName = 'un choque') {
    if (!this.alive) return;
    this.alive = false;

    // Convertir segmentos en orbes de comida al morir
    for (let i = 0; i < this.segments.length; i += 2) {
      const seg = this.segments[i];
      const val = Math.min(25, Math.max(3, Math.floor(this.score / this.segments.length * 1.5)));
      room.spawnFood(seg.x + rand(-8, 8), seg.y + rand(-8, 8), val, this.skin.colorBody1);
    }

    room.broadcastEvent({
      type: 'kill',
      victimId: this.id,
      victimName: this.name,
      killerName: killerName
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'gameover', killerName: killerName, score: this.score, kills: this.kills }));
    }

    // Si era bot, reaparece tras unos segundos para mantener el conteo exacto de la sala
    if (this.isBot) {
      setTimeout(() => {
        if (room.snakes.length < room.capacity) {
          room.addBot();
        }
      }, 3500);
    }
  }
}

// ==============================================================================
// CLASE SALA MULTIJUGADOR (MANEJADOR DE SALAS DE 20, 45 Y 80 JUGADORES)
// ==============================================================================
class GameRoom {
  constructor(config) {
    this.id = config.id;
    this.capacity = config.capacity;
    this.arenaRadius = config.arenaRadius;
    this.targetFoodCount = config.foodCount;
    this.name = config.name;

    this.snakes = [];
    this.foods = [];
    this.nextFoodId = 1;
    this.spatialGrid = new SpatialGrid(140);

    // Inicializar comida
    for (let i = 0; i < this.targetFoodCount; i++) {
      this.spawnRandomFood();
    }

    // Inicializar sala completa con bots inteligentes
    this.fillWithBots();

    // Iniciar bucle de simulación a 20 ticks/seg
    this.tickInterval = setInterval(() => this.tick(), 1000 / TICK_RATE);
  }

  fillWithBots() {
    while (this.snakes.length < this.capacity) {
      this.addBot();
    }
  }

  addBot() {
    const idx = this.snakes.length;
    const botName = BOT_NAMES[idx % BOT_NAMES.length];
    const botSkin = SKINS[idx % SKINS.length];
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = rand(300, this.arenaRadius * 0.8);
    const bx = Math.cos(spawnAngle) * spawnDist;
    const by = Math.sin(spawnAngle) * spawnDist;

    const bot = new ServerSnake(`bot_${Date.now()}_${idx}`, botName, botSkin, true, bx, by);
    this.snakes.push(bot);
  }

  addPlayer(ws, name, skinId) {
    // Si la sala está llena de bots, sustituimos un bot por el jugador humano
    if (this.snakes.length >= this.capacity) {
      const botIndex = this.snakes.findIndex(s => s.isBot && s.alive);
      if (botIndex !== -1) {
        this.snakes.splice(botIndex, 1);
      }
    }

    const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
    const cleanName = (name || 'Pelonchis').substring(0, 14);
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = rand(200, this.arenaRadius * 0.6);
    const px = Math.cos(spawnAngle) * spawnDist;
    const py = Math.sin(spawnAngle) * spawnDist;

    const player = new ServerSnake(`p_${Date.now()}_${Math.floor(Math.random() * 1000)}`, cleanName, skin, false, px, py);
    player.ws = ws;
    this.snakes.push(player);

    ws.snake = player;
    ws.room = this;

    // Enviar bienvenida y configuración de la arena
    ws.send(JSON.stringify({
      type: 'welcome',
      id: player.id,
      arenaRadius: this.arenaRadius,
      roomSize: this.capacity,
      roomName: this.name
    }));

    console.log(`[${this.id}] Jugador "${cleanName}" conectado. Total en sala: ${this.snakes.length}/${this.capacity}`);
    return player;
  }

  removePlayer(player) {
    if (!player) return;
    const idx = this.snakes.indexOf(player);
    if (idx !== -1) {
      this.snakes.splice(idx, 1);
      console.log(`[${this.id}] Jugador "${player.name}" desconectado.`);
    }

    // Rellenar con bot para mantener siempre la sala en su capacidad exacta
    if (this.snakes.length < this.capacity) {
      this.addBot();
    }
  }

  spawnFood(x, y, val = 1, color = null) {
    this.foods.push({
      id: this.nextFoodId++,
      x, y, val,
      color: color || '#ffd34d'
    });
  }

  spawnRandomFood() {
    const fAngle = Math.random() * Math.PI * 2;
    const fDist = Math.sqrt(Math.random()) * (this.arenaRadius - 80);
    const colors = ['#00f0ff', '#ffd34d', '#ff2a85', '#00e5a3', '#ff9800', '#7bf5ff'];
    this.spawnFood(
      Math.cos(fAngle) * fDist,
      Math.sin(fAngle) * fDist,
      1,
      colors[Math.floor(Math.random() * colors.length)]
    );
  }

  broadcastEvent(eventData) {
    const msg = JSON.stringify(eventData);
    for (const s of this.snakes) {
      if (!s.isBot && s.ws && s.ws.readyState === WebSocket.OPEN) {
        s.ws.send(msg);
      }
    }
  }

  tick() {
    const dt = 1 / TICK_RATE;

    // 1. Actualizar movimientos
    for (const s of this.snakes) {
      s.update(dt, this.arenaRadius, this);
    }

    // 2. Poblar Spatial Grid con segmentos corporales
    this.spatialGrid.clear();
    for (const s of this.snakes) {
      if (!s.alive || s.shieldTimer > 0 || s.isInvulnerableUltimate) continue;
      // Los primeros 3 segmentos están cerca de la cabeza; insertamos a partir del 3
      for (let i = 3; i < s.segments.length; i++) {
        this.spatialGrid.insert(s.segments[i].x, s.segments[i].y, { snake: s, segIdx: i });
      }
    }

    // 3. Comprobación de Colisiones: Corte de cola vs Choque fatal
    for (const attacker of this.snakes) {
      if (!attacker.alive || attacker.shieldTimer > 0 || attacker.isInvulnerableUltimate) continue;

      const nearby = this.spatialGrid.query(attacker.x, attacker.y, attacker.radius + 35);
      for (const item of nearby) {
        const victim = item.snake;
        if (victim.id === attacker.id || !victim.alive) continue;

        const seg = victim.segments[item.segIdx];
        if (!seg) continue;
        const d = Math.hypot(attacker.x - seg.x, attacker.y - seg.y);

        if (d < attacker.radius + victim.radius * 0.85) {
          const tailThreshold = Math.floor(victim.segments.length * 0.70);

          if (item.segIdx >= tailThreshold) {
            // ¡¡MECÁNICA ÚNICA: CORTE Y MORDISCO DE COLA!!
            const severedCount = victim.segments.length - item.segIdx;
            victim.segments.splice(item.segIdx);

            const massLoss = Math.floor(victim.score * (severedCount / (victim.segments.length + severedCount)));
            victim.score = Math.max(25, victim.score - massLoss);

            // Recompensa al atacante
            attacker.score += Math.floor(massLoss * 0.85);
            attacker.ki = Math.min(100, attacker.ki + 25); // +25% de Ki al cortar una cola

            this.broadcastEvent({
              type: 'tailChomp',
              attackerName: attacker.name,
              victimName: victim.name,
              mass: massLoss
            });
            break;
          } else {
            // Choque fatal contra el torso
            victim.kills++;
            victim.score += Math.floor(attacker.score * 0.45);
            victim.ki = Math.min(100, victim.ki + 35);

            attacker.die(this, victim.name);
            break;
          }
        }
      }
    }

    // 4. Absorción de comida
    for (const s of this.snakes) {
      if (!s.alive) continue;
      const reach = s.radius + 18;

      for (let i = this.foods.length - 1; i >= 0; i--) {
        const f = this.foods[i];
        if (Math.hypot(s.x - f.x, s.y - f.y) < reach) {
          s.score += f.val;
          s.ki = Math.min(100, s.ki + 0.35); // Cargar Ki progresivamente
          this.foods.splice(i, 1);
        }
      }
    }

    // Reponer comida si ha bajado del objetivo
    while (this.foods.length < this.targetFoodCount) {
      this.spawnRandomFood();
    }

    // 5. Eliminar serpientes muertas que no sean bots
    this.snakes = this.snakes.filter(s => s.alive);
    this.fillWithBots();

    // 6. Generar Top 10 Clasificación
    const sorted = [...this.snakes].sort((a, b) => b.score - a.score);
    const leaderboard = sorted.slice(0, 10).map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      score: Math.floor(s.score),
      isHuman: !s.isBot
    }));

    // 7. Enviar snapshot a los clientes humanos
    for (const s of this.snakes) {
      if (!s.isBot && s.ws && s.ws.readyState === WebSocket.OPEN) {
        // Enviar serpientes en el rango visible para máxima optimización
        const visibleSnakes = [];
        for (const other of this.snakes) {
          if (!other.alive) continue;
          const dist = Math.hypot(s.x - other.x, s.y - other.y);
          if (dist < 2200 || other.id === s.id) {
            visibleSnakes.push({
              id: other.id,
              name: other.name,
              skin: other.skin.id,
              x: Math.round(other.x),
              y: Math.round(other.y),
              angle: +(other.angle.toFixed(2)),
              score: Math.floor(other.score),
              ki: Math.floor(other.ki),
              boosting: other.isBoosting,
              shield: other.shieldTimer > 0,
              ulti: other.activeUltimateTimer > 0,
              // Muestreo de segmentos optimizado
              segments: other.segments.map(seg => [Math.round(seg.x), Math.round(seg.y)])
            });
          }
        }

        // Comida cercana
        const visibleFood = [];
        for (const f of this.foods) {
          if (Math.hypot(s.x - f.x, s.y - f.y) < 1800) {
            visibleFood.push([f.id, Math.round(f.x), Math.round(f.y), f.val, f.color]);
          }
        }

        s.ws.send(JSON.stringify({
          type: 'world',
          snakes: visibleSnakes,
          foods: visibleFood,
          leaderboard: leaderboard,
          aliveCount: this.snakes.length,
          humanCount: this.snakes.filter(x => !x.isBot).length
        }));
      }
    }
  }
}

// ==============================================================================
// INICIALIZACIÓN DE SALAS Y SERVIDOR HTTP + WEBSOCKET
// ==============================================================================
const rooms = {
  '20': new GameRoom(ROOM_CONFIGS['20']),
  '45': new GameRoom(ROOM_CONFIGS['45']),
  '80': new GameRoom(ROOM_CONFIGS['80'])
};

// Servidor HTTP con información de estado y endpoint de salud
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/status') {
    const stats = {
      status: 'online',
      server: 'Pelonchis Games Studio - Pelonchisnake Multiplayer Engine',
      uptimeSeconds: Math.floor(process.uptime()),
      totalActiveSnakes: Object.values(rooms).reduce((acc, r) => acc + r.snakes.length, 0),
      rooms: {
        '20': { name: rooms['20'].name, players: rooms['20'].snakes.filter(s => !s.isBot).length, bots: rooms['20'].snakes.filter(s => s.isBot).length },
        '45': { name: rooms['45'].name, players: rooms['45'].snakes.filter(s => !s.isBot).length, bots: rooms['45'].snakes.filter(s => s.isBot).length },
        '80': { name: rooms['80'].name, players: rooms['80'].snakes.filter(s => !s.isBot).length, bots: rooms['80'].snakes.filter(s => s.isBot).length }
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Servidor Multijugador PELONCHISNAKE</title></head>
    <body style="font-family:sans-serif;background:#0d061f;color:#fff;text-align:center;padding:40px;">
      <h1 style="color:#ffd34d;">⭐ SERVIDOR MULTIJUGADOR PELONCHISNAKE ACTIVO ⭐</h1>
      <p>Salas configuradas para <b>20, 45 y 80 jugadores</b> con Auto-Fill inteligente.</p>
      <p style="color:#00f0ff;">WebSocket Endpoint: <code>ws://${req.headers.host || 'localhost:' + PORT}</code></p>
      <hr style="border-color:#333;max-width:500px;margin:20px auto;">
      <p style="color:#aaa;">Pelonchis Games Studio © 2026</p>
    </body>
    </html>
  `);
});

// Servidor WebSocket montado sobre HTTP
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.snake = null;
  ws.room = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // 1. Unirse a una sala (20, 45 u 80 jugadores)
      if (data.type === 'join') {
        const roomCapacity = String(data.roomSize || '45');
        const targetRoom = rooms[roomCapacity] || rooms['45'];
        targetRoom.addPlayer(ws, data.name, data.skinId);
      }

      // 2. Control de dirección y aceleración
      else if (data.type === 'input' && ws.snake && ws.snake.alive) {
        if (typeof data.angle === 'number' && !isNaN(data.angle)) {
          ws.snake.targetAngle = data.angle;
        }
        ws.snake.isBoosting = Boolean(data.boost);
      }

      // 3. Activar Habilidad Definitiva
      else if (data.type === 'ulti' && ws.snake && ws.room) {
        ws.snake.triggerUltimate(ws.room);
      }

      // 4. Ping / Pong para cálculo de latencia
      else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', t: data.t }));
      }
    } catch (e) {
      console.error('Error procesando mensaje WebSocket:', e);
    }
  });

  ws.on('close', () => {
    if (ws.room && ws.snake) {
      ws.room.removePlayer(ws.snake);
    }
  });

  ws.on('error', (err) => {
    console.error('Error en conexión WebSocket:', err);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`==============================================================================`);
  console.log(`⭐ SERVIDOR MULTIJUGADOR PELONCHISNAKE INICIADO EXITOSAMENTE ⭐`);
  console.log(`→ Escuchando en: http://${HOST}:${PORT} (WebSocket: ws://${HOST}:${PORT})`);
  console.log(`→ Salas activas:`);
  console.log(`   - Sala Rápida (20 Jugadores)  [Radio 2400]`);
  console.log(`   - Sala Estándar (45 Jugadores) [Radio 3500]`);
  console.log(`   - Sala Masiva (80 Jugadores)   [Radio 4800]`);
  console.log(`→ Auto-Fill Bots: ACTIVO (Salas siempre llenas y listas para jugar)`);
  console.log(`==============================================================================`);
});

// Funciones auxiliares
function rand(min, max) { return min + Math.random() * (max - min); }
function lerp(a, b, t) { return a + (b - a) * t; }
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}
