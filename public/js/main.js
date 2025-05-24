// public/js/main.js - Application entry point
console.log('Main script loaded');

import { initializeGame, handleAction, resetGame, getCurrentState } from './game-state.js';
import { init as initBoard } from './board.js';
import { startGameLoop, stopGameLoop, pauseGame, resumeGame, isGamePaused } from './ui-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    initBoard(); // Initialize the canvas and drawing contexts
    initializeGame(); // Fetch initial game state and render

    const startButton = document.getElementById('start-button');
    const gameMessage = document.getElementById('game-message');

    if (startButton) {
        startButton.addEventListener('click', async () => {
            console.log('Start button clicked');
            stopGameLoop(); // Stop any existing loop first
            try {
                // First reset the game
                await resetGame();
                
                // Then start the game with the start_game action
                const response = await handleAction('start_game');
                
                if (response) {
                    const state = getCurrentState();
                    if (!state.gameOver) {
                        startGameLoop(state.level);
                    }
                }
            } catch (error) {
                console.error('Error during start button click:', error);
            }
        });
    }

    // Listen for keydown events for game controls
    document.addEventListener('keydown', (event) => {
        let action = null;
        switch (event.key) {
            case 's': // Add S key to start game
            case 'S':
                console.log('S key pressed - starting game');
                stopGameLoop(); // Stop any existing loop first
                handleAction('start_game').then((response) => {
                    if (response) {
                        const state = getCurrentState();
                        if (!state.gameOver) {
                            startGameLoop(state.level);
                        }
                    }
                }).catch(error => {
                    console.error('Error starting game with S key:', error);
                });
                return; // Early return as we're handling this separately
                
            case 'p': // Add P key for pause
            case 'P':
                console.log('P key pressed - toggling pause');
                const state = getCurrentState();
                if (state.gameOver) return; // Don't pause if game is over
                
                if (isGamePaused()) {
                    resumeGame();
                } else {
                    pauseGame();
                }
                return; // Early return as we're handling this separately
            case 'ArrowLeft':
                action = 'move_left';
                break;
            case 'ArrowRight':
                action = 'move_right';
                break;
            case 'ArrowUp':
                action = 'rotate';
                break;
            case 'ArrowDown':
                action = 'move_down'; // Or soft_drop
                break;
            case ' ': // Space bar for hard drop
                action = 'hard_drop';
                event.preventDefault(); // Prevent page scrolling
                break;
            case 'r': // For reset
            case 'R':
                stopGameLoop(); // Stop loop before resetting
                resetGame().then(() => {
                    const state = getCurrentState();
                    if (!state.gameOver) {
                        // Decide if we should auto-start loop on manual reset, or require Start button.
                        // For now, let's not auto-start. User can press Start Game.
                        // startGameLoop(state.level);
                         if (gameMessage) gameMessage.textContent = 'Game reset! Press Start Game or S to play.';
                    } else {
                         if (gameMessage) gameMessage.textContent = 'Game reset, but still game over. Try Start Game or S key.';
                    }
                }).catch(error => {
                    console.error('Error during manual reset:', error);
                    if (gameMessage) gameMessage.textContent = 'Failed to reset game. Check console.';
                });
                return; // Early return as resetGame handles its own logic
        }

        if (action) {
            console.log(`Action triggered by key: ${action}`);
            handleAction(action);
        }
    });

    console.log('Game controls and event listeners initialized.');
});
