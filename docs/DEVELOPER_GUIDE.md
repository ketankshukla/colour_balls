# Developer Guide: Colour Balls

## Project Overview

Colour Balls is a Tetris-like game with a unique twist: instead of traditional Tetris blocks, players manipulate lines of colored balls and match 3+ same-colored balls to make them disappear. This guide provides technical details for developers who want to understand, modify, or extend the game.

## Architecture

The project follows a modular architecture with clear separation between frontend and backend:

- **Backend**: Flask-based Python server providing game logic and API endpoints
- **Frontend**: Vanilla JavaScript using ES6 modules for client-side rendering and user interaction
- **Communication**: RESTful API for state management between frontend and backend

## Project Structure

`
colour_balls/
├── docs/                   # Documentation
│   ├── USER_GUIDE.md       # Guide for users
│   └── DEVELOPER_GUIDE.md  # This file
├── public/                 # Static files
│   ├── index.html          # Main HTML page
│   ├── js/                 # JavaScript modules
│   │   ├── api-client.js   # API communication
│   │   ├── board.js        # Board rendering
│   │   ├── game-state.js   # Game state management
│   │   ├── main.js         # Application entry point
│   │   └── ui-controller.js # UI event handling
│   └── style.css           # CSS styles
├── app.py                  # Flask application factory
├── api_routes.py           # API endpoints as Blueprint
├── game_logic.py           # Core game mechanics
├── index.py                # Vercel entry point
├── requirements.txt        # Python dependencies
├── vercel.json             # Vercel configuration
└── README.md               # Project overview
`

## Backend Components

- **app.py**: Flask application factory that initializes the GameState and registers API routes. Serves static files and the main HTML page.
  
- **api_routes.py**: Defines a Flask Blueprint with API endpoints:
  - GET /api/state: Returns the current game state
  - POST /api/action: Processes player actions (move, rotate, drop)
  - POST /api/reset: Resets the game state
  
- **game_logic.py**: Contains the GameState class that manages:
  - Board state and dimensions
  - Piece generation and movement
  - Collision detection
  - Match detection (horizontal, vertical, diagonal)
  - Gravity effects when balls are cleared
  - Scoring logic
  
- **index.py**: Vercel entry point that imports and runs the Flask application.

## Frontend Components

Located in the public/ directory:

- **index.html**: Main game page with canvas element and script imports.

- **style.css**: CSS styles for the game interface.

- **js/main.js**: Main entry point that initializes the game and manages the start screen.

- **js/board.js**: Handles rendering of the game board, pieces, and animations.

- **js/game-state.js**: Client-side representation of the game state, syncs with the backend.

- **js/ui-controller.js**: Manages user input (keyboard events) and game loop.

- **js/api-client.js**: Handles communication with the backend API endpoints.

## Game Mechanics Implementation

- **Piece Generation**: Each piece is a line of 6 balls with random colors.

- **Movement**: Pieces can move left, right, down, and rotate.

- **Matching**: After a piece is placed, the game checks for 3+ same-colored balls in horizontal, vertical, and diagonal directions.

- **Gravity**: When balls are cleared, balls above them fall down, potentially creating chain reactions.

- **Scoring**: Points are awarded based on the number of balls cleared and chain reactions.

## Local Development

1. Clone the repository:
   `powershell
   git clone https://github.com/ketankshukla/colour_balls.git
   cd colour_balls
   `

2. Create a virtual environment:
   `powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   `

3. Install dependencies:
   `powershell
   pip install -r requirements.txt
   `

4. Run the application:
   `powershell
   python index.py
   `

5. Open your browser and navigate to: http://127.0.0.1:8080

## Deployment

The application is configured for deployment on Vercel:

1. Install Vercel CLI:
   `powershell
   npm install -g vercel
   `

2. Deploy to Vercel:
   `powershell
   vercel
   `

3. For production deployment:
   `powershell
   vercel --prod
   `

## Customization Options

- **Board Dimensions**: Modify BOARD_WIDTH and BOARD_HEIGHT in game_logic.py.
- **Colors**: Change the ball colors in oard.js.
- **Game Speed**: Adjust the initial speed and level progression in game_logic.py.
- **Scoring**: Modify the scoring algorithm in game_logic.py.

## Testing

While there are no automated tests included, you can manually test:

1. Game initialization
2. Piece movement and rotation
3. Collision detection
4. Match detection (horizontal, vertical, diagonal)
5. Gravity effects and chain reactions
6. Scoring
7. Game over conditions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Troubleshooting

- If the server fails to start, check that port 8080 is available
- If pieces don't render correctly, check the canvas dimensions in oard.js
- For API issues, check the browser console for error messages
