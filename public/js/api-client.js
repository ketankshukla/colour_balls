// public/js/api-client.js - API communication functions

// Base URL for API requests
const API_BASE_URL = '/api';

// Flag to track if we're currently waiting for an animation to complete
let waitingForAnimation = false;

// Animation timeout ID for safety mechanism
let animationTimeoutId = null;

// Maximum time to wait for animation before auto-reset (ms)
const MAX_ANIMATION_WAIT = 3000;

// Track if hard drop is in progress to prevent multiple hard drops
let hardDropInProgress = false;

// Global timeout to completely reset all locks and flags after a certain period
let globalResetTimeoutId = null;
const GLOBAL_RESET_TIMEOUT = 10000; // 10 seconds

// Track consecutive API failures for circuit breaker pattern
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
let circuitBreakerActive = false;
let circuitRecoveryTimeout = null;

/**
 * Safety function to reset animation lock if it gets stuck
 */
function resetAnimationLock() {
    if (waitingForAnimation) {
        console.warn('Animation lock safety triggered - resetting stuck animation lock');
        waitingForAnimation = false;
        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
    }
    
    // Also reset hard drop flag
    if (hardDropInProgress) {
        console.warn('Resetting stuck hard drop flag');
        hardDropInProgress = false;
    }
}

/**
 * Global reset function that resets all locks and flags
 * This is a last resort safety mechanism
 * @export
 */
export function globalReset() {
    console.warn('GLOBAL RESET triggered - resetting all locks and flags');
    
    // Reset animation lock
    waitingForAnimation = false;
    if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
        animationTimeoutId = null;
    }
    
    // Reset hard drop flag
    hardDropInProgress = false;
    
    // Reset circuit breaker
    if (circuitBreakerActive) {
        resetCircuitBreaker();
    }
    
    // Clear any pending global reset timeout
    if (globalResetTimeoutId) {
        clearTimeout(globalResetTimeoutId);
        globalResetTimeoutId = null;
    }
    
    // Display a message to the user
    const gameMessage = document.getElementById('game-message');
    if (gameMessage) {
        gameMessage.textContent = 'Game state reset. Continue playing.';
        // Clear the message after 3 seconds
        setTimeout(() => {
            if (gameMessage.textContent === 'Game state reset. Continue playing.') {
                gameMessage.textContent = '';
            }
        }, 3000);
    }
}

/**
 * Sets up the animation lock with safety timeout
 */
function setAnimationLock() {
    waitingForAnimation = true;
    
    // Clear any existing timeout
    if (animationTimeoutId) {
        clearTimeout(animationTimeoutId);
    }
    
    // Set a safety timeout to prevent permanently stuck animation
    animationTimeoutId = setTimeout(() => {
        resetAnimationLock();
        console.warn('Animation lock timed out after ' + MAX_ANIMATION_WAIT + 'ms');
    }, MAX_ANIMATION_WAIT);
    
    // Set up a global reset timeout as a last resort
    if (globalResetTimeoutId) {
        clearTimeout(globalResetTimeoutId);
    }
    
    globalResetTimeoutId = setTimeout(() => {
        globalReset();
    }, GLOBAL_RESET_TIMEOUT);
}

/**
 * Reset the circuit breaker after a recovery period
 */
function resetCircuitBreaker() {
    console.log('Resetting circuit breaker, attempting to resume normal API operations');
    circuitBreakerActive = false;
    consecutiveFailures = 0;
}

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
    // If circuit breaker is active, don't send API requests except for critical actions
    if (circuitBreakerActive && !['start_game', 'reset'].includes(actionType)) {
        console.warn(`Circuit breaker active - local fallback for action: ${actionType}`);
        // Return a minimal response to keep the game running
        return { success: false, circuitBreakerActive: true };
    }

    // If we're waiting for an animation to complete, don't send new actions
    // (except for hard_drop which should interrupt)
    if (waitingForAnimation && actionType !== 'hard_drop') {
        console.log('Ignoring action while animation is in progress:', actionType);
        return null;
    }
    
    // Special handling for hard_drop
    if (actionType === 'hard_drop') {
        // Prevent multiple simultaneous hard drops
        if (hardDropInProgress) {
            console.warn('Hard drop already in progress, ignoring duplicate request');
            return { success: false, message: 'Hard drop already in progress' };
        }
        
        // Force reset any existing animation lock
        if (waitingForAnimation) {
            resetAnimationLock();
        }
        
        // Set the hard drop flag
        hardDropInProgress = true;
        
        // Set a safety timeout to reset the hard drop flag
        setTimeout(() => {
            if (hardDropInProgress) {
                console.warn('Hard drop safety timeout triggered');
                hardDropInProgress = false;
            }
        }, 5000); // 5 second safety timeout
    }
    
    try {
        // Use fetch with timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_BASE_URL}/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: actionType,
                data: actionData,
            }),
            signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${errorData.error || response.statusText}`);
        }

        // Reset consecutive failures on success
        consecutiveFailures = 0;
        
        // If circuit breaker was active and we got a successful response, reset it
        if (circuitBreakerActive) {
            resetCircuitBreaker();
        }
        
        // If this was a hard drop action, reset the flag
        if (actionType === 'hard_drop') {
            hardDropInProgress = false;
        }

        const result = await response.json();
        
        // Check if there are matched positions that need animation
        if (result.matchedPositions && result.matchedPositions.length > 0) {
            console.log('Received matched positions, will start animation');
            // Use the safer animation lock mechanism
            setAnimationLock();
            
            // After the animation completes (1.5 seconds), send a follow-up action to clear the matches
            setTimeout(async () => {
                console.log('Animation complete, clearing matches');
                try {
                    await sendClearMatches();
                } catch (error) {
                    console.error('Error during clear matches:', error);
                } finally {
                    // Always reset animation lock when done, even if there was an error
                    resetAnimationLock();
                }
            }, 1500); // Animation takes about 1.2s, add a little buffer
        }
        
        return result;
    } catch (error) {
        // Increment failure counter and check if we should activate circuit breaker
        consecutiveFailures++;
        console.error(`Error sending action (failure #${consecutiveFailures}):`, error);
        
        // If this was a hard drop action, reset the flag
        if (actionType === 'hard_drop') {
            hardDropInProgress = false;
        }
        
        // Display user-friendly error message
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            if (error.name === 'AbortError') {
                gameMessage.textContent = 'Network request timed out. Game will continue.'; 
            } else {
                gameMessage.textContent = 'Connection issue. Game will continue in limited mode.';
            }
        }
        
        // If we've had too many consecutive failures, activate circuit breaker
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !circuitBreakerActive) {
            console.warn('Too many consecutive API failures - activating circuit breaker');
            circuitBreakerActive = true;
            
            // Try to recover after 30 seconds
            if (circuitRecoveryTimeout) {
                clearTimeout(circuitRecoveryTimeout);
            }
            
            circuitRecoveryTimeout = setTimeout(() => {
                resetCircuitBreaker();
            }, 30000); // 30 seconds recovery time
        }
        
        // Return a minimal response to keep the game running
        return { success: false, error: error.message };
    }
}

/**
 * Sends a request to clear matches after animation completes.
 * @returns {Promise<object>} The updated game state.
 */
async function sendClearMatches() {
    // If circuit breaker is active, return a minimal response
    if (circuitBreakerActive) {
        console.warn('Circuit breaker active - skipping clear-matches request');
        return { success: false, circuitBreakerActive: true };
    }

    try {
        // Use fetch with timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${API_BASE_URL}/clear-matches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${errorData.error || response.statusText}`);
        }

        // Reset consecutive failures on success
        consecutiveFailures = 0;
        
        // If circuit breaker was active and we got a successful response, reset it
        if (circuitBreakerActive) {
            resetCircuitBreaker();
        }
        
        // If this was a hard drop action, reset the flag
        if (actionType === 'hard_drop') {
            hardDropInProgress = false;
        }

        const result = await response.json();
        
        // Check if there are more matched positions (chain reaction)
        if (result.matchedPositions && result.matchedPositions.length > 0) {
            console.log('Chain reaction detected! More matches to animate');
            
            // Use the safer animation lock mechanism
            setAnimationLock();
            
            // Start another animation cycle for the chain reaction
            setTimeout(async () => {
                console.log('Chain reaction animation complete, clearing matches');
                try {
                    await sendClearMatches(); // Recursively call to handle multiple chain reactions
                } catch (error) {
                    console.error('Error during chain reaction clear:', error);
                } finally {
                    // Always reset animation lock when done, even if there was an error
                    resetAnimationLock();
                }
            }, 1500); // Animation takes about 1.2s, add a little buffer
            
            return result;
        }
        
        return result;
    } catch (error) {
        // Increment failure counter and check if we should activate circuit breaker
        consecutiveFailures++;
        console.error(`Error clearing matches (failure #${consecutiveFailures}):`, error);
        
        // Reset hard drop flag in case it's still set
        if (hardDropInProgress) {
            hardDropInProgress = false;
        }
        
        // Display user-friendly error message
        const gameMessage = document.getElementById('game-message');
        if (gameMessage) {
            if (error.name === 'AbortError') {
                gameMessage.textContent = 'Network request timed out. Game will continue.'; 
            } else {
                gameMessage.textContent = 'Connection issue. Game will continue in limited mode.';
            }
        }
        
        // If we've had too many consecutive failures, activate circuit breaker
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !circuitBreakerActive) {
            console.warn('Too many consecutive API failures - activating circuit breaker');
            circuitBreakerActive = true;
            
            // Try to recover after 30 seconds
            if (circuitRecoveryTimeout) {
                clearTimeout(circuitRecoveryTimeout);
            }
            
            circuitRecoveryTimeout = setTimeout(() => {
                resetCircuitBreaker();
            }, 30000); // 30 seconds recovery time
        }
        
        // Return a minimal response to keep the game running
        resetAnimationLock(); // Make sure to reset the lock on error
        return { success: false, error: error.message };
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
