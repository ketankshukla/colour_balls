# Colour Balls Game

A modern web-based Tetris-like game with falling colored balls built with Flask and JavaScript. Features unique gameplay where matching 3+ same-colored balls makes them disappear.

## Features

- Tetris-like gameplay with colored balls instead of traditional blocks
- Each piece is a straight line of 6 different colored balls
- Match 3+ same-colored balls (horizontally, vertically, or diagonally) to make them disappear
- Chain reactions when balls above empty spaces fall down
- Python-themed design with vibrant colors
- Responsive design for different screen sizes
- Flask backend with RESTful API
- Deployable to Vercel

## How to Run Locally

### Prerequisites

- Python 3.9 or higher
- Git (optional)

### Setup

1. Clone the repository:
   ```powershell
   git clone https://github.com/ketankshukla/colour_balls.git
   cd colour_balls
   ```

2. Create a virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

4. Run the application:
   ```powershell
   python index.py
   ```

5. Open your browser and navigate to: http://127.0.0.1:8080

## Game Controls

- **Left/Right Arrow Keys**: Move piece left/right
- **Down Arrow Key**: Move piece down faster
- **Up Arrow Key**: Rotate piece
- **Space**: Hard drop (instantly drop piece)
- **S**: Start the game
- **P**: Pause/resume game

## Game Rules

- New pieces are straight lines of 6 different colored balls
- Use arrow keys to move pieces left, right, and down
- When 3 or more same-colored balls align (horizontally, vertically, or diagonally), they disappear
- Balls above empty spaces fall down, potentially creating chain reactions
- The game ends when the board fills up and no new pieces can be placed
- Score points by clearing balls, with bonus points for chain reactions

## Technical Details

This game uses:
- **HTML5 Canvas**: For rendering the game
- **JavaScript ES6 Modules**: For modular frontend code
- **Flask**: For the backend server
- **RESTful API**: For game state management
- **Vercel**: For deployment

## Project Structure

```
colour_balls/
├── docs/                   # Documentation
│   ├── USER_GUIDE.md       # Guide for users
│   └── DEVELOPER_GUIDE.md  # Guide for developers
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
└── README.md               # This file
```

## Documentation

For more detailed information, check out:
- [User Guide](docs/USER_GUIDE.md) - Instructions for playing the game
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Guide for setting up and deploying the game

## Deployment

This application is configured for easy deployment to Vercel. See the [Developer Guide](docs/DEVELOPER_GUIDE.md) for detailed deployment instructions.

## License

MIT
