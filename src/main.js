// Entry point for the minimalist shooter game
import engine from './engine.js';
import {updateGame,renderGame,resetGame,gameOver} from './game.js';

engine.initInput();
engine.initAudio();
resetGame();
engine.startLoop(()=>{
    if(gameOver){
        if(engine.keys['Space']) resetGame();
    } else {
        updateGame();
    }
},()=>{
    renderGame();
});
