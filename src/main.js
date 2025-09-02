// Entry point for the roguelite shooter
import engine from './engine.js';
import {updateGame,renderGame,resetGame,gameOver} from './game.js';

engine.initInput();
engine.initAudio();
resetGame();
engine.startLoop(()=>{
    if(!gameOver) updateGame();
},()=>{
    renderGame();
});
