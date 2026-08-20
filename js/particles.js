// Visual FX Engine: Sparks, Shockwaves, Smoke Trails, Debris & Floating Damage Numbers

export class ParticleSystem {
  constructor() {
    this.sparks = [];
    this.shockwaves = [];
    this.smoke = [];
    this.debris = [];
    this.damageTexts = [];
  }

  addDamageText(x, y, text, color = '#E74C3C') {
    this.damageTexts.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y - 18,
      text,
      color,
      alpha: 1.0,
      vy: -40 - Math.random() * 20
    });
  }

  addSparks(x, y, nx, ny, count = 8, color = '#F39C12') {
    const baseAngle = Math.atan2(ny, nx);
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.5;
      const speed = 120 + Math.random() * 200;
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color,
        length: 3 + Math.random() * 4
      });
    }
  }

  addShockwave(x, y, maxRadius = 75, color = '#E67E22') {
    this.shockwaves.push({
      x, y,
      radius: 4,
      maxRadius,
      color,
      alpha: 0.9
    });
  }

  addSmoke(x, y, radius = 3.5) {
    this.smoke.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      radius,
      alpha: 0.75,
      growth: 8 + Math.random() * 6
    });
  }

  addDebris(x, y, color = '#D9383A', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 240;
      this.debris.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 15,
        size: 5 + Math.random() * 7,
        alpha: 1.0,
        color: i % 2 === 0 ? color : '#2C3E50'
      });
    }
  }

  update(dt) {
    // 1. Floating Damage Numbers
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtText = this.damageTexts[i];
      dtText.y += dtText.vy * dt;
      dtText.alpha -= dt * 1.5;
      if (dtText.alpha <= 0) this.damageTexts.splice(i, 1);
    }

    // 2. Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= Math.pow(0.1, dt);
      s.vy *= Math.pow(0.1, dt);
      s.alpha -= dt * 3.5;
      if (s.alpha <= 0) this.sparks.splice(i, 1);
    }

    // 3. Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 14);
      sw.alpha -= dt * 2.2;
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    // 4. Smoke
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const sm = this.smoke[i];
      sm.radius += sm.growth * dt;
      sm.alpha -= dt * 1.8;
      if (sm.alpha <= 0) this.smoke.splice(i, 1);
    }

    // 5. Debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vrot * dt;
      d.vx *= Math.pow(0.2, dt);
      d.vy *= Math.pow(0.2, dt);
      d.vrot *= Math.pow(0.3, dt);
      d.alpha -= dt * 0.35;
      if (d.alpha <= 0) this.debris.splice(i, 1);
    }
  }

  render(ctx) {
    // Render Smoke
    for (const sm of this.smoke) {
      ctx.fillStyle = `rgba(180, 185, 190, ${sm.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render Shockwaves
    for (const sw of this.shockwaves) {
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Render Debris
    for (const d of this.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.strokeRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;

    // Render Sparks
    for (const s of this.sparks) {
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.lineWidth = 1.8;
      const speed = Math.hypot(s.vx, s.vy);
      const nx = speed > 0.001 ? s.vx / speed : 1;
      const ny = speed > 0.001 ? s.vy / speed : 0;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - nx * s.length, s.y - ny * s.length);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Render Floating Damage Numbers
    for (const dtText of this.damageTexts) {
      ctx.save();
      ctx.globalAlpha = dtText.alpha;
      ctx.fillStyle = dtText.color;
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(dtText.text, dtText.x, dtText.y);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }
}
