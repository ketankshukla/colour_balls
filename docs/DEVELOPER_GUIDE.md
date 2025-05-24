# Developer Guide: Colour Balls

## Project Structure

[Details about backend and frontend structure]

## Backend

- `app.py`: Main Flask application setup.
- `api_routes.py`: Defines API endpoints.
- `game_logic.py`: Core game logic and state management.
- `ai_engine.py`: AI logic (if applicable).
- `index.py`: Vercel entry point.

## Frontend

Located in `public/`:
- `index.html`: Main game page.
- `style.css`: Styles for the game.
- `js/main.js`: Main entry point for JavaScript, initializes the game.
- `js/board.js`: Handles rendering of the game board and pieces.
- `js/game-state.js`: Manages the game's state.
- `js/ui-controller.js`: Handles user input and UI updates.
- `js/api-client.js`: Manages communication with the backend API.

## Deployment

Configured for Vercel via `vercel.json`.
