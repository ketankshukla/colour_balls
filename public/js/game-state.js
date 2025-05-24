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
            // Check if the response indicates a circuit breaker or error condition
            if (response.circuitBreakerActive) {
                console.warn(`Circuit breaker active during ${actionType} - using fallback behavior`);
                
                // For movement actions, apply a basic client-side prediction
                // This allows the game to remain playable even when backend is unreachable
                if (['move_left', 'move_right', 'move_down', 'rotate'].includes(actionType) && currentGameState.currentPiece) {
                    const piece = { ...currentGameState.currentPiece };
                    
                    // Get piece length based on orientation
                    const pieceLength = piece.colors ? piece.colors.length : 6; // Default to 6 if colors not available
                    
                    // Apply basic movement prediction with proper boundary checking
                    switch (actionType) {
                        case 'move_left':
                            if (piece.x > 0) piece.x -= 1;
                            break;
                        case 'move_right':
                            // Check right boundary based on piece orientation
                            if (piece.orientation === 0 || piece.orientation === 180) {
                                // Horizontal orientation - need to account for piece length
                                const rightmostPosition = piece.orientation === 0 ? 
                                    piece.x + (pieceLength - 1) : // For 0 degrees
                                    piece.x; // For 180 degrees (leftmost ball is rightmost in terms of boundary)
                                
                                if (piece.orientation === 0) {
                                    // Moving right with horizontal piece (→)
                                    if (rightmostPosition < (currentGameState.board[0].length - 1)) {
                                        piece.x += 1;
                                    }
                                } else {
                                    // Moving right with reversed horizontal piece (←)
                                    if (piece.x < (currentGameState.board[0].length - 1)) {
                                        piece.x += 1;
                                    }
                                }
                            } else {
                                // Vertical orientation (just check the single column)
                                if (piece.x < (currentGameState.board[0].length - 1)) {
                                    piece.x += 1;
                                }
                            }
                            break;
                        case 'move_down':
                            // Check bottom boundary based on piece orientation
                            if (piece.orientation === 90 || piece.orientation === 270) {
                                // Vertical orientation - need to account for piece length
                                const lowestPosition = piece.orientation === 90 ? 
                                    piece.y + (pieceLength - 1) : // For 90 degrees
                                    piece.y; // For 270 degrees
                                
                                if (piece.orientation === 90) {
                                    // Moving down with vertical piece (↓)
                                    if (lowestPosition < (currentGameState.board.length - 1)) {
                                        piece.y += 1;
                                    }
                                } else {
                                    // Moving down with reversed vertical piece (↑)
                                    if (piece.y < (currentGameState.board.length - 1)) {
                                        piece.y += 1;
                                    }
                                }
                            } else {
                                // Horizontal orientation (just check the single row)
                                if (piece.y < (currentGameState.board.length - 1)) {
                                    piece.y += 1;
                                }
                            }
                            break;
                        case 'rotate':
                            // Calculate new orientation
                            const newOrientation = (piece.orientation + 90) % 360;
                            
                            // Check if rotation would put piece out of bounds
                            let canRotate = true;
                            
                            // Horizontal to vertical rotation boundary check
                            if ((piece.orientation === 0 || piece.orientation === 180) && 
                                (newOrientation === 90 || newOrientation === 270)) {
                                // Check if vertical piece would extend below board
                                if (piece.y + pieceLength > currentGameState.board.length) {
                                    canRotate = false;
                                }
                            }
                            // Vertical to horizontal rotation boundary check
                            else if ((piece.orientation === 90 || piece.orientation === 270) && 
                                    (newOrientation === 0 || newOrientation === 180)) {
                                // Check if horizontal piece would extend beyond right edge
                                if (piece.x + pieceLength > currentGameState.board[0].length) {
                                    canRotate = false;
                                }
                            }
                            
                            if (canRotate) {
                                piece.orientation = newOrientation;
                            }
                            break;
                    }
                    
                    // Update only the piece position in our local state
                    currentGameState.currentPiece = piece;
                    renderGame();
                }
                
                return response;
            }
            
            // If there was an error but not circuit breaker, log it but don't crash
            if (response.error) {
                console.warn(`Error in action ${actionType}: ${response.error}`);
                // Still allow the game to continue
                return response;
            }
            
            // Normal case - update the game state with the server response
            updateGameState(response);
            
            // If there are matched positions, they will be shown with flashing animation
            // The api-client.js will handle sending the clear-matches request after animation
        }
        
        return response;
    } catch (error) {
        console.error(`Error handling action ${actionType}:`, error);
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            gameMessage.textContent = `Error: ${error.message}. Game will continue in limited mode.`;
        }
        
        // Return a minimal response to keep the game running
        return { success: false, error: error.message };
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
