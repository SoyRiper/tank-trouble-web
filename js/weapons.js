import { Sound } from './audio.js';

export const WEAPON_TYPES = {
  STANDARD: { name: 'Cannon', ammo: -1, cooldown: 0.26, maxActive: 5, color: '#1C1E21' },
  MINIGUN: { name: 'Minigun', ammo: 35, cooldown: 0.05, maxActive: 25, color: '#E67E22' },
  HOMING_MISSILE: { name: 'Missile', ammo: 3, cooldown: 0.7, maxActive: 2, color: '#E74C3C' },
  LASER: { name: 'Laser', ammo: 4, cooldown: 0.5, maxActive: 1, color: '#1ABC9C' },
  FRAG_BOMB: { name: 'Frag Bomb', ammo: 3, cooldown: 0.8, maxActive: 2, color: '#D35400' },
  LANDMINE: { name: 'Landmine', ammo: 4, cooldown: 0.4, maxActive: 4, color: '#7F8C8D' },
  SHOTGUN: { name: 'Shotgun', ammo: 6, cooldown: 0.45, maxActive: 12, color: '#9B59B6' },
  PLASMA_ORB: { name: 'Plasma Orb', ammo: 2, cooldown: 1.1, maxActive: 1, color: '#2ECC71' },
  SHIELD: { name: 'Shield', ammo: 1, cooldown: 0.5, maxActive: 1, color: '#3498DB' },
  MEDKIT: { name: 'Medkit', ammo: 0, cooldown: 0.5, maxActive: 1, color: '#27AE60' }
};

export class Bullet {
  constructor(shooterId, x, y, dirX, dirY, speed = 420, isGatling = false, damage = 150) {
    this.shooterId = shooterId;
    this.x = x;
    this.y = y;
    this.vx = dirX * speed;
    this.vy = dirY * speed;
    this.speed = speed;
    this.damage = damage;
    this.radius = isGatling ? 3.2 : 4.5;
    this.maxBounces = isGatling ? 5 : 7;
    this.bounces = 0;
    this.life = 0;
    this.maxLife = isGatling ? 6.5 : 12.0;
    this.isGatling = isGatling;
    this.dead = false;
    this.color = '#1C1E21';
  }

  update(dt, maze, tanks, projectiles, particles) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.dead = true;
      return;
    }

    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      const nextX = this.x + this.vx * subDt;
      const nextY = this.y + this.vy * subDt;

      // 1. Tank Collision (Zero Self-Damage: Never hit shooter)
      for (const tank of tanks) {
        if (!tank.dead) {
          if (tank.id === this.shooterId) continue;
          const dist = Math.hypot(this.x - tank.x, this.y - tank.y);
          if (dist < this.radius + 13) {
            const isBank = this.bounces > 0;
            const finalDamage = isBank ? Math.round(this.damage * 1.35) : this.damage;
            tank.takeDamage(this.shooterId, this.isGatling ? 'Minigun' : 'Cannon', finalDamage, isBank, particles);
            particles.addSparks(this.x, this.y, -this.vx, -this.vy, 10, '#E74C3C');
            this.dead = true;
            return;
          }
        }
      }

      // 2. Wall Bounce Check
      let hit = null;
      let minFraction = 1.0;

      for (const w of maze.walls) {
        const col = this._checkRayVsSegment(this.x, this.y, nextX, nextY, w.x1, w.y1, w.x2, w.y2);
        if (col && col.fraction < minFraction) {
          minFraction = col.fraction;
          hit = col;
        }
      }

      if (hit) {
        this.x = hit.x;
        this.y = hit.y;

        const dot = this.vx * hit.nx + this.vy * hit.ny;
        this.vx = (this.vx - 2 * dot * hit.nx);
        this.vy = (this.vy - 2 * dot * hit.ny);

        this.x += hit.nx * (this.radius + 0.8);
        this.y += hit.ny * (this.radius + 0.8);

        this.bounces++;
        Sound.playRicochet();
        particles.addSparks(this.x, this.y, hit.nx, hit.ny, 6, '#F39C12');

        if (this.bounces >= this.maxBounces) {
          this.dead = true;
          return;
        }
      } else {
        this.x = nextX;
        this.y = nextY;
      }
    }
  }

  _checkRayVsSegment(x1, y1, x2, y2, wx1, wy1, wx2, wy2) {
    const dx = x2 - x1, dy = y2 - y1;
    const wdx = wx2 - wx1, wdy = wy2 - wy1;
    const denom = dx * wdy - dy * wdx;
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((wx1 - x1) * wdy - (wy1 - y1) * wdx) / denom;
    const u = ((wx1 - x1) * dy - (wy1 - y1) * dx) / denom;

    if (t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05) {
      const hitX = x1 + dx * t, hitY = y1 + dy * t;
      const wlen = Math.hypot(wdx, wdy);
      const nx = -wdy / wlen, ny = wdx / wlen;
      const dot = dx * nx + dy * ny;
      return { fraction: t, x: hitX, y: hitY, nx: dot < 0 ? nx : -nx, ny: dot < 0 ? ny : -ny };
    }
    return null;
  }

  render(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Missile {
  constructor(shooterId, x, y, dirX, dirY) {
    this.shooterId = shooterId;
    this.x = x;
    this.y = y;
    this.rot = Math.atan2(dirY, dirX);
    this.speed = 180;
    this.maxSpeed = 480;
    this.accel = 400;
    this.turnSpeed = 4.5;
    this.blastRadius = 95;
    this.damage = 400;
    this.life = 0;
    this.maxLife = 7.0;
    this.dead = false;
    Sound.playMissile();
  }

  update(dt, maze, tanks, projectiles, particles) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.explode(tanks, particles);
      return;
    }

    let target = null;
    let minDist = Infinity;
    for (const t of tanks) {
      if (!t.dead && t.id !== this.shooterId) {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d < minDist) {
          minDist = d;
          target = t;
        }
      }
    }

    if (target) {
      const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let diff = targetAngle - this.rot;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rot += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed * dt);
    }

    this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    const vx = Math.cos(this.rot) * this.speed;
    const vy = Math.sin(this.rot) * this.speed;

    const nextX = this.x + vx * dt;
    const nextY = this.y + vy * dt;

    if (Math.random() < 0.8) {
      particles.addSmoke(this.x - Math.cos(this.rot) * 10, this.y - Math.sin(this.rot) * 10);
    }

    for (const w of maze.walls) {
      if (this._distToSegment(nextX, nextY, w.x1, w.y1, w.x2, w.y2) < 8) {
        this.x = nextX;
        this.y = nextY;
        this.explode(tanks, particles);
        return;
      }
    }

    for (const t of tanks) {
      if (!t.dead) {
        if (t.id === this.shooterId) continue;
        if (Math.hypot(nextX - t.x, nextY - t.y) < 16) {
          this.x = nextX;
          this.y = nextY;
          this.explode(tanks, particles);
          return;
        }
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  explode(tanks, particles) {
    if (this.dead) return;
    this.dead = true;
    Sound.playExplosion(true);
    particles.addShockwave(this.x, this.y, this.blastRadius, '#E74C3C');
    particles.addDebris(this.x, this.y, '#E74C3C', 14);

    for (const t of tanks) {
      if (!t.dead && t.id !== this.shooterId) {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= this.blastRadius) {
          t.takeDamage(this.shooterId, 'Homing Missile', this.damage, false, particles);
        }
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(-8, -3, 14, 6);
    ctx.fillStyle = '#F39C12';
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.lineTo(10, 0);
    ctx.lineTo(6, 3);
    ctx.fill();

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(-8, -6, 4, 3);
    ctx.fillRect(-8, 3, 4, 3);

    ctx.fillStyle = 'rgba(243, 156, 18, 0.95)';
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-14 - Math.random() * 4, 0);
    ctx.lineTo(-8, 2);
    ctx.fill();

    ctx.restore();
  }
}

export class FragBomb {
  constructor(shooterId, x, y, dirX, dirY) {
    this.shooterId = shooterId;
    this.x = x;
    this.y = y;
    this.vx = dirX * 310;
    this.vy = dirY * 310;
    this.radius = 7;
    this.bounces = 0;
    this.life = 0;
    this.maxLife = 1.8;
    this.dead = false;
    Sound.playShoot();
  }

  update(dt, maze, tanks, projectiles, particles) {
    this.life += dt;
    if (this.life >= this.maxLife) {
      this.explode(projectiles, particles);
      return;
    }

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    for (const w of maze.walls) {
      const col = this._checkRayVsSegment(this.x, this.y, nextX, nextY, w.x1, w.y1, w.x2, w.y2);
      if (col) {
        const dot = this.vx * col.nx + this.vy * col.ny;
        this.vx = (this.vx - 2 * dot * col.nx) * 0.85;
        this.vy = (this.vy - 2 * dot * col.ny) * 0.85;
        this.x = col.x + col.nx * 8;
        this.y = col.y + col.ny * 8;
        Sound.playRicochet();
        this.bounces++;
        return;
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  explode(projectiles, particles) {
    if (this.dead) return;
    this.dead = true;
    Sound.playExplosion(true);
    particles.addShockwave(this.x, this.y, 85, '#D35400');
    particles.addDebris(this.x, this.y, '#D35400', 14);

    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = 380 + Math.random() * 90;
      const b = new Bullet(this.shooterId, this.x, this.y, Math.cos(angle), Math.sin(angle), speed, true, 55);
      b.maxLife = 5.0;
      projectiles.push(b);
    }
  }

  _checkRayVsSegment(x1, y1, x2, y2, wx1, wy1, wx2, wy2) {
    const dx = x2 - x1, dy = y2 - y1;
    const wdx = wx2 - wx1, wdy = wy2 - wy1;
    const denom = dx * wdy - dy * wdx;
    if (Math.abs(denom) < 0.0001) return null;
    const t = ((wx1 - x1) * wdy - (wy1 - y1) * wdx) / denom;
    const u = ((wx1 - x1) * dy - (wy1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05) {
      const hitX = x1 + dx * t, hitY = y1 + dy * t;
      const wlen = Math.hypot(wdx, wdy);
      const nx = -wdy / wlen, ny = wdx / wlen;
      const dot = dx * nx + dy * ny;
      return { fraction: t, x: hitX, y: hitY, nx: dot < 0 ? nx : -nx, ny: dot < 0 ? ny : -ny };
    }
    return null;
  }

  render(ctx) {
    ctx.fillStyle = '#D35400';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F39C12';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Landmine {
  constructor(shooterId, x, y) {
    this.shooterId = shooterId;
    this.x = x;
    this.y = y;
    this.armTimer = 0.5;
    this.life = 0;
    this.maxLife = 35.0;
    this.blastRadius = 90;
    this.damage = 480;
    this.dead = false;
    Sound.playRicochet();
  }

  update(dt, maze, tanks, projectiles, particles) {
    this.life += dt;
    if (this.armTimer > 0) this.armTimer -= dt;

    if (this.life >= this.maxLife) {
      this.explode(tanks, particles);
      return;
    }

    if (this.armTimer <= 0) {
      for (const t of tanks) {
        if (!t.dead && t.id !== this.shooterId) {
          if (Math.hypot(t.x - this.x, t.y - this.y) < 26) {
            this.explode(tanks, particles);
            return;
          }
        }
      }
    }
  }

  explode(tanks, particles) {
    if (this.dead) return;
    this.dead = true;
    Sound.playExplosion(true);
    particles.addShockwave(this.x, this.y, this.blastRadius, '#E74C3C');
    particles.addDebris(this.x, this.y, '#7F8C8D', 12);

    for (const t of tanks) {
      if (!t.dead && t.id !== this.shooterId) {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= this.blastRadius) {
          t.takeDamage(this.shooterId, 'C4 Landmine', this.damage, false, particles);
        }
      }
    }
  }

  render(ctx) {
    const pulse = Math.sin(this.life * 8) * 0.5 + 0.5;
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.armTimer > 0 ? '#F39C12' : `rgba(231, 76, 60, ${pulse * 0.8 + 0.2})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class PlasmaOrb {
  constructor(shooterId, x, y, dirX, dirY) {
    this.shooterId = shooterId;
    this.x = x;
    this.y = y;
    this.vx = dirX * 170;
    this.vy = dirY * 170;
    this.radius = 11;
    this.life = 0;
    this.maxLife = 5.0;
    this.zapTimer = 0;
    this.dead = false;
    Sound.playPlasma();
  }

  update(dt, maze, tanks, projectiles, particles) {
    this.life += dt;
    this.zapTimer += dt;

    if (this.life >= this.maxLife) {
      this.explode(tanks, particles);
      return;
    }

    if (this.zapTimer > 0.18) {
      this.zapTimer = 0;
      for (const t of tanks) {
        if (!t.dead && t.id !== this.shooterId) {
          const dist = Math.hypot(t.x - this.x, t.y - this.y);
          if (dist < 180) {
            t.takeDamage(this.shooterId, 'Plasma Zap', 50, false, particles);
            Sound.playPlasma();
            particles.addSparks(t.x, t.y, 0, -1, 6, '#2ECC71');
          }
        }
      }
    }

    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;

    for (const w of maze.walls) {
      const col = this._checkRayVsSegment(this.x, this.y, nextX, nextY, w.x1, w.y1, w.x2, w.y2);
      if (col) {
        this.explode(tanks, particles);
        return;
      }
    }

    this.x = nextX;
    this.y = nextY;
  }

  explode(tanks, particles) {
    if (this.dead) return;
    this.dead = true;
    Sound.playExplosion(true);
    particles.addShockwave(this.x, this.y, 115, '#2ECC71');
    particles.addDebris(this.x, this.y, '#2ECC71', 14);

    for (const t of tanks) {
      if (!t.dead && t.id !== this.shooterId) {
        const d = Math.hypot(t.x - this.x, t.y - this.y);
        if (d <= 115) {
          t.takeDamage(this.shooterId, 'BFG Plasma Orb', 380, false, particles);
        }
      }
    }
  }

  _checkRayVsSegment(x1, y1, x2, y2, wx1, wy1, wx2, wy2) {
    const dx = x2 - x1, dy = y2 - y1;
    const wdx = wx2 - wx1, wdy = wy2 - wy1;
    const denom = dx * wdy - dy * wdx;
    if (Math.abs(denom) < 0.0001) return null;
    const t = ((wx1 - x1) * wdy - (wy1 - y1) * wdx) / denom;
    const u = ((wx1 - x1) * dy - (wy1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05) {
      const hitX = x1 + dx * t, hitY = y1 + dy * t;
      const wlen = Math.hypot(wdx, wdy);
      const nx = -wdy / wlen, ny = wdx / wlen;
      const dot = dx * nx + dy * ny;
      return { fraction: t, x: hitX, y: hitY, nx: dot < 0 ? nx : -nx, ny: dot < 0 ? ny : -ny };
    }
    return null;
  }

  render(ctx) {
    const pulse = Math.sin(this.life * 14) * 2;
    const r = this.radius + pulse;

    ctx.fillStyle = 'rgba(46, 204, 113, 0.35)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class LaserBeam {
  constructor(shooterId, startX, startY, dirX, dirY, maze, tanks, particles) {
    this.shooterId = shooterId;
    this.life = 0.35;
    this.maxLife = 0.35;
    this.points = [{ x: startX, y: startY }];
    this.dead = false;

    Sound.playLaser();

    let curX = startX;
    let curY = startY;
    let vx = dirX;
    let vy = dirY;
    let remainingDist = 2600;

    for (let bounce = 0; bounce < 4; bounce++) {
      let minT = remainingDist;
      let hitNx = 0, hitNy = 0;
      let nextX = curX + vx * remainingDist;
      let nextY = curY + vy * remainingDist;

      for (const w of maze.walls) {
        const col = this._raySegment(curX, curY, nextX, nextY, w.x1, w.y1, w.x2, w.y2);
        if (col && col.dist < minT && col.dist > 2.0) {
          minT = col.dist;
          hitNx = col.nx;
          hitNy = col.ny;
        }
      }

      const hitX = curX + vx * minT;
      const hitY = curY + vy * minT;
      this.points.push({ x: hitX, y: hitY });

      for (const t of tanks) {
        if (!t.dead) {
          if (t.id === shooterId) continue;
          const dist = this._distToSeg(t.x, t.y, curX, curY, hitX, hitY);
          if (dist < 18) {
            t.takeDamage(shooterId, 'Death Ray Laser', 320, bounce > 0, particles);
            particles.addSparks(t.x, t.y, -vx, -vy, 14, '#1ABC9C');
          }
        }
      }

      remainingDist -= minT;
      if (remainingDist <= 5) break;

      const dot = vx * hitNx + vy * hitNy;
      vx = vx - 2 * dot * hitNx;
      vy = vy - 2 * dot * hitNy;
      curX = hitX + hitNx * 2.0;
      curY = hitY + hitNy * 2.0;
    }
  }

  _raySegment(p1x, p1y, p2x, p2y, w1x, w1y, w2x, w2y) {
    const dx1 = p2x - p1x, dy1 = p2y - p1y;
    const dx2 = w2x - w1x, dy2 = w2y - w1y;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((w1x - p1x) * dy2 - (w1y - p1y) * dx2) / denom;
    const u = ((w1x - p1x) * dy1 - (w1y - p1y) * dx1) / denom;
    if (t > 0 && t <= 1 && u >= 0 && u <= 1) {
      const dist = Math.hypot(dx1 * t, dy1 * t);
      const wlen = Math.hypot(dx2, dy2);
      const nx = -dy2 / wlen, ny = dx2 / wlen;
      const dot = dx1 * nx + dy1 * ny;
      return { dist, nx: dot < 0 ? nx : -nx, ny: dot < 0 ? ny : -ny };
    }
    return null;
  }

  _distToSeg(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.strokeStyle = `rgba(26, 188, 156, ${alpha * 0.9})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < this.points.length; i++) {
      if (i === 0) ctx.moveTo(this.points[i].x, this.points[i].y);
      else ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}

export class Crate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const types = ['MINIGUN', 'HOMING_MISSILE', 'LASER', 'FRAG_BOMB', 'LANDMINE', 'SHOTGUN', 'PLASMA_ORB', 'SHIELD', 'MEDKIT'];
    this.type = types[Math.floor(Math.random() * types.length)];
    this.config = WEAPON_TYPES[this.type];
    this.dead = false;
    this.bob = Math.random() * Math.PI * 2;
    this.life = 0;
  }

  update(dt, tanks, particles) {
    this.bob += dt * 3.5;
    this.life += dt;

    for (const tank of tanks) {
      if (!tank.dead) {
        if (Math.hypot(this.x - tank.x, this.y - tank.y) < 22) {
          if (this.type === 'MEDKIT') {
            tank.heal(350, particles);
            Sound.playPowerup();
          } else {
            tank.equipWeapon(this.type);
            Sound.playPowerup();
            particles.addSparks(this.x, this.y, 0, -1, 14, this.config.color);
          }
          this.dead = true;
          return;
        }
      }
    }
  }

  render(ctx) {
    const offY = Math.sin(this.bob) * 2.5;
    ctx.save();
    ctx.translate(this.x, this.y + offY);

    ctx.fillStyle = this.config.color;
    ctx.fillRect(-11, -11, 22, 22);

    ctx.strokeStyle = '#1C1E21';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-11, -11, 22, 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '📦';
    if (this.type === 'MINIGUN') icon = '🔫';
    if (this.type === 'HOMING_MISSILE') icon = '🚀';
    if (this.type === 'LASER') icon = '⚡';
    if (this.type === 'FRAG_BOMB') icon = '💣';
    if (this.type === 'LANDMINE') icon = '💥';
    if (this.type === 'SHOTGUN') icon = '💢';
    if (this.type === 'PLASMA_ORB') icon = '🔮';
    if (this.type === 'SHIELD') icon = '🛡️';
    if (this.type === 'MEDKIT') icon = '❤️';

    ctx.fillText(icon, 0, 0);
    ctx.restore();
  }
}
