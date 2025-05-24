// public/js/ui-controller.js - Manages game loop and active UI interactions
import { handleAction } from './game-state.js';
import { getCurrentState } from './game-state.js'; // To check game over status

let gameLoopInterval = null;
const GAME_SPEED_START = 1000; // Milliseconds per tick (1 second)
const GAME_SPEED_INCREMENT_FACTOR = 0.9; // Speed increases by 10% each level (multiplier)
let currentSpeed = GAME_SPEED_START;
let isLoopRunning = false;
let isPaused = false;
let pausedSpeed = null; // Store the speed when paused

/**
 * Called at each interval of the game loop.
 */
async function gameTick() {
    // console.log('Game tick');
    const state = getCurrentState();
    if (state.gameOver) {
        console.log('Game over detected in gameTick, stopping loop.');
        stopGameLoop();
        return;
    }
    try {
        await handleAction('move_down'); // Request backend to move piece down
    } catch (error) {
        console.error('Error during game tick (move_down action):', error);
        stopGameLoop(); // Stop loop on error to prevent spamming
    }
}

/**
 * Starts the game loop.
 * @param {number} [level=1] - The starting level, to adjust speed.
 */
export function startGameLoop(level = 1) {
    if (isLoopRunning) {
        console.log('Game loop already running. Stopping and restarting.');
        stopGameLoop();
    }
    console.log(`Starting game loop at level ${level}.`);
    isLoopRunning = true;
    currentSpeed = GAME_SPEED_START * Math.pow(GAME_SPEED_INCREMENT_FACTOR, level - 1);
    currentSpeed = Math.max(currentSpeed, 100); // Ensure speed doesn't get too fast (e.g., min 100ms)
    gameLoopInterval = setInterval(gameTick, currentSpeed);
    console.log(`Game loop started with speed: ${currentSpeed}ms`);
}

/**
 * Stops the game loop.
 */
export function stopGameLoop() {
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
    }
    isLoopRunning = false;
    console.log('Game loop stopped.');
}

/**
 * Adjusts the game speed based on the current level.
 * This function is called by startGameLoop and can be called if level changes mid-game.
 * @param {number} level - The current game level.
 */
export function setGameSpeed(level) {
    if (!isLoopRunning) {
        // If loop isn't running, just update speed for next start
        currentSpeed = GAME_SPEED_START * Math.pow(GAME_SPEED_INCREMENT_FACTOR, level - 1);
        currentSpeed = Math.max(currentSpeed, 100);
        return;
    }
    // If loop is running, stop and restart it with the new speed
    console.log(`Adjusting game speed for level ${level}.`);
    stopGameLoop();
    startGameLoop(level);
}

/**
 * Pauses the game.
 */
export function pauseGame() {
    if (!isLoopRunning || isPaused) return; // Already paused or not running
    
    console.log('Game paused');
    isPaused = true;
    pausedSpeed = currentSpeed; // Store current speed
    
    // Stop the game loop but remember we're paused
    if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
    }
    
    // Draw a pause overlay on the game canvas
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        
        ctx.font = '20px Arial';
        ctx.fillText('Press P to resume', canvas.width / 2, canvas.height / 2 + 40);
    }
}

/**
 * Resumes the game from a paused state.
 */
export function resumeGame() {
    if (!isPaused) return; // Not paused
    
    console.log('Game resumed');
    isPaused = false;
    
    // Restart the game loop with the saved speed
    if (pausedSpeed) {
        currentSpeed = pausedSpeed;
        gameLoopInterval = setInterval(gameTick, currentSpeed);
        isLoopRunning = true;
    }
}

/**
 * Checks if the game is currently paused.
 * @returns {boolean} True if the game is paused, false otherwise.
 */
export function isGamePaused() {
    return isPaused;
}

console.log('UI controller module loaded.');
