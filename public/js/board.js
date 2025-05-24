// public/js/board.js - Board rendering

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30; // pixels

// Define colors: first is empty, next 6 are for ball types
const EMPTY_COLOR = '#000000'; // Black for empty cells or canvas background
const BALL_COLORS = [
    EMPTY_COLOR,
    '#FF4136', // Red
    '#2ECC40', // Green
    '#0074D9', // Blue
    '#FFDC00', // Yellow
    '#B10DC9', // Purple
    '#FF851B', // Orange
    // Add more if pieces can have more than 6 unique colors, or for special items
];

// Flashing animation variables
let flashingCells = []; // Array of cells that should flash
let flashingOn = true; // Toggle for flash state
let flashingInterval = null; // Interval ID for flashing animation
let flashCount = 0; // Counter for flash cycles

let mainCanvas, mainCtx;
let nextCanvas, nextCtx;

/**
 * Initializes the board module with canvas elements.
 * @param {string} canvasId - The ID of the main game canvas.
 * @param {string} nextCanvasId - The ID of the next piece canvas.
 */
export function init(canvasId = 'game-canvas', nextCanvasId = 'next-piece-canvas') {
    mainCanvas = document.getElementById(canvasId);
    mainCtx = mainCanvas.getContext('2d');
    mainCanvas.width = COLS * BLOCK_SIZE;
    mainCanvas.height = ROWS * BLOCK_SIZE;

    nextCanvas = document.getElementById(nextCanvasId);
    nextCtx = nextCanvas.getContext('2d');
    // Piece is 3 balls long. Display horizontally with 1 block padding on each side vertically.
    nextCanvas.width = 3 * BLOCK_SIZE;
    nextCanvas.height = 1 * BLOCK_SIZE; // Height for one row of balls

    clearCanvas(mainCtx, mainCanvas.width, mainCanvas.height);
    clearCanvas(nextCtx, nextCanvas.width, nextCanvas.height);
    console.log('Board initialized. Main canvas:', mainCanvas.width, 'x', mainCanvas.height);
    console.log('Next piece canvas:', nextCanvas.width, 'x', nextCanvas.height);
}

/**
 * Clears a canvas context.
 * @param {CanvasRenderingContext2D} ctx - The context to clear.
 * @param {number} width - The width of the area to clear.
 * @param {number} height - The height of the area to clear.
 */
function clearCanvas(ctx, width, height) {
    ctx.fillStyle = EMPTY_COLOR;
    ctx.fillRect(0, 0, width, height);
}

/**
 * Draws a single block (ball) at the specified grid position.
 * @param {CanvasRenderingContext2D} ctx - The drawing context.
 * @param {number} col - Grid column.
 * @param {number} row - Grid row.
 * @param {number} colorIndex - Index into BALL_COLORS array.
 * @param {boolean} [highlighted=false] - Whether to draw the block in a highlighted state.
 */
function drawBlock(ctx, col, row, colorIndex, highlighted = false) {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const color = BALL_COLORS[colorIndex] || EMPTY_COLOR;

    // For highlighted state (flashing), we'll draw a brighter version
    if (highlighted) {
        // Draw a white glow around the ball
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x + BLOCK_SIZE/2, y + BLOCK_SIZE/2, BLOCK_SIZE/2 + 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw the ball as a circle instead of a square
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + BLOCK_SIZE/2, y + BLOCK_SIZE/2, BLOCK_SIZE/2 - 1, 0, Math.PI * 2);
    ctx.fill();

    // Add a highlight to make the ball look more 3D
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + BLOCK_SIZE/2 - BLOCK_SIZE/6, y + BLOCK_SIZE/2 - BLOCK_SIZE/6, BLOCK_SIZE/6, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Draws the entire game board based on the boardData.
 * @param {Array<Array<number>>} boardData - 2D array representing the board state.
 *                                            Each cell contains a colorIndex.
 * @param {Array<Array<number>>} matchedPositions - Array of [row, col] positions that should flash.
 */
export function drawBoard(boardData, matchedPositions = []) {
    clearCanvas(mainCtx, mainCanvas.width, mainCanvas.height);
    if (!boardData || boardData.length === 0) return;

    // Update the flashing cells if new matched positions are provided and not empty
    if (matchedPositions && matchedPositions.length > 0) {
        console.log('drawBoard received matchedPositions:', matchedPositions);
        startFlashingAnimation(matchedPositions, boardData);
    }

    // Draw the board cells
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (boardData[row] && boardData[row][col] !== 0) { // 0 is empty
                // Check if this cell should be flashing
                const isFlashing = flashingCells.some(cell => 
                    cell.row === row && cell.col === col);
                
                // If cell is flashing and we're in the 'off' state of the flash cycle, skip drawing
                if (isFlashing && !flashingOn) {
                    // Skip drawing this cell when flash is in 'off' state
                    continue;
                }
                
                // Draw the cell with its color (possibly highlighted if flashing)
                const colorIndex = boardData[row][col];
                if (isFlashing && flashingOn) {
                    // Draw with a brighter version for the 'on' state
                    drawBlock(mainCtx, col, row, colorIndex, true); // true = highlighted
                } else {
                    // Draw normally
                    drawBlock(mainCtx, col, row, colorIndex, false);
                }
            }
        }
    }
}

/**
 * Starts the flashing animation for matched cells.
 * @param {Array<Array<number>>} matchedPositions - Array of [row, col] positions that should flash.
 * @param {Array<Array<number>>} boardData - The current board data.
 */
function startFlashingAnimation(matchedPositions, boardData) {
    // Stop any existing flashing animation
    stopFlashingAnimation();
    
    console.log('Starting flash animation for positions:', matchedPositions);
    
    // Only proceed if we have valid matched positions
    if (!matchedPositions || matchedPositions.length === 0) {
        console.log('No matched positions to flash');
        return;
    }
    
    // Convert matched positions to an array of cell objects with their colors
    flashingCells = [];
    for (let i = 0; i < matchedPositions.length; i++) {
        const pos = matchedPositions[i];
        if (Array.isArray(pos) && pos.length === 2) {
            const row = pos[0];
            const col = pos[1];
            if (boardData[row] && boardData[row][col] !== undefined) {
                flashingCells.push({
                    row: row,
                    col: col,
                    color: boardData[row][col]
                });
            }
        }
    }
    
    console.log('Converted to flashingCells:', flashingCells);
    
    // Only start animation if there are cells to flash
    if (flashingCells.length > 0) {
        flashCount = 0;
        flashingOn = true;
        
        // Flash 6 times (3 on, 3 off) over 1.2 seconds (200ms each)
        flashingInterval = setInterval(() => {
            flashingOn = !flashingOn;
            flashCount++;
            
            console.log(`Flash cycle ${flashCount}/6, flashingOn: ${flashingOn}`);
            
            // Redraw the board with the current flash state
            // We need to pass an empty array here to avoid infinite recursion
            drawBoard(boardData, []);
            
            // Stop after 6 flashes (3 complete cycles)
            if (flashCount >= 6) {
                stopFlashingAnimation();
            }
        }, 200);
    }
}

/**
 * Stops the flashing animation.
 */
function stopFlashingAnimation() {
    if (flashingInterval) {
        clearInterval(flashingInterval);
        flashingInterval = null;
    }
    flashingCells = [];
    flashingOn = true;
}

/**
 * Draws a game piece (line of 6 balls) on a given context.
 * @param {CanvasRenderingContext2D} ctx - The drawing context.
 * @param {Object} piece - The piece object { colors: [c1,c2,...c6], x: col, y: row, orientation: 0/90/180/270 }.
 *                         'colors' is an array of 6 color indices.
 *                         'x', 'y' are the board coordinates of the reference point of the piece.
 *                         'orientation' is in degrees: 0, 90, 180, or 270.
 */
export function drawPiece(ctx, piece) {
    if (!piece || !piece.colors) return;

    const { colors, x, y, orientation } = piece;
    
    // Debug log for piece orientation
    // console.log(`Drawing piece at (${x}, ${y}) with orientation: ${orientation}°, colors:`, colors);

    for (let i = 0; i < colors.length; i++) {
        const ballColorIndex = colors[i];
        let drawX = x, drawY = y;
        
        // Calculate position based on orientation
        switch (orientation) {
            case 0: // 0 degrees (horizontal →)
                drawX = x + i;
                drawY = y;
                break;
            case 90: // 90 degrees (vertical ↓)
                drawX = x;
                drawY = y + i;
                break;
            case 180: // 180 degrees (horizontal ←)
                drawX = x - i;
                drawY = y;
                break;
            case 270: // 270 degrees (vertical ↑)
                drawX = x;
                drawY = y - i;
                break;
            default: // Fallback to horizontal if orientation is invalid
                drawX = x + i;
                drawY = y;
                break;
        }
        
        drawBlock(ctx, drawX, drawY, ballColorIndex);
    }
}

/**
 * Draws the current falling piece on the main game canvas.
 * @param {Object} piece - The current piece object.
 */
export function drawCurrentPiece(piece) {
    // Note: drawBoard should be called first to clear and draw static blocks.
    // Then drawCurrentPiece overlays the moving piece.
    if (piece) {
        drawPiece(mainCtx, piece);
    }
}


/**
 * Draws the next piece on the next-piece-canvas.
 * The piece is assumed to be horizontal for display here.
 * @param {Array<number>} pieceColors - Array of 3 color indices for the next piece.
 */
export function drawNextPiece(pieceColors) {
    clearCanvas(nextCtx, nextCanvas.width, nextCanvas.height);
    if (!pieceColors || pieceColors.length !== 3) return;

    // Draw the 3 balls horizontally in the small canvas
    // Centered vertically (since canvas height is 1 * BLOCK_SIZE)
    for (let i = 0; i < pieceColors.length; i++) {
        drawBlock(nextCtx, i, 0, pieceColors[i]);
    }
}

console.log('Board module loaded. COLS:', COLS, 'ROWS:', ROWS, 'BLOCK_SIZE:', BLOCK_SIZE);
