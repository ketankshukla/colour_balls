"""
Colour Balls Game Application
Main entry point for the Flask application
"""

import os
from flask import Flask, send_from_directory
from game_logic import GameState  # To be created
from api_routes import api, init_routes

def create_app():
    """Create and configure the Flask application"""
    # Initialize the Flask app
    app = Flask(__name__, static_folder='public', static_url_path='')
    
    # Initialize game state
    game_state = GameState()
    
    # Initialize API routes with game state
    init_routes(game_state)
    
    # Register the API blueprint
    app.register_blueprint(api, url_prefix='/api')
    
    # Define routes for serving static files
    @app.route('/')
    def serve_index():
        """Serve the main HTML page"""
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/<path:filename>')
    def serve_static_files(filename):
        """Serve static files from the public folder"""
        return send_from_directory(app.static_folder, filename)
    
    return app

# This file can be run directly or imported as a module
# The Vercel entry point (index.py) will call create_app()
if __name__ == '__main__':
    app = create_app()
    # Use a default port if not set in environment (for local development)
    port = int(os.environ.get("PORT", 5001)) 
    app.run(host='0.0.0.0', port=port, debug=True)
