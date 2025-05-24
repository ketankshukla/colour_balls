"""
Colour Balls Game - Vercel Compatibility Layer
This file serves as the entry point for Vercel deployment
"""

import os
from app import create_app

# Create the Flask application
app = create_app()

# This is required for Vercel serverless functions
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
