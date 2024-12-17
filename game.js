class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.money = 100;
        this.lives = 20;
        this.wave = 1;
        this.score = 0;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.selectedTower = null;
        this.waveInProgress = false;
        this.previewX = 0;
        this.previewY = 0;
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Path points for enemies to follow
        this.path = [
            {x: 0, y: 100},
            {x: 200, y: 100},
            {x: 200, y: 300},
            {x: 600, y: 300},
            {x: 600, y: 100},
            {x: 800, y: 100}
        ];
        
        this.setupEventListeners();
        this.updateHUD();
        this.gameLoop();
    }

    setupEventListeners() {
        // Tower selection
        document.querySelectorAll('.tower-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectTower(option);
            });
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Number keys 1-3 for tower selection
            if (e.key >= '1' && e.key <= '3') {
                const towerOptions = document.querySelectorAll('.tower-option');
                const index = parseInt(e.key) - 1;
                if (index < towerOptions.length) {
                    this.selectTower(towerOptions[index]);
                }
            }
            // Space to start wave
            else if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (!this.waveInProgress) {
                    this.startWave();
                }
            }
            // Escape to cancel tower placement
            else if (e.key === 'Escape') {
                this.selectedTower = null;
                this.updateTowerSelection();
            }
        });

        // Tower placement
        this.canvas.addEventListener('click', (e) => {
            if (this.selectedTower) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (this.canPlaceTower(x, y)) {
                    this.money -= this.selectedTower.cost;
                    this.towers.push(new Tower(x, y, this.selectedTower.type));
                    this.selectedTower = null;
                    this.updateTowerSelection();
                    this.updateHUD();
                }
            }
        });

        // Mouse move for tower preview
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.selectedTower) {
                const rect = this.canvas.getBoundingClientRect();
                this.previewX = e.clientX - rect.left;
                this.previewY = e.clientY - rect.top;
            }
        });

        // Start wave
        document.getElementById('start-wave').addEventListener('click', () => {
            if (!this.waveInProgress) {
                this.startWave();
            }
        });
    }

    selectTower(option) {
        const type = option.dataset.tower;
        const cost = parseInt(option.dataset.cost);
        if (this.money >= cost) {
            this.selectedTower = { type, cost };
            this.updateTowerSelection();
        }
    }

    updateTowerSelection() {
        // Remove selected class from all tower options
        document.querySelectorAll('.tower-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selected class to the currently selected tower
        if (this.selectedTower) {
            const selectedOption = document.querySelector(`.tower-option[data-tower="${this.selectedTower.type}"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }
        }
    }

    canPlaceTower(x, y) {
        // Check if too close to path or other towers
        return true; // Implement proper checking later
    }

    startWave() {
        this.waveInProgress = true;
        const enemyCount = this.wave * 5;
        let enemiesSpawned = 0;
        
        const spawnInterval = setInterval(() => {
            if (enemiesSpawned < enemyCount) {
                this.enemies.push(new Enemy(this.path[0].x, this.path[0].y, this.wave));
                enemiesSpawned++;
            } else {
                clearInterval(spawnInterval);
            }
        }, 1000);
    }

    updateHUD() {
        document.getElementById('money').textContent = `Money: $${this.money}`;
        document.getElementById('lives').textContent = `Lives: ${this.lives}`;
        document.getElementById('wave').textContent = `Wave: ${this.wave}`;
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(this.path);
            if (enemy.reachedEnd) {
                this.lives--;
                this.updateHUD();
                return false;
            }
            if (enemy.health <= 0) {
                this.money += enemy.reward;
                this.score += enemy.reward;
                this.updateHUD();
                return false;
            }
            return true;
        });

        // Update towers and projectiles
        this.towers.forEach(tower => {
            const target = tower.findTarget(this.enemies);
            if (target) {
                const projectile = tower.shoot(target);
                if (projectile) {
                    this.projectiles.push(projectile);
                }
            }
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(projectile => {
            projectile.update();
            const hit = projectile.checkCollision(this.enemies);
            if (hit) {
                hit.health -= projectile.damage;
                return false;
            }
            return !projectile.outOfBounds(this.canvas.width, this.canvas.height);
        });

        // Check wave completion
        if (this.waveInProgress && this.enemies.length === 0) {
            this.waveInProgress = false;
            this.wave++;
            this.updateHUD();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw path
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 40;
        this.ctx.stroke();

        // Draw towers
        this.towers.forEach(tower => tower.draw(this.ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        // Draw tower preview
        if (this.selectedTower) {
            const tower = new Tower(this.previewX, this.previewY, this.selectedTower.type);
            
            // Draw range indicator
            this.ctx.beginPath();
            this.ctx.arc(this.previewX, this.previewY, tower.range, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
            this.ctx.stroke();
            
            // Draw semi-transparent tower
            this.ctx.globalAlpha = 0.6;
            tower.draw(this.ctx);
            this.ctx.globalAlpha = 1.0;
        }
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.lastShot = 0;
        this.level = 1;
        this.rotation = 0;
        this.targetingAngle = 0;
        
        switch (type) {
            case 'basic':
                this.range = 150;
                this.damage = 15;
                this.fireRate = 800;
                this.color = '#4a90e2';
                break;
            case 'sniper':
                this.range = 300;
                this.damage = 30;
                this.fireRate = 1500;
                this.color = '#e74c3c';
                break;
            case 'splash':
                this.range = 120;
                this.damage = 20;
                this.fireRate = 1200;
                this.color = '#f1c40f';
                this.splashRadius = 60;
                break;
        }
    }

    findTarget(enemies) {
        let target = null;
        let closestDistance = this.range;
        
        enemies.forEach(enemy => {
            if (enemy.health > 0) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    target = enemy;
                }
            }
        });
        
        if (target) {
            // Update tower rotation to face target
            this.targetingAngle = Math.atan2(target.y - this.y, target.x - this.x);
            // Smooth rotation
            const angleDiff = this.targetingAngle - this.rotation;
            this.rotation += angleDiff * 0.3;
        }
        
        return target;
    }

    shoot(target) {
        const now = Date.now();
        if (now - this.lastShot >= this.fireRate) {
            this.lastShot = now;
            if (this.type === 'splash') {
                return new Projectile(this.x, this.y, target, this.damage, true, this.splashRadius);
            }
            return new Projectile(this.x, this.y, target, this.damage, false);
        }
        return null;
    }

    draw(ctx) {
        // Draw range circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 100, 100, 0.1)';
        ctx.fill();
        
        // Draw tower base
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw tower cannon
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.rect(0, -5, 25, 10);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();
        
        ctx.restore();
        
        // Draw level indicator
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillText(this.level, this.x, this.y);
    }
}

class Enemy {
    constructor(x, y, wave) {
        this.x = x;
        this.y = y;
        this.speed = 2;
        this.health = 30 + wave * 15; 
        this.maxHealth = this.health;
        this.pathIndex = 0;
        this.reachedEnd = false;
        this.reward = 15 + wave * 3; 
        this.size = 15;
        this.hitTime = 0;
    }

    update(path) {
        if (this.pathIndex < path.length - 1) {
            const target = path[this.pathIndex + 1];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.speed) {
                this.pathIndex++;
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        } else {
            this.reachedEnd = true;
        }
    }

    draw(ctx) {
        // Flash red when hit
        const timeSinceHit = Date.now() - this.hitTime;
        const isFlashing = timeSinceHit < 100;
        
        // Draw enemy
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = isFlashing ? '#ff0000' : '#e74c3c';
        ctx.fill();

        // Draw health bar
        const healthBarWidth = 30;
        const healthPercentage = this.health / this.maxHealth;
        
        // Health bar background
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - healthBarWidth/2, this.y - 25, healthBarWidth, 5);
        
        // Current health
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x - healthBarWidth/2, this.y - 25, healthBarWidth * healthPercentage, 5);
        
        // Health bar border
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(this.x - healthBarWidth/2, this.y - 25, healthBarWidth, 5);
    }

    takeDamage(damage) {
        this.health -= damage;
        this.hitTime = Date.now();
    }
}

class Projectile {
    constructor(x, y, target, damage, isSplash = false, splashRadius = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.speed = 12; 
        this.damage = damage;
        this.isSplash = isSplash;
        this.splashRadius = splashRadius;
        this.tracking = true; // Enable tracking
        
        // Initial direction
        this.updateDirection();
    }

    updateDirection() {
        // Update direction to current target position
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            this.vx = 0;
            this.vy = 0;
        } else {
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }

        // Store angle for rotation
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        if (this.tracking && this.target) {
            // Update direction every frame to track the target
            this.updateDirection();
        }
        this.x += this.vx;
        this.y += this.vy;
    }

    checkCollision(enemies) {
        if (!this.target.health || this.target.health <= 0) {
            // If original target is dead, find new closest target
            const newTarget = this.findNewTarget(enemies);
            if (newTarget) {
                this.target = newTarget;
                return null;
            }
            return false;
        }

        if (this.isSplash) {
            let hitEnemy = null;
            enemies.forEach(enemy => {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < enemy.size) {
                    hitEnemy = enemy;
                    // Apply splash damage to nearby enemies
                    enemies.forEach(nearbyEnemy => {
                        const splashDx = nearbyEnemy.x - this.x;
                        const splashDy = nearbyEnemy.y - this.y;
                        const splashDistance = Math.sqrt(splashDx * splashDx + splashDy * splashDy);
                        if (splashDistance <= this.splashRadius) {
                            // Damage falls off with distance
                            const damageMultiplier = 1 - (splashDistance / this.splashRadius);
                            nearbyEnemy.takeDamage(this.damage * damageMultiplier);
                        }
                    });
                }
            });
            return hitEnemy;
        } else {
            // Check if we're close enough to the target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.target.size) {
                this.target.takeDamage(this.damage);
                return this.target;
            }
            return null;
        }
    }

    findNewTarget(enemies) {
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        enemies.forEach(enemy => {
            if (enemy.health > 0) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
        });
        
        return closestEnemy;
    }

    outOfBounds(width, height) {
        // Only consider out of bounds if far outside the canvas
        const margin = 100;
        return this.x < -margin || this.x > width + margin || 
               this.y < -margin || this.y > height + margin;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.isSplash) {
            // Draw splash projectile
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-5, 5);
            ctx.lineTo(-5, -5);
            ctx.closePath();
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
            
            // Draw glow effect
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
            ctx.fill();
        } else {
            // Draw regular projectile as an arrow
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-4, 4);
            ctx.lineTo(-4, -4);
            ctx.closePath();
            ctx.fillStyle = '#2c3e50';
            ctx.fill();
            
            // Draw trail
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(-12, 0);
            ctx.strokeStyle = 'rgba(44, 62, 80, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
