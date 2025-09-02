// Core engine utilities for the roguelite shooter

// Canvas setup -------------------------------------------------------------
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

// Offscreen canvas used to render pixel art at low resolution before
// scaling up to the display canvas. This gives crisp pixels regardless of
// monitor resolution.
export const offCanvas = document.createElement('canvas');
export const offCtx = offCanvas.getContext('2d');
offCanvas.width = 240;  // base resolution width
offCanvas.height = 135; // base resolution height

// Game timing --------------------------------------------------------------
let lastTime = 0;       // timestamp of last frame
let accumulator = 0;    // fixed timestep accumulator
export const step = 1/60; // 60 FPS fixed timestep

// Input handling -----------------------------------------------------------
export const keys = {};
export const mouse = {x:0,y:0,down:false,right:false};

function handleKey(e,down){
    keys[e.code] = down;
}

function handleMouse(e,down){
    if(e.button === 0) mouse.down = down;
    if(e.button === 2) mouse.right = down;
}

export function initInput(){
    window.addEventListener('keydown',e=>handleKey(e,true));
    window.addEventListener('keyup',e=>handleKey(e,false));
    canvas.addEventListener('mousemove',e=>{
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX-rect.left)/rect.width*offCanvas.width;
        mouse.y = (e.clientY-rect.top)/rect.height*offCanvas.height;
    });
    canvas.addEventListener('mousedown',e=>handleMouse(e,true));
    canvas.addEventListener('mouseup',e=>handleMouse(e,false));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
}

// Random helpers -----------------------------------------------------------
export function randRange(min,max){return Math.random()*(max-min)+min;}
export function randInt(min,max){return Math.floor(randRange(min,max));}
export function clamp(v,min,max){return v<min?min:v>max?max:v;}
export function lerp(a,b,t){return a+(b-a)*t;}
export function choice(arr){return arr[randInt(0,arr.length)];}

// Screen shake -------------------------------------------------------------
let shakeTime = 0;
export function shake(amount){
    shakeTime = Math.max(shakeTime, amount);
}
function applyShake(){
    if(shakeTime>0){
        shakeTime--; 
        return {x:randRange(-2,2), y:randRange(-2,2)};
    }
    return {x:0,y:0};
}

// Audio -------------------------------------------------------------------
let audioCtx;
let sfxGain;
let musicGain;

export function initAudio(){
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    sfxGain = audioCtx.createGain();
    musicGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    musicGain.connect(audioCtx.destination);
    musicGain.gain.value = 0.2;
    startMusic();
}

function startMusic(){
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05,audioCtx.currentTime+2);
    osc.connect(gain).connect(musicGain);
    osc.start();
    osc.stop(audioCtx.currentTime+8);
    osc.onended = startMusic;
}

export function playSFX(freq,len=0.1,type='square'){
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain).connect(sfxGain);
    osc.start();
    gain.gain.setValueAtTime(0.1,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+len);
    osc.stop(audioCtx.currentTime+len);
}

// Entity management -------------------------------------------------------
export const entities = [];
export function addEntity(e){entities.push(e); return e;}
export function removeEntity(e){const i=entities.indexOf(e); if(i>=0) entities.splice(i,1);} 

// Main loop ---------------------------------------------------------------
export function startLoop(update,render){
    function frame(t){
        const dt = (t-lastTime)/1000;
        lastTime = t;
        accumulator += dt;
        while(accumulator > step){
            update();
            accumulator -= step;
        }
        const shakeOffset = applyShake();
        offCtx.save();
        offCtx.translate(shakeOffset.x, shakeOffset.y);
        render();
        offCtx.restore();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas,0,0,canvas.width,canvas.height);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// Basic drawing helpers ---------------------------------------------------
export function drawCircle(x,y,r,color){
    offCtx.fillStyle = color;
    offCtx.beginPath();
    offCtx.arc(x,y,r,0,Math.PI*2);
    offCtx.fill();
}

export function drawLine(x1,y1,x2,y2,color,width=1){
    offCtx.strokeStyle = color;
    offCtx.lineWidth = width;
    offCtx.beginPath();
    offCtx.moveTo(x1,y1);
    offCtx.lineTo(x2,y2);
    offCtx.stroke();
    offCtx.lineWidth = 1;
}

// Text helper -------------------------------------------------------------
offCtx.font = '5px monospace';
export function drawText(str,x,y,align='left'){
    offCtx.textAlign = align;
    offCtx.fillStyle = '#fff';
    offCtx.fillText(str,x,y);
}

export default {
    canvas,ctx,offCanvas,offCtx,keys,mouse,entities,
    initInput,initAudio,startLoop,addEntity,removeEntity,
    randRange,randInt,clamp,lerp,choice,drawCircle,drawLine,drawText,
    playSFX,shake
};
