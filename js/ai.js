// Ultra-Smart A* Pathfinding with Intent Reporting & Bot Personalities

export class AIBot {
  constructor(tank, personality = 'LAIKA') {
    this.tank = tank;
    this.personality = personality; // LAIKA (Sniper), ARES (Berserker), NEXUS (Looter)

    this.steerInput = 0;
    this.driveInput = 0;
    this.shootInput = false;

    this.aimAngle = 0;
    this.decisionTimer = 0;
    this.repathTimer = 0;
    this.path = [];
    this.pathIndex = 0;

    this.strafeDir = 1;
    this.stuckTimer = 0;
    this.unstuckTimer = 0;
    this.lastPos = { x: 0, y: 0 };
  }

  update(dt, maze, tanks, projectiles, crates) {
    if (this.tank.dead) {
      this.steerInput = 0;
      this.driveInput = 0;
      this.shootInput = false;
      this.tank.aiIntent = '';
      return;
    }

    this.decisionTimer -= dt;
    this.repathTimer -= dt;

    // 1. Unstuck Reflex
    if (this.unstuckTimer > 0) {
      this.unstuckTimer -= dt;
      this.driveInput = -0.9;
      this.steerInput = 1.0;
      this.tank.aiIntent = '🔄 DESATASCANDO';
      this.tank.aiIntentColor = '#E67E22';
      return;
    }

    const movedDist = Math.hypot(this.tank.x - this.lastPos.x, this.tank.y - this.lastPos.y);
    this.lastPos = { x: this.tank.x, y: this.tank.y };

    if (Math.abs(this.driveInput) > 0.5 && movedDist < 2.5 * dt * 60) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.22) {
        this.stuckTimer = 0;
        this.unstuckTimer = 0.35;
        this.tank.aiIntent = '🔄 REPOSICIÓN';
        this.tank.aiIntentColor = '#E67E22';
        return;
      }
    } else {
      this.stuckTimer = Math.max(0, this.stuckTimer - dt);
    }

    // 2. High-Speed Decision Loop
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.033;
      this._evaluateDecisions(maze, tanks, projectiles, crates);
    }

    // 3. Proportional Steering
    let angleDiff = this.aimAngle - this.tank.rot;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    if (Math.abs(angleDiff) > 0.05) {
      this.steerInput = Math.sign(angleDiff) * Math.min(1.0, Math.abs(angleDiff) * 8.0);
    } else {
      this.steerInput = 0;
    }
  }

  _evaluateDecisions(maze, tanks, projectiles, crates) {
    this.shootInput = false;

    // 1. BULLET THREAT EVASION
    const threat = this._findIncomingThreat(projectiles);
    if (threat) {
      this._executeEmergencyDodge(threat, maze);
      this.tank.aiIntent = '🏃 ESQUIVANDO BALA';
      this.tank.aiIntentColor = '#2980B9';
      return;
    }

    // 2. Find Enemy Target
    let targetTank = null;
    let minDist = Infinity;
    for (const t of tanks) {
      if (!t.dead && t.id !== this.tank.id) {
        const d = Math.hypot(t.x - this.tank.x, t.y - this.tank.y);
        if (d < minDist) {
          minDist = d;
          targetTank = t;
        }
      }
    }

    // 3. Find Crate
    let targetCrate = null;
    const shouldLoot = this.personality === 'NEXUS' || this.tank.weapon === 'STANDARD' || this.tank.hp < 400;
    if (shouldLoot && crates.length > 0) {
      let minCDist = Infinity;
      for (const c of crates) {
        if (!c.dead) {
          const d = Math.hypot(c.x - this.tank.x, c.y - this.tank.y);
          if (d < minCDist) {
            minCDist = d;
            targetCrate = c;
          }
        }
      }
    }

    let destination = null;
    if (targetCrate) {
      destination = { x: targetCrate.x, y: targetCrate.y };
      this.tank.aiIntent = '📦 BUSCANDO CAJA';
      this.tank.aiIntentColor = '#27AE60';
    } else if (targetTank) {
      destination = { x: targetTank.x, y: targetTank.y };
    }

    if (!destination) {
      this.driveInput = 0;
      this.tank.aiIntent = '🛡️ PATRULLANDO';
      this.tank.aiIntentColor = '#7F8C8D';
      return;
    }

    // 4. Combat & Trick Shots
    if (targetTank) {
      const dist = Math.hypot(targetTank.x - this.tank.x, targetTank.y - this.tank.y);
      const leadTime = dist / 410;
      const predX = targetTank.x + targetTank.vx * leadTime;
      const predY = targetTank.y + targetTank.vy * leadTime;

      if (this._hasClearLOS(this.tank.x, this.tank.y, predX, predY, maze)) {
        this.aimAngle = Math.atan2(predY - this.tank.y, predX - this.tank.x);
        let angleError = Math.abs(this.aimAngle - this.tank.rot);
        while (angleError > Math.PI) angleError = Math.abs(angleError - Math.PI * 2);

        if (angleError < 0.28 && !this._isPointBlankBlocked(maze)) {
          this.shootInput = true;
          this.tank.aiIntent = '🎯 DISPARO DIRECTO';
          this.tank.aiIntentColor = '#D9383A';
        } else {
          this.tank.aiIntent = '⚔️ APUNTANDO ENEMIGO';
          this.tank.aiIntentColor = '#E74C3C';
        }

        if (dist > 190) this._followPathTo(destination, 1.0, maze);
        else if (dist < 80) this.driveInput = -0.7;
        else this.driveInput = 0.3;
        return;
      } else {
        const bankAngle = this._solveBankShot(targetTank, maze);
        if (bankAngle !== null) {
          this.aimAngle = bankAngle;
          let angleError = Math.abs(this.aimAngle - this.tank.rot);
          while (angleError > Math.PI) angleError = Math.abs(angleError - Math.PI * 2);
          if (angleError < 0.22 && !this._isPointBlankBlocked(maze)) {
            this.shootInput = true;
            this.tank.aiIntent = '🎯 TRICK SHOT (2-REBOTES)';
            this.tank.aiIntentColor = '#F39C12';
          } else {
            this.tank.aiIntent = '🎯 CALCULANDO REBOTE';
            this.tank.aiIntentColor = '#F1C40F';
          }
          this.driveInput = 0.0;
          return;
        }
      }
    }

    // 5. Navigate Path
    this._followPathTo(destination, 1.0, maze);
    if (!this.tank.aiIntent) {
      this.tank.aiIntent = '⚔️ CAZANDO';
      this.tank.aiIntentColor = '#8E44AD';
    }
  }

  _findIncomingThreat(projectiles) {
    for (const p of projectiles) {
      if (!p.dead && p.shooterId !== this.tank.id) {
        const dist = Math.hypot(p.x - this.tank.x, p.y - this.tank.y);
        if (dist < 280) {
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 50) {
            const futureX = p.x + (p.vx / speed) * 320;
            const futureY = p.y + (p.vy / speed) * 320;
            const closest = this._closestPointOnSeg(this.tank.x, this.tank.y, p.x, p.y, futureX, futureY);
            const missDist = Math.hypot(this.tank.x - closest.x, this.tank.y - closest.y);

            if (missDist < 36) {
              return p;
            }
          }
        }
      }
    }
    return null;
  }

  _executeEmergencyDodge(threat, maze) {
    const speed = Math.hypot(threat.vx, threat.vy);
    const nx = threat.vx / speed;
    const ny = threat.vy / speed;

    const toTankX = this.tank.x - threat.x;
    const toTankY = this.tank.y - threat.y;

    let perpX = -ny;
    let perpY = nx;

    const cross = nx * toTankY - ny * toTankX;
    if (cross < 0) {
      perpX = -perpX;
      perpY = -perpY;
    }

    const forwardX = Math.cos(this.tank.rot);
    const forwardY = Math.sin(this.tank.rot);
    const facingBulletDot = forwardX * (-nx) + forwardY * (-ny);

    if (facingBulletDot > 0.7) {
      this.driveInput = -1.0;
      this.aimAngle = Math.atan2(perpY, perpX);
    } else {
      this.aimAngle = Math.atan2(perpY, perpX);
      this.driveInput = 1.0;
    }
  }

  _isPointBlankBlocked(maze) {
    const fwdX = Math.cos(this.tank.rot);
    const fwdY = Math.sin(this.tank.rot);
    const muzzleX = this.tank.x + fwdX * 22;
    const muzzleY = this.tank.y + fwdY * 22;
    const checkX = muzzleX + fwdX * 36;
    const checkY = muzzleY + fwdY * 36;

    for (const w of maze.walls) {
      if (this._segmentsIntersect(muzzleX, muzzleY, checkX, checkY, w.x1, w.y1, w.x2, w.y2)) {
        return true;
      }
    }
    return false;
  }

  _followPathTo(target, speed, maze) {
    if (this._hasClearLOS(this.tank.x, this.tank.y, target.x, target.y, maze)) {
      this.aimAngle = Math.atan2(target.y - this.tank.y, target.x - this.tank.x);
      this.driveInput = speed;
      return;
    }

    if (this.repathTimer <= 0 || this.path.length === 0) {
      this.repathTimer = 0.25;
      this.path = this._computeAStar(this.tank.x, this.tank.y, target.x, target.y, maze);
      this.pathIndex = 1;
    }

    if (this.path && this.pathIndex < this.path.length) {
      const waypoint = this.path[this.pathIndex];
      const dist = Math.hypot(waypoint.x - this.tank.x, waypoint.y - this.tank.y);

      if (dist < 30) {
        this.pathIndex++;
        if (this.pathIndex < this.path.length) {
          const nextW = this.path[this.pathIndex];
          this.aimAngle = Math.atan2(nextW.y - this.tank.y, nextW.x - this.tank.x);
        }
      } else {
        this.aimAngle = Math.atan2(waypoint.y - this.tank.y, waypoint.x - this.tank.x);
      }
      this.driveInput = speed;
    } else {
      this.aimAngle = Math.atan2(target.y - this.tank.y, target.x - this.tank.x);
      this.driveInput = speed;
    }
  }

  _computeAStar(startX, startY, endX, endY, maze) {
    const startCell = {
      x: Math.max(0, Math.min(maze.cols - 1, Math.floor(startX / maze.cellW))),
      y: Math.max(0, Math.min(maze.rows - 1, Math.floor(startY / maze.cellH)))
    };
    const endCell = {
      x: Math.max(0, Math.min(maze.cols - 1, Math.floor(endX / maze.cellW))),
      y: Math.max(0, Math.min(maze.rows - 1, Math.floor(endY / maze.cellH)))
    };

    const key = (c) => `${c.x},${c.y}`;
    const openSet = [startCell];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(key(startCell), 0);
    fScore.set(key(startCell), Math.hypot(startCell.x - endCell.x, startCell.y - endCell.y));

    while (openSet.length > 0) {
      let currentIdx = 0;
      let lowestF = Infinity;
      for (let i = 0; i < openSet.length; i++) {
        const score = fScore.get(key(openSet[i])) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentIdx = i;
        }
      }

      const current = openSet.splice(currentIdx, 1)[0];
      if (current.x === endCell.x && current.y === endCell.y) {
        const path = [];
        let currKey = key(current);
        while (cameFrom.has(currKey)) {
          const c = cameFrom.get(currKey);
          path.unshift({
            x: (c.x + 0.5) * maze.cellW,
            y: (c.y + 0.5) * maze.cellH
          });
          currKey = key(c);
        }
        path.push({ x: (endCell.x + 0.5) * maze.cellW, y: (endCell.y + 0.5) * maze.cellH });
        return path;
      }

      const cell = maze.grid[current.x][current.y];
      const neighbors = [];
      if (!cell.walls[0] && current.y > 0) neighbors.push({ x: current.x, y: current.y - 1 });
      if (!cell.walls[1] && current.x < maze.cols - 1) neighbors.push({ x: current.x + 1, y: current.y });
      if (!cell.walls[2] && current.y < maze.rows - 1) neighbors.push({ x: current.x, y: current.y + 1 });
      if (!cell.walls[3] && current.x > 0) neighbors.push({ x: current.x - 1, y: current.y });

      for (const n of neighbors) {
        const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
        if (tentativeG < (gScore.get(key(n)) ?? Infinity)) {
          cameFrom.set(key(n), current);
          gScore.set(key(n), tentativeG);
          fScore.set(key(n), tentativeG + Math.hypot(n.x - endCell.x, n.y - endCell.y));
          if (!openSet.some(c => c.x === n.x && c.y === n.y)) {
            openSet.push(n);
          }
        }
      }
    }
    return [{ x: target.x, y: target.y }];
  }

  _closestPointOnSeg(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { x: x1, y: y1 };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }

  _solveBankShot(target, maze) {
    const numRays = 28;
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      let vx = Math.cos(angle);
      let vy = Math.sin(angle);
      let curX = this.tank.x;
      let curY = this.tank.y;

      let minT = 650;
      let hitNx = 0, hitNy = 0;
      for (const w of maze.walls) {
        const col = this._raySegment(curX, curY, curX + vx * 650, curY + vy * 650, w.x1, w.y1, w.x2, w.y2);
        if (col && col.dist < minT && col.dist > 2) {
          minT = col.dist;
          hitNx = col.nx;
          hitNy = col.ny;
        }
      }

      if (hitNx !== 0 || hitNy !== 0) {
        const hitX = curX + vx * minT;
        const hitY = curY + vy * minT;
        const dot = vx * hitNx + vy * hitNy;
        const bvx = vx - 2 * dot * hitNx;
        const bvy = vy - 2 * dot * hitNy;

        if (this._hasClearLOS(hitX + hitNx * 3, hitY + hitNy * 3, target.x, target.y, maze)) {
          const toTargetAngle = Math.atan2(target.y - hitY, target.x - hitX);
          const bounceAngle = Math.atan2(bvy, bvx);
          if (Math.abs(toTargetAngle - bounceAngle) < 0.38) {
            return angle;
          }
        }
      }
    }
    return null;
  }

  _hasClearLOS(x1, y1, x2, y2, maze) {
    for (const w of maze.walls) {
      if (this._segmentsIntersect(x1, y1, x2, y2, w.x1, w.y1, w.x2, w.y2)) return false;
    }
    return true;
  }

  _segmentsIntersect(p1x, p1y, p2x, p2y, w1x, w1y, w2x, w2y) {
    const dx1 = p2x - p1x, dy1 = p2y - p1y;
    const dx2 = w2x - w1x, dy2 = w2y - w1y;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 0.0001) return false;
    const t = ((w1x - p1x) * dy2 - (w1y - p1y) * dx2) / denom;
    const u = ((w1x - p1x) * dy1 - (w1y - p1y) * dx1) / denom;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
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
      const nx = -dy2 / wlen;
      const ny = dx2 / wlen;
      const dot = dx1 * nx + dy1 * ny;
      return { dist, nx: dot < 0 ? nx : -nx, ny: dot < 0 ? ny : -ny };
    }
    return null;
  }
}
