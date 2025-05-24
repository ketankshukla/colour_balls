// public/js/api-client.js - API communication functions

// Base URL for API requests
const API_BASE_URL = '/api';

// Flag to track if we're currently waiting for an animation to complete
let waitingForAnimation = false;

/**
 * Fetches the current game state from the server.
 * @returns {Promise<Object>} The game state.
 */
export async function getGameState() {
    try {
        const response = await fetch(`${API_BASE_URL}/state`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching game state:', error);
        throw error;
    }
}

/**
 * Sends a player action to the server.
 * @param {string} actionType - The type of action (e.g., 'move_left', 'rotate').
 * @param {object} [actionData={}] - Additional data for the action (if any).
 * @returns {Promise<object>} The updated game state.
 */
export async function sendAction(actionType, actionData = {}) {
    // If we're waiting for an animation to complete, don't send new actions
    // (except for hard_drop which should interrupt)
    if (waitingForAnimation && actionType !== 'hard_drop') {
        console.log('Ignoring action while animation is in progress:', actionType);
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: actionType,
                data: actionData,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        
        // Check if there are matched positions that need animation
        if (result.matchedPositions && result.matchedPositions.length > 0) {
            console.log('Received matched positions, will start animation');
            waitingForAnimation = true;
            
            // After the animation completes (1.5 seconds), send a follow-up action to clear the matches
            setTimeout(async () => {
                console.log('Animation complete, clearing matches');
                await sendClearMatches();
                waitingForAnimation = false;
            }, 1500); // Animation takes about 1.2s, add a little buffer
        }
        
        return result;
    } catch (error) {
        console.error('Error sending action:', error);
        throw error;
    }
}

/**
 * Sends a request to clear matches after animation completes.
 * @returns {Promise<object>} The updated game state.
 */
async function sendClearMatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/clear-matches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        
        // Check if there are more matched positions (chain reaction)
        if (result.matchedPositions && result.matchedPositions.length > 0) {
            console.log('Chain reaction detected! More matches to animate');
            
            // Start another animation cycle for the chain reaction
            setTimeout(async () => {
                console.log('Chain reaction animation complete, clearing matches');
                await sendClearMatches(); // Recursively call to handle multiple chain reactions
                waitingForAnimation = false;
            }, 1500); // Animation takes about 1.2s, add a little buffer
            
            return result;
        }
        
        return result;
    } catch (error) {
        console.error('Error clearing matches:', error);
        throw error;
    }
}

/**
 * Sends a request to reset the game on the server.
 * @returns {Promise<Object>} The initial game state after reset.
 */
export async function resetGame() {
    try {
        const response = await fetch(`${API_BASE_URL}/reset`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error resetting game:', error);
        throw error;
    }
}

console.log('API client module loaded');
