// Minimalist top-down shooter game

import engine from './engine.js';
const {
    offCtx,
    offCanvas,
    keys,
    mouse,
    randRange,
    drawCircle,
    drawText,
    playSFX
} = engine;

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
export let score = 0;
export let gameOver = false;

const player = {x:0,y:0,vx:0,vy:0,speed:1.5,hp:3,fire:0};
const bullets = [];
const enemies = [];
let enemyTimer = 0;

// Reset game to initial state
export function resetGame(){
    score = 0;
    gameOver = false;
    player.x = offCanvas.width/2;
    player.y = offCanvas.height/2;
    player.vx = player.vy = 0;
    player.hp = 3;
    player.fire = 0;
    bullets.length = 0;
    enemies.length = 0;
    enemyTimer = 0;
}

// Spawn an enemy at a random edge
function spawnEnemy(){
    let x,y;
    const edge = Math.floor(randRange(0,4));
    if(edge===0){x=0;y=randRange(0,offCanvas.height);}            // left
    else if(edge===1){x=offCanvas.width;y=randRange(0,offCanvas.height);} // right
    else if(edge===2){x=randRange(0,offCanvas.width);y=0;}        // top
    else {x=randRange(0,offCanvas.width);y=offCanvas.height;}     // bottom
    enemies.push({x,y,speed:0.5+Math.random()});
}

// Update loop
export function updateGame(){
    if(gameOver) return;

    // Movement --------------------------------------------------------------
    let ax = (keys['KeyD']?1:0) - (keys['KeyA']?1:0);
    let ay = (keys['KeyS']?1:0) - (keys['KeyW']?1:0);
    const len = Math.hypot(ax,ay) || 1;
    player.vx = ax/len * player.speed;
    player.vy = ay/len * player.speed;
    player.x = Math.max(5, Math.min(offCanvas.width-5, player.x + player.vx));
    player.y = Math.max(5, Math.min(offCanvas.height-5, player.y + player.vy));

    // Shooting --------------------------------------------------------------
    if(mouse.down && player.fire<=0){
        const angle = Math.atan2(mouse.y-player.y, mouse.x-player.x);
        bullets.push({x:player.x, y:player.y, vx:Math.cos(angle)*3, vy:Math.sin(angle)*3});
        player.fire = 10; // cooldown frames
        playSFX(440);
    }
    if(player.fire>0) player.fire--;

    // Update bullets -------------------------------------------------------
    for(let i=bullets.length-1;i>=0;i--){
        const b = bullets[i];
        b.x += b.vx; b.y += b.vy;
        if(b.x<0||b.x>offCanvas.width||b.y<0||b.y>offCanvas.height){
            bullets.splice(i,1);
            continue;
        }
        for(let j=enemies.length-1;j>=0;j--){
            const e = enemies[j];
            if(Math.hypot(e.x-b.x,e.y-b.y) < 4){
                enemies.splice(j,1);
                bullets.splice(i,1);
                score += 100;
                playSFX(660);
                break;
            }
        }
    }

    // Spawn enemies --------------------------------------------------------
    enemyTimer--;
    if(enemyTimer<=0){
        spawnEnemy();
        enemyTimer = Math.max(15, 60 - score/10); // faster spawns as score increases
    }

    // Update enemies -------------------------------------------------------
    for(let i=enemies.length-1;i>=0;i--){
        const e = enemies[i];
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx,dy) || 1;
        e.x += dx/dist * e.speed;
        e.y += dy/dist * e.speed;
        if(Math.hypot(player.x-e.x, player.y-e.y) < 6){
            enemies.splice(i,1);
            player.hp--;
            playSFX(220);
            if(player.hp<=0){
                gameOver = true;
            }
        }
    }
}

// Render scene -------------------------------------------------------------
export function renderGame(){
    offCtx.clearRect(0,0,offCanvas.width,offCanvas.height);
    // Player
    drawCircle(player.x, player.y, 4, '#0f0');
    // Bullets
    for(const b of bullets) drawCircle(b.x,b.y,2,'#ff0');
    // Enemies
    for(const e of enemies) drawCircle(e.x,e.y,4,'#f00');
    // HUD
    drawText(`Score: ${score}`,5,10);
    drawText(`HP: ${player.hp}`,5,20);
    if(gameOver) drawText('Game Over - press Space', offCanvas.width/2, offCanvas.height/2, 'center');
}

