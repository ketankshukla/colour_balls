"""
Colour Balls API Routes Module
Contains the Flask API endpoints for the game
"""

from flask import Blueprint, jsonify, request
import time
from game_logic import GameState 

# Create a Blueprint for the API routes
api = Blueprint('api', __name__, url_prefix='/api')

# Game state instance will be injected from app.py
game_state = None

def init_routes(game_state_instance):
    """Initialize the routes with the game state instance"""
    global game_state
    game_state = game_state_instance

@api.route('/state', methods=['GET'])
def get_state():
    """Get the current game state"""
    if game_state:
        return jsonify(game_state.get_state_dict())
    return jsonify({"error": "Game state not initialized"}), 500

@api.route('/action', methods=['POST'])
def handle_action():
    """Handle player actions (e.g., move, rotate, drop piece)"""
    if not game_state:
        return jsonify({"error": "Game state not initialized"}), 500

    if game_state.game_over:
        return jsonify({"error": "Game is over", "state": game_state.get_state_dict()}), 400
    
    data = request.get_json()
    action_type = data.get('type', '')
    action_data = data.get('data', {})
    
    # Validate action_type
    if not action_type:
        return jsonify({'error': 'Missing action type'}), 400
    
    # Special handling for start_game action
    if action_type == 'start_game':
        if game_state.game_started:
            return jsonify({'error': 'Game already started'}), 400
        
        # Start the game by generating the first pieces
        game_state.start_game()
        return jsonify(game_state.get_state_dict())
    
    # Ensure the game is started for gameplay actions
    if not game_state.game_started and action_type not in ['reset']:
        return jsonify({'error': 'Game not started yet. Press S to start.'}), 400
    
    # Special handling for actions that might create matches
    if action_type in ['move_down', 'hard_drop']:
        # First, perform the action to find matches
        result = game_state.perform_action(action_type, action_data, delay_clear=True)
        
        # If there are matched positions, send them to the frontend first
        if result.get('matchedPositions') and len(result['matchedPositions']) > 0:
            print(f"Found {len(result['matchedPositions'])} matches, sending to frontend first")
            
            # Return the result with matched positions but don't clear them yet
            return jsonify(result)
    
    # For all other actions, or if no matches were found
    result = game_state.perform_action(action_type, action_data)
    return jsonify(result)

@api.route('/clear-matches', methods=['POST'])
def clear_matches():
    """Clear matches after animation completes."""
    # This endpoint is called after the frontend animation completes
    # We need to clear the matches that were found earlier
    if not game_state.matched_positions:
        # No matches to clear
        return jsonify(game_state.get_state_dict())
    
    print(f"Clearing {len(game_state.matched_positions)} matches after animation")
    
    # Get the matched positions
    matched_positions = set(tuple(pos) for pos in game_state.matched_positions)
    
    # Clear the matches
    game_state._clear_matches(matched_positions)
    
    # Apply gravity
    game_state._apply_gravity()
    
    # Check for chain reactions
    chain_reaction_count = 0
    chain_matched_positions, chain_matches = game_state._find_matches()
    
    # If we found chain matches, return them for animation and don't spawn a new piece yet
    if chain_matches:
        print(f"Found chain reaction with {len(chain_matched_positions)} matches, sending to frontend for animation")
        game_state.matched_positions = list(chain_matched_positions)
        return jsonify(game_state.get_state_dict())
    
    # Update score
    base_score = len(matched_positions) * 10  # 10 points per match
    chain_bonus = chain_reaction_count * 50  # 50 points per chain reaction
    game_state.score += base_score + chain_bonus
    
    # Update level
    game_state.level = max(1, game_state.score // 1000 + 1)
    
    print(f"Cleared matches with {chain_reaction_count} chain reactions")
    print(f"Score: {game_state.score}, Level: {game_state.level}")
    
    # Clear the matched positions list
    game_state.matched_positions = []
    
    # Spawn a new piece after all matches are cleared
    game_state._spawn_new_piece()
    
    return jsonify(game_state.get_state_dict())

@api.route('/reset', methods=['POST'])
def reset_game_endpoint():
    """Reset the game to its initial state"""
    if game_state:
        game_state.reset()
        return jsonify(game_state.get_state_dict() | {
            "message": "Game reset."
        })
    return jsonify({"error": "Game state not initialized"}), 500
