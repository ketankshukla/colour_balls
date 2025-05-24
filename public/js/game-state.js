// public/js/game-state.js - Client-side game state management
import { getGameState as apiGetGameState, sendAction as apiSendAction, resetGame as apiResetGame } from './api-client.js';
import { drawBoard, drawCurrentPiece, drawNextPiece } from './board.js';
import { stopGameLoop, setGameSpeed } from './ui-controller.js'; // Added setGameSpeed for level changes

let currentGameState = {
    board: [],          // 2D array representing the game grid
    currentPiece: null, // { colors: [c1..c3], x: col, y: row, orientation: 0/90/180/270 }
    nextPieceColors: [],// Array of 3 color indices for the next piece
    score: 0,
    level: 1,
    gameOver: false,
    matchedPositions: [] // Positions of matched cells for flashing animation
};

/**
 * Fetches the initial game state from the server and updates the local state.
 */
export async function initializeGame() {
    console.log('Initializing game...');
    try {
        const initialState = await apiGetGameState();
        updateGameState(initialState);
        console.log('Game initialized with state:', currentGameState);
        renderGame();
    } catch (error) {
        console.error('Error initializing game:', error);
        document.getElementById('game-message').textContent = 'Error initializing game. Check console.';
    }
}

/**
 * Updates the local game state with new data from the server.
 * @param {object} newState - The new game state from the server.
 */
function updateGameState(newState) {
    if (!newState) {
        console.warn('Attempted to update with null or undefined state.');
        return;
    }
    
    // Log if we received matched positions
    if (newState.matchedPositions && newState.matchedPositions.length > 0) {
        console.log('Received matched positions from server:', newState.matchedPositions);
    }
    
    // Update the game state
    currentGameState = { ...currentGameState, ...newState };
    console.log('Game state updated:', currentGameState);
    
    // Render the game with the updated state
    renderGame();
    updateUIDisplays();

    if (currentGameState.gameOver) {
        console.log('Game over detected in updateGameState, stopping loop.');
        stopGameLoop();
    } else {
        // If game is not over, and level might have changed, update speed
        // This assumes 'level' is part of newState and currentGameState
        if (newState.level && currentGameState.level !== undefined) {
            setGameSpeed(currentGameState.level);
        }
    }
}

/**
 * Renders the game board, current piece, and next piece.
 */
function renderGame() {
    if (currentGameState.board) {
        // Pass matched positions for flashing animation
        drawBoard(currentGameState.board, currentGameState.matchedPositions);
    }
    if (currentGameState.currentPiece) {
        // Draw the current falling piece on top of the board
        drawCurrentPiece(currentGameState.currentPiece);
    }
    if (currentGameState.nextPieceColors && currentGameState.nextPieceColors.length > 0) {
        drawNextPiece(currentGameState.nextPieceColors);
    } else if (currentGameState.nextPiece && currentGameState.nextPiece.colors) {
        // If backend sends a full nextPiece object with a 'colors' array
        drawNextPiece(currentGameState.nextPiece.colors);
    }
}

/**
 * Updates UI elements like score and level display.
 */
function updateUIDisplays() {
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const gameMessageElement = document.getElementById('game-message');

    if (scoreElement) scoreElement.textContent = currentGameState.score;
    if (levelElement) levelElement.textContent = currentGameState.level;

    if (currentGameState.gameOver) {
        if (gameMessageElement) gameMessageElement.textContent = 'Game Over! Press R to Reset.';
        // Ensure loop is stopped if game over is confirmed here too
        stopGameLoop(); 
    } else {
        // Clear message if game is not over, or it might be set by other actions
        // if (gameMessageElement && gameMessageElement.textContent.startsWith('Game Over')) {
        //     gameMessageElement.textContent = ''; 
        // }
    }
}

/**
 * Sends a player action to the server and updates the game state with the response.
 * @param {string} actionType - The type of action (e.g., 'move_left', 'rotate').
 * @param {object} [actionData={}] - Additional data for the action (if any).
 * @returns {Promise<object>} The updated game state.
 */
export async function handleAction(actionType, actionData = {}) {
    try {
        // Send the action to the server
        const response = await apiSendAction(actionType, actionData);
        
        // If we got a response (might be null if animation is in progress)
        if (response) {
            // Update the game state with the server response
            updateGameState(response);
            
            // If there are matched positions, they will be shown with flashing animation
            // The api-client.js will handle sending the clear-matches request after animation
        }
        
        return response;
    } catch (error) {
        console.error(`Error handling action ${actionType}:`, error);
        document.getElementById('game-message').textContent = `Error: ${error.message}. Check console.`;
    }
}

/**
 * Resets the game state on the server and updates the local state.
 */
export async function resetGame() {
    console.log('Resetting game...');
    try {
        const resetState = await apiResetGame();
        updateGameState(resetState);
        console.log('Game reset to state:', currentGameState);
        document.getElementById('game-message').textContent = 'Game reset. Good luck!';
    } catch (error) {
        console.error('Error resetting game:', error);
        document.getElementById('game-message').textContent = 'Error resetting game. Check console.';
    }
}

/**
 * Returns the current game state (read-only).
 * @returns {object} The current game state.
 */
export function getCurrentState() {
    return { ...currentGameState }; // Return a copy to prevent direct modification
}

console.log('Game state module loaded.');
