// Game logic for the roguelite shooter

import engine from './engine.js';
// Destructure required engine utilities including offCanvas so we can access
// its dimensions for boundary checks and minimap rendering.
const {
    offCtx,
    offCanvas,
    keys,
    mouse,
    addEntity,
    removeEntity,
    entities,
    drawSprite,
    drawText,
    randRange,
    randInt,
    choice,
    clamp,
    lerp,
    playSFX,
    shake
} = engine;

// Sprite definitions -------------------------------------------------------
export const SPR_PLAYER = [8,[
    0,0,0,"#fff","#fff",0,0,0,
    0,0,"#0ff","#0ff","#0ff","#0ff",0,0,
    0,"#0ff","#00f","#00f","#00f","#00f","#0ff",0,
    "#0ff","#00f","#fff","#fff","#fff","#fff","#00f","#0ff",
    "#0ff","#00f","#fff","#f00","#f00","#fff","#00f","#0ff",
    0,"#0ff","#00f","#00f","#00f","#00f","#0ff",0,
    0,0,"#0ff","#0ff","#0ff","#0ff",0,0,
    0,0,0,"#0ff","#0ff",0,0,0
]];

export const SPR_ENEMY = [8,[
    0,0,0,"#faa","#faa",0,0,0,
    0,0,"#a55","#a55","#a55","#a55",0,0,
    0,"#a55","#500","#500","#500","#500","#a55",0,
    "#a55","#500","#fff","#fff","#fff","#fff","#500","#a55",
    "#a55","#500","#fff","#f00","#f00","#fff","#500","#a55",
    0,"#a55","#500","#500","#500","#500","#a55",0,
    0,0,"#a55","#a55","#a55","#a55",0,0,
    0,0,0,"#a55","#a55",0,0,0
]];

export const SPR_BULLET=[2,["#ff0","#ff0","#ff0","#ff0"]];

// Entity implementations --------------------------------------------------
export const player = addEntity({
    type:'player',
    x:120,y:67,vx:0,vy:0,angle:0,
    speed:1.5,hp:6,maxHp:6,
    ammo:12,maxAmmo:12,reloadTime:0,
    dash:1,dashCooldown:0,dashing:0,dashDir:{x:0,y:0},
    focus:100,maxFocus:100,slow:false,invul:0,
    update(){
        // movement
        let ax=(keys['KeyD']?1:0)-(keys['KeyA']?1:0);
        let ay=(keys['KeyS']?1:0)-(keys['KeyW']?1:0);
        const len=Math.hypot(ax,ay)||1; ax/=len; ay/=len;
        let sp=this.speed; if(this.slow) sp*=0.4;
        if(this.dashing>0){sp=5; ax=this.dashDir.x; ay=this.dashDir.y; this.dashing--;}
        this.vx=lerp(this.vx,ax*sp,0.2); this.vy=lerp(this.vy,ay*sp,0.2);
        this.x+=this.vx; this.y+=this.vy;
        // aiming
        this.angle=Math.atan2(mouse.y-this.y,mouse.x-this.x);
        // shooting
        if(mouse.down && this.ammo>0 && this.reloadTime<=0){
            shootBullet(this.x,this.y,this.angle,3,SPR_BULLET,'player');
            this.ammo--; playSFX(440); combo++; nextComboDecay=120;
        }
        // reload
        if(keys['KeyR'] && this.ammo<this.maxAmmo) this.reloadTime=60;
        if(this.reloadTime>0){this.reloadTime--; if(this.reloadTime===0)this.ammo=this.maxAmmo;}
        // dash
        if(mouse.right && this.dash>=1 && this.dashCooldown<=0){
            this.dashing=10; this.dashDir={x:Math.cos(this.angle),y:Math.sin(this.angle)};
            this.dash=0; this.dashCooldown=120; playSFX(220,0.2); }
        if(this.dashCooldown>0){this.dashCooldown--; if(this.dashCooldown===0)this.dash=1;}
        // slow-mo
        this.slow = keys['ShiftLeft']||keys['ShiftRight'];
        if(this.slow && this.focus>0) this.focus--; else if(!this.slow && this.focus<this.maxFocus) this.focus+=0.2;
        // bounds
        this.x=clamp(this.x,8,offCanvas.width-8);
        this.y=clamp(this.y,8,offCanvas.height-8);
        if(this.invul>0) this.invul--;
    },
    draw(){ drawSprite(this.x-4,this.y-4,SPR_PLAYER); }
});

export function damagePlayer(d){
    if(player.invul>0) return; player.hp-=d; player.invul=60; shake(10); playSFX(120,0.3,'sawtooth');
    if(player.hp<=0) gameOver=true;
}

function shootBullet(x,y,angle,speed,sprite,owner){
    addEntity({
        type:'bullet',owner,x,y,angle,speed,sprite,
        update(){
            this.x+=Math.cos(this.angle)*this.speed;
            this.y+=Math.sin(this.angle)*this.speed;
            if(this.x<0||this.x>offCanvas.width||this.y<0||this.y>offCanvas.height) removeEntity(this);
            if(owner==='player'){
                for(const e of entities){
                    if(e.type==='enemy' && Math.hypot(e.x-this.x,e.y-this.y)<5){
                        e.hp--; removeEntity(this); playSFX(330); if(e.hp<=0){score+=100; combo+=2; nextComboDecay=120; spawnPickup(e.x,e.y); removeEntity(e); shake(5);} break; }
                }
            }else if(owner==='enemy'){
                if(Math.hypot(player.x-this.x,player.y-this.y)<5){ damagePlayer(1); removeEntity(this); }
            }
        },
        draw(){ drawSprite(this.x-1,this.y-1,this.sprite); }
    });
}

// Enemy creation ----------------------------------------------------------
export function spawnEnemy(){
    const x=randRange(20,offCanvas.width-20); const y=randRange(20,offCanvas.height-20);
    addEntity({
        type:'enemy',x,y,vx:0,vy:0,hp:2,reload:randInt(30,90),
        update(){
            const dx=player.x-this.x; const dy=player.y-this.y; const dist=Math.hypot(dx,dy);
            this.vx=dx/dist*0.5; this.vy=dy/dist*0.5; this.x+=this.vx; this.y+=this.vy;
            if(this.reload>0) this.reload--; else { shootBullet(this.x,this.y,Math.atan2(dy,dx),2,SPR_BULLET,'enemy'); this.reload=60; }
        },
        draw(){ drawSprite(this.x-4,this.y-4,SPR_ENEMY); }
    });
}

function spawnBoss(){
    addEntity({
        type:'boss',x:offCanvas.width/2,y:40,hp:100,reload:60,
        update(){
            const dx=player.x-this.x; const dy=player.y-this.y; const dist=Math.hypot(dx,dy);
            if(dist>30){ this.x+=dx/dist*0.5; this.y+=dy/dist*0.5; }
            if(this.reload>0) this.reload--; else {
                for(let a=0;a<Math.PI*2;a+=Math.PI/8){ shootBullet(this.x,this.y,a,2,SPR_BULLET,'enemy'); }
                this.reload=120;
            }
            if(this.hp<=0){ removeEntity(this); score+=1000; wave++; enemiesToSpawn+=10; }
        },
        draw(){ offCtx.fillStyle='#800'; offCtx.fillRect(this.x-10,this.y-10,20,20); }
    });
}

// Pickups -----------------------------------------------------------------
function spawnPickup(x,y){
    const type = choice(['ammo','health','coin']);
    addEntity({type:'pickup',x,y,kind:type,angle:0,
        update(){ this.angle+=0.1; if(Math.hypot(player.x-this.x,player.y-this.y)<6) collect(this); },
        draw(){ offCtx.fillStyle=type==='ammo'?'#ff0':type==='health'?'#0f0':'#0ff'; offCtx.fillRect(this.x-2,this.y-2,4,4); }
    });
    function collect(p){
        if(p.kind==='ammo') player.ammo=player.maxAmmo;
        if(p.kind==='health') player.hp=Math.min(player.maxHp,player.hp+1);
        if(p.kind==='coin') score+=50;
        playSFX(660); removeEntity(p);
    }
}

// Wave management ---------------------------------------------------------
let enemiesToSpawn=5; export let wave=1; export let score=0; let combo=0; let nextComboDecay=0; export let gameOver=false;
function nextWave(){ wave++; enemiesToSpawn=5+wave*2; if(wave%5===0) spawnBoss(); }
function updateSpawns(){
    if(enemiesToSpawn>0){ if(Math.random()<0.02){ spawnEnemy(); enemiesToSpawn--; } }
    else if(!entities.some(e=>e.type==='enemy'||e.type==='boss')){ nextWave(); }
}

// HUD ---------------------------------------------------------------------
function drawHUD(){
    offCtx.fillStyle='#f00'; offCtx.fillRect(5,5,player.hp*10,4); offCtx.strokeStyle='#fff'; offCtx.strokeRect(5,5,player.maxHp*10,4);
    offCtx.fillStyle='#ff0'; offCtx.fillRect(5,11,player.ammo*5,4); offCtx.strokeRect(5,11,player.maxAmmo*5,4);
    offCtx.fillStyle='#0ff'; offCtx.fillRect(5,17,player.focus*0.5,4); offCtx.strokeRect(5,17,player.maxFocus*0.5,4);
    drawText(`Wave: ${wave}`,5,30); drawText(`Score: ${score}`,5,40); drawText(`Combo: ${combo}`,5,50);
}

// Game update & render ----------------------------------------------------
export function updateGame(){
    updateSpawns();
    for(const e of entities) e.update&&e.update();
    if(nextComboDecay>0) nextComboDecay--; else combo=Math.max(0,combo-1);
}

export function renderGame(){
    offCtx.clearRect(0,0,offCanvas.width,offCanvas.height);
    for(const e of entities) e.draw&&e.draw();
    drawHUD();
}

export function resetGame(){
    entities.length=0; addEntity(player); player.x=120; player.y=67; player.hp=player.maxHp; player.ammo=player.maxAmmo; score=0; wave=1; enemiesToSpawn=5; gameOver=false;
}
