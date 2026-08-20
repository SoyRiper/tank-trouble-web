import { Sound } from './audio.js';
import { WEAPON_TYPES, Bullet, Missile, LaserBeam, FragBomb, Landmine, PlasmaOrb } from './weapons.js';
import { Customizer } from './customizer.js';

export class Tank {
  constructor(id, name, color, isAI = false, chassis = 'classic', decal = 'none', isRemote = false) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.isAI = isAI;
    this.isRemote = isRemote;
    this.chassis = chassis;
    this.decal = decal;

    this.x = 0;
    this.y = 0;
    this.rot = 0;
    this.vx = 0;
    this.vy = 0;

    this.maxSpeed = 200;
    this.maxRevSpeed = 130;
    this.accel = 920;
    this.friction = 750;
    this.turnSpeed = 4.4;

    this.maxHp = 1000;
    this.hp = 1000;
    this.damageFlash = 0;

    this.dead = false;
    this.hasShield = false;
    this.shieldRot = 0;
    this.recoil = 0;
    this.muzzleFlash = 0;

    this.weapon = 'STANDARD';
    this.ammo = -1;
    this.cooldown = 0;

    this.treadMarks = [];
    this.treadTimer = 0;

    // AI Intent reporting for overhead badges
    this.aiIntent = '';
    this.aiIntentColor = '#1C1E21';

    // Emote Bubble
    this.emote = '';
    this.emoteTimer = 0;
  }

  reset(x, y, rot) {
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.vx = 0;
    this.vy = 0;
    this.maxHp = 1000;
    this.hp = 1000;
    this.damageFlash = 0;
    this.dead = false;
    this.hasShield = false;
    this.recoil = 0;
    this.muzzleFlash = 0;
    this.weapon = 'STANDARD';
    this.ammo = -1;
    this.cooldown = 0;
    this.treadMarks = [];
    this.aiIntent = '';
    this.emote = '';
    this.emoteTimer = 0;
  }

  showEmote(emoji) {
    this.emote = emoji;
    this.emoteTimer = 2.4;
    Sound.playRicochet();
  }

  setCustomization(name, color, chassis, decal) {
    this.name = name;
    this.color = color;
    this.chassis = chassis;
    this.decal = decal;
  }

  equipWeapon(type) {
    this.weapon = type;
    this.ammo = WEAPON_TYPES[type].ammo;
    this.cooldown = 0.1;
    if (type === 'SHIELD') this.hasShield = true;
  }

  heal(amount, particles) {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = this.hp - oldHp;
    if (particles) {
      particles.addDamageText(this.x, this.y - 10, `+${healed} HP`, '#2ECC71');
      particles.addSparks(this.x, this.y, 0, -1, 12, '#2ECC71');
    }
  }

  update(dt, steerInput, driveInput, shootInput, maze, projectiles, particles) {
    if (this.dead) return;

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
    if (this.damageFlash > 0) this.damageFlash -= dt;
    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) this.emote = '';
    }

    this.recoil = Math.max(0, this.recoil - dt * 35);
    if (this.hasShield) this.shieldRot += dt * 4;

    if (this.isRemote) return;

    // 1. Steering
    this.rot += steerInput * this.turnSpeed * dt;

    // 2. Drive & Propulsion
    const fwdX = Math.cos(this.rot);
    const fwdY = Math.sin(this.rot);
    let targetSpeed = 0;
    if (driveInput > 0) targetSpeed = this.maxSpeed * driveInput;
    else if (driveInput < 0) targetSpeed = this.maxRevSpeed * driveInput;

    const curSpeed = this.vx * fwdX + this.vy * fwdY;
    let nextSpeed = curSpeed;
    if (driveInput !== 0) {
      if (nextSpeed < targetSpeed) nextSpeed = Math.min(targetSpeed, nextSpeed + this.accel * dt);
      else if (nextSpeed > targetSpeed) nextSpeed = Math.max(targetSpeed, nextSpeed - this.accel * dt);
    } else {
      if (nextSpeed > 0) nextSpeed = Math.max(0, nextSpeed - this.friction * dt);
      else if (nextSpeed < 0) nextSpeed = Math.min(0, nextSpeed + this.friction * dt);
    }

    this.vx = fwdX * nextSpeed;
    this.vy = fwdY * nextSpeed;

    // 3. Movement with Sliding Wall Collisions
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const radius = 13.5;

    for (const w of maze.walls) {
      const closest = this._closestPointOnSegment(this.x, this.y, w.x1, w.y1, w.x2, w.y2);
      const distX = this.x - closest.x;
      const distY = this.y - closest.y;
      const dist = Math.hypot(distX, distY);

      if (dist < radius && dist > 0.001) {
        const overlap = radius - dist;
        const nx = distX / dist;
        const ny = distY / dist;
        this.x += nx * overlap;
        this.y += ny * overlap;

        const dot = this.vx * nx + this.vy * ny;
        if (dot < 0) {
          this.vx -= dot * nx;
          this.vy -= dot * ny;
        }
      }
    }

    this.x = Math.max(radius + 2, Math.min(maze.width - radius - 2, this.x));
    this.y = Math.max(radius + 2, Math.min(maze.height - radius - 2, this.y));

    // 4. Tread Marks
    if (Math.abs(nextSpeed) > 10 || Math.abs(steerInput) > 0.1) {
      this.treadTimer += dt;
      if (this.treadTimer > 0.07) {
        this.treadTimer = 0;
        this.treadMarks.push({ x: this.x, y: this.y, rot: this.rot, alpha: 0.45 });
        if (this.treadMarks.length > 40) this.treadMarks.shift();
      }
    }

    for (let i = this.treadMarks.length - 1; i >= 0; i--) {
      this.treadMarks[i].alpha -= dt * 0.08;
      if (this.treadMarks[i].alpha <= 0) this.treadMarks.splice(i, 1);
    }

    // 5. Fire Weapons
    if (shootInput && this.cooldown <= 0) {
      this.fire(projectiles, maze, particles);
    }
  }

  fire(projectiles, maze, particles, onFiredCallback = null) {
    const fwdX = Math.cos(this.rot);
    const fwdY = Math.sin(this.rot);
    const muzzleX = this.x + fwdX * 22;
    const muzzleY = this.y + fwdY * 22;

    const wConfig = WEAPON_TYPES[this.weapon];
    this.cooldown = wConfig.cooldown;
    this.recoil = 5.5;
    this.muzzleFlash = 0.07;

    switch (this.weapon) {
      case 'STANDARD':
        Sound.playShoot();
        projectiles.push(new Bullet(this.id, muzzleX, muzzleY, fwdX, fwdY, 410, false, 50));
        break;
      case 'MINIGUN':
        Sound.playGatling();
        const spread = (Math.random() - 0.5) * 0.22;
        const sDirX = Math.cos(this.rot + spread);
        const sDirY = Math.sin(this.rot + spread);
        projectiles.push(new Bullet(this.id, muzzleX, muzzleY, sDirX, sDirY, 500, true, 22));
        break;
      case 'HOMING_MISSILE':
        projectiles.push(new Missile(this.id, muzzleX, muzzleY, fwdX, fwdY));
        break;
      case 'LASER':
        projectiles.push(new LaserBeam(this.id, muzzleX, muzzleY, fwdX, fwdY, maze, this._getAllTanks(), particles));
        break;
      case 'FRAG_BOMB':
        projectiles.push(new FragBomb(this.id, muzzleX, muzzleY, fwdX, fwdY));
        break;
      case 'LANDMINE':
        projectiles.push(new Landmine(this.id, this.x - fwdX * 20, this.y - fwdY * 20));
        break;
      case 'SHOTGUN':
        Sound.playShotgun();
        for (let i = 0; i < 7; i++) {
          const off = (i - 3) * 0.08 + (Math.random() - 0.5) * 0.04;
          const px = Math.cos(this.rot + off);
          const py = Math.sin(this.rot + off);
          projectiles.push(new Bullet(this.id, muzzleX, muzzleY, px, py, 400 + Math.random() * 60, false, 30));
        }
        break;
      case 'PLASMA_ORB':
        projectiles.push(new PlasmaOrb(this.id, muzzleX, muzzleY, fwdX, fwdY));
        break;
      case 'SHIELD':
        this.hasShield = true;
        Sound.playShield();
        break;
    }

    if (onFiredCallback) {
      onFiredCallback(muzzleX, muzzleY, fwdX, fwdY, this.weapon);
    }

    if (this.ammo > 0) {
      this.ammo--;
      if (this.ammo === 0) {
        this.weapon = 'STANDARD';
        this.ammo = -1;
      }
    }
  }

  takeDamage(killerId, weaponName = 'Cannon', damageAmount = 50, isBank = false, particles = null) {
    if (this.dead) return;

    if (this.hasShield) {
      this.hasShield = false;
      Sound.playShield();
      if (particles) particles.addDamageText(this.x, this.y - 12, 'BLOCKED!', '#3498DB');
      return;
    }

    this.damageFlash = 0.12;
    this.hp = Math.max(0, this.hp - damageAmount);

    if (particles) {
      const text = isBank ? `-${damageAmount} CRIT!` : `-${damageAmount}`;
      particles.addDamageText(this.x, this.y - 12, text, isBank ? '#F1C40F' : '#E74C3C');
    }

    if (this.hp <= 0) {
      this.dead = true;
      Sound.playExplosion(true);

      if (this.onKillCallback) {
        this.onKillCallback(killerId, this.id, weaponName, isBank);
      }
    } else {
      Sound.playRicochet();
    }
  }

  _closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { x: x1, y: y1 };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }

  _getAllTanks() {
    return window.activeGameTanks || [];
  }

  render(ctx) {
    // 1. Tread Decals
    for (const tm of this.treadMarks) {
      ctx.save();
      ctx.translate(tm.x, tm.y);
      ctx.rotate(tm.rot);
      ctx.fillStyle = `rgba(30, 35, 42, ${tm.alpha * 0.35})`;
      ctx.fillRect(-13, -12, 26, 4);
      ctx.fillRect(-13, 8, 26, 4);
      ctx.restore();
    }

    if (this.dead) return;

    // 2. Health Bar with 1000 HP
    const hpRatio = this.hp / this.maxHp;
    const barW = 34;
    const barH = 5;
    const barX = this.x - barW / 2;
    const barY = this.y - 25;

    ctx.fillStyle = 'rgba(28, 30, 33, 0.88)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    ctx.fillStyle = hpRatio > 0.5 ? this.color : (hpRatio > 0.25 ? '#F39C12' : '#E74C3C');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    // 3. Pilot Name Tag Above HP
    ctx.fillStyle = '#1C1E21';
    ctx.font = 'bold 9px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.name.toUpperCase()} (${Math.ceil(this.hp)})`, this.x, barY - 3);

    // 4. Overhead AI Intent Badge (for bots)
    if (this.isAI && this.aiIntent) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = this.aiIntentColor || '#1C1E21';
      ctx.lineWidth = 1;
      const badgeW = 90;
      ctx.fillRect(this.x - badgeW / 2, barY - 24, badgeW, 14);
      ctx.strokeRect(this.x - badgeW / 2, barY - 24, badgeW, 14);

      ctx.fillStyle = this.aiIntentColor || '#1C1E21';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.aiIntent, this.x, barY - 14);
      ctx.restore();
    }

    // 5. Overhead Emote Speech Bubble (Crisp & High-Contrast for GG and Emojis)
    if (this.emote) {
      ctx.save();
      const bubbleY = barY - (this.isAI && this.aiIntent ? 44 : 30);
      const isText = this.emote === 'GG';
      const bubbleW = isText ? 32 : 26;
      const bubbleH = 22;

      // Bubble Body
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1C1E21';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(this.x - bubbleW / 2, bubbleY - bubbleH / 2, bubbleW, bubbleH, 6);
      ctx.fill();
      ctx.stroke();

      // Bubble Tail
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(this.x - 3, bubbleY + bubbleH / 2 - 0.5);
      ctx.lineTo(this.x, bubbleY + bubbleH / 2 + 5);
      ctx.lineTo(this.x + 3, bubbleY + bubbleH / 2 - 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#1C1E21';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(this.x - 3, bubbleY + bubbleH / 2 - 0.5);
      ctx.lineTo(this.x, bubbleY + bubbleH / 2 + 5);
      ctx.lineTo(this.x + 3, bubbleY + bubbleH / 2 - 0.5);
      ctx.stroke();

      // Render Emote / Text explicitly in Dark Color
      ctx.fillStyle = '#1C1E21';
      ctx.font = isText ? 'bold 12px "Space Grotesk", sans-serif' : '13px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emote, this.x, bubbleY);
      ctx.restore();
    }

    // 6. Shield Aura
    if (this.hasShield) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, this.shieldRot, this.shieldRot + Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Custom Tank Chassis & Decals
    Customizer.renderCustomTank(
      ctx,
      this.x,
      this.y,
      this.rot,
      this.color,
      this.chassis,
      this.decal,
      this.damageFlash > 0,
      this.recoil,
      this.muzzleFlash
    );
  }
}
