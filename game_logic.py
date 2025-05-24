# game_logic.py - Core game mechanics for Colour Balls

# Constants for game dimensions (placeholders, to be matched with Tetris UI)
BOARD_WIDTH = 10
BOARD_HEIGHT = 20

import random

class GameState:
    BOARD_WIDTH = 10
    BOARD_HEIGHT = 20
    NUM_BALL_COLORS = 3 # Number of distinct ball colors in a piece
    AVAILABLE_COLORS = list(range(1, 7)) # Keep 6 different colors available [1, 2, 3, 4, 5, 6]

    def __init__(self):
        self.matched_positions = []  # List of positions that should flash before disappearing
        self.reset()

    def _generate_new_piece_colors(self):
        """Generates a list of NUM_BALL_COLORS unique random color indices."""
        # For Colour Balls, each piece has 6 *different* colored balls.
        if self.NUM_BALL_COLORS > len(self.AVAILABLE_COLORS):
            # This case should ideally not happen if NUM_BALL_COLORS is set correctly
            # Fallback to allowing repeats if we ask for more unique colors than available
            return random.choices(self.AVAILABLE_COLORS, k=self.NUM_BALL_COLORS)
        return random.sample(self.AVAILABLE_COLORS, self.NUM_BALL_COLORS)

    def _is_collision(self, piece_colors, x, y, orientation):
        """Checks if a piece at the given position and orientation would collide with board boundaries or other pieces.
        
        Args:
            piece_colors: List of color indices for the piece
            x: Column position to check
            y: Row position to check
            orientation: 0, 90, 180, or 270 degrees
            
        Returns:
            True if collision detected, False otherwise
        """
        if not piece_colors:
            return False  # No piece to check
            
        for i in range(len(piece_colors)):
            # Calculate the position of each ball in the piece based on orientation
            check_x, check_y = x, y
            
            # Apply offsets based on orientation
            if orientation == 0:  # 0 degrees (horizontal →)
                check_x += i
            elif orientation == 90:  # 90 degrees (vertical ↓)
                check_y += i
            elif orientation == 180:  # 180 degrees (horizontal ←)
                check_x -= i
            elif orientation == 270:  # 270 degrees (vertical ↑)
                check_y -= i
                
            # Check board boundaries
            if (check_x < 0 or check_x >= self.BOARD_WIDTH or 
                check_y < 0 or check_y >= self.BOARD_HEIGHT):
                return True  # Out of bounds
                
            # Check collision with existing pieces on the board
            if self.board[check_y][check_x] != 0:  # 0 means empty
                return True  # Collision with existing piece
                
        return False  # No collision detected

    def _spawn_new_piece(self):
        """Moves the next_piece_colors to current_piece and generates new next_piece_colors."""
        # Calculate initial position (centered horizontally)
        spawn_x = self.BOARD_WIDTH // 2 - self.NUM_BALL_COLORS // 2
        spawn_y = 0
        orientation = 0  # 0 degrees (horizontal)
        
        # Create the new piece
        self.current_piece = {
            'colors': self.next_piece_colors,  # Use the previously generated next piece colors
            'x': spawn_x,
            'y': spawn_y,
            'orientation': orientation
        }
        
        # Generate colors for the next piece
        self.next_piece_colors = self._generate_new_piece_colors()
        
        # Check if the new piece collides immediately (game over condition)
        if self._is_collision(self.current_piece['colors'], spawn_x, spawn_y, orientation):
            self.game_over = True
            print("Game over: New piece cannot be placed.")

    def reset(self):
        self.board = [[0 for _ in range(self.BOARD_WIDTH)] for _ in range(self.BOARD_HEIGHT)]
        self.score = 0
        self.level = 1
        self.game_over = False
        self.current_piece = None
        self.next_piece_colors = None
        self.matched_positions = []
        self.game_started = False
        print("Game state reset")
        
    def start_game(self):
        """Start the game by generating the first pieces."""
        if not self.game_started and not self.game_over:
            self.next_piece_colors = self._generate_new_piece_colors() # Generate first next piece
            self._spawn_new_piece() # Spawn the first current piece, and generate the subsequent next piece
            self.game_started = True
            print("Game started")
            return True
        return False

    def perform_action(self, action_type, data=None, delay_clear=False):
        if self.game_over and action_type != 'reset':
            return self.get_state_dict()

        print(f"Performing action: {action_type} with data: {data}")
        if not self.current_piece:  # Should not happen if game is running
            return self.get_state_dict()

        # Extract current piece data for easier access
        colors = self.current_piece['colors']
        current_x = self.current_piece['x']
        current_y = self.current_piece['y']
        current_orientation = self.current_piece['orientation']

        if action_type == 'move_left':
            # Check if moving left would cause a collision
            new_x = current_x - 1
            if not self._is_collision(colors, new_x, current_y, current_orientation):
                self.current_piece['x'] = new_x
                print(f"Piece moved left to x={new_x}")
            else:
                print("Cannot move left: collision detected")
                
        elif action_type == 'move_right':
            # Check if moving right would cause a collision
            new_x = current_x + 1
            if not self._is_collision(colors, new_x, current_y, current_orientation):
                self.current_piece['x'] = new_x
                print(f"Piece moved right to x={new_x}")
            else:
                print("Cannot move right: collision detected")
                
        elif action_type == 'rotate':
            # Rotate 90 degrees clockwise (0 -> 90 -> 180 -> 270 -> 0)
            new_orientation = (current_orientation + 90) % 360
            
            # Debug current state
            print(f"Attempting rotation from {current_orientation}° to {new_orientation}°")
            print(f"Current piece position: ({current_x}, {current_y})")
            
            # Check if the rotated piece would cause a collision
            collision = self._is_collision(colors, current_x, current_y, new_orientation)
            
            if not collision:
                # Update the orientation
                self.current_piece['orientation'] = new_orientation
                print(f"Piece successfully rotated to {new_orientation} degrees")
            else:
                # Try wall kicks - adjust position if rotation at current position causes collision
                # For 180° rotation (piece pointing left), we might need to move right
                if new_orientation == 180:
                    # Try moving right to make space
                    for offset in range(1, self.NUM_BALL_COLORS):
                        if not self._is_collision(colors, current_x + offset, current_y, new_orientation):
                            self.current_piece['x'] = current_x + offset
                            self.current_piece['orientation'] = new_orientation
                            print(f"Piece rotated to {new_orientation}° with right wall kick of {offset}")
                            return self.get_state_dict()
                
                # For 0° rotation (piece pointing right), we might need to move left
                elif new_orientation == 0:
                    # Try moving left to make space
                    for offset in range(1, self.NUM_BALL_COLORS):
                        if not self._is_collision(colors, current_x - offset, current_y, new_orientation):
                            self.current_piece['x'] = current_x - offset
                            self.current_piece['orientation'] = new_orientation
                            print(f"Piece rotated to {new_orientation}° with left wall kick of {offset}")
                            return self.get_state_dict()
                
                print(f"Cannot rotate to {new_orientation} degrees: collision detected and wall kicks failed")
                
        elif action_type == 'move_down':  # Soft drop
            # Check if moving down would cause a collision
            new_y = current_y + 1
            if not self._is_collision(colors, current_x, new_y, current_orientation):
                self.current_piece['y'] = new_y
                print(f"Piece moved down to y={new_y}")
            else:
                # Collision detected, lock the piece in its current position
                print("Collision detected below, locking piece")
                self.lock_piece(delay_clear)  # Pass the delay_clear parameter
                self._spawn_new_piece()  # Spawn a new piece
                # Game over check is done in _spawn_new_piece
                
        elif action_type == 'hard_drop':
            # Move the piece down until it collides
            drop_y = current_y
            while not self._is_collision(colors, current_x, drop_y + 1, current_orientation):
                drop_y += 1
            
            # Update position and lock
            if drop_y != current_y:  # Only update if it actually moved
                self.current_piece['y'] = drop_y
                print(f"Piece hard dropped to y={drop_y}")
            
            # Lock the piece but don't spawn a new one yet
            # The new piece will be spawned after matches are cleared
            self.lock_piece(delay_clear)  # Pass the delay_clear parameter

        return self.get_state_dict()

    def lock_piece(self, delay_clear=False):
        """Locks the current piece onto the board.
        
        Args:
            delay_clear (bool): If True, only find matches but don't clear them yet.
                               This allows the frontend to show the flashing animation.
        """
        if not self.current_piece:
            return
            
        print(f"Locking piece: {self.current_piece}")
        colors = self.current_piece['colors']
        px, py = self.current_piece['x'], self.current_piece['y']
        orientation = self.current_piece['orientation']

        # Place each ball of the piece onto the board
        for i in range(len(colors)):
            ball_color = colors[i]
            board_x, board_y = px, py

            # Apply offsets based on orientation
            if orientation == 0:  # 0 degrees (horizontal →)
                board_x += i
            elif orientation == 90:  # 90 degrees (vertical ↓)
                board_y += i
            elif orientation == 180:  # 180 degrees (horizontal ←)
                board_x -= i
            elif orientation == 270:  # 270 degrees (vertical ↑)
                board_y -= i

            # Safety checks - these should never fail with proper collision detection
            if 0 <= board_x < self.BOARD_WIDTH and 0 <= board_y < self.BOARD_HEIGHT:
                if self.board[board_y][board_x] == 0:  # Only lock if cell is empty
                    self.board[board_y][board_x] = ball_color
                else:
                    # This should never happen with proper collision detection
                    print(f"Warning: Collision during lock at ({board_x}, {board_y})")
            else:
                # This should never happen with proper collision detection
                print(f"Warning: Piece out of bounds during lock at ({board_x}, {board_y})")
        
        # After locking, check for matches and apply gravity
        self.update_game_state(delay_clear)

    def update_game_state(self, delay_clear=False):
        """Updates the game state after a piece is locked.
        Checks for matches, clears them, makes balls fall, and updates score.
        
        Args:
            delay_clear (bool): If True, only find matches but don't clear them yet.
                               This allows the frontend to show the flashing animation.
        """
        # Check for 3+ alignments
        matched_positions, matches_found = self._find_matches()
        
        # Store matched positions for frontend to animate
        self.matched_positions = list(matched_positions) if matched_positions else []
        
        # If we're delaying the clear, just return after finding matches
        # Don't spawn a new piece yet - we'll do that after the matches are cleared
        if delay_clear and matches_found:
            print(f"Found {len(matched_positions)} matches, delaying clear for animation")
            return
        
        if matches_found:
            # Clear the matched positions
            self._clear_matches(matched_positions)
            
            # Make balls above empty spaces fall down
            self._apply_gravity()
            
            # Check for chain reactions (matches created by falling balls)
            chain_reaction_count = 0
            while True:
                chain_matched_positions, chain_matches = self._find_matches()
                if not chain_matches:
                    break
                
                # Add chain reaction matches to the matched positions list
                self.matched_positions.extend(list(chain_matched_positions))
                
                # Clear the chain matches
                self._clear_matches(chain_matched_positions)
                
                chain_reaction_count += 1
                self._apply_gravity()
            
            # Update score based on matches and chain reactions
            # More points for chain reactions
            base_score = matches_found * 10  # 10 points per match
            chain_bonus = chain_reaction_count * 50  # 50 points per chain reaction
            self.score += base_score + chain_bonus
            
            # Update level every 1000 points
            self.level = max(1, self.score // 1000 + 1)
            
            print(f"Cleared {matches_found} matches with {chain_reaction_count} chain reactions")
            print(f"Score: {self.score}, Level: {self.level}")
        else:
            # No matches found, clear the matched positions list
            self.matched_positions = []
        
        # Spawn a new piece after all matches are cleared and gravity is applied
        # This prevents extra pieces from appearing unexpectedly
        if not delay_clear:
            self._spawn_new_piece()
    
    def _find_matches(self):
        """Checks for 3+ same-colored balls in a row.
        Returns a tuple of (matched_positions, number_of_matches_found).
        """
        matches_found = 0
        matched_positions = set()  # Track positions to clear (avoid double counting)
        
        # Check horizontal matches
        for row in range(self.BOARD_HEIGHT):
            for col in range(self.BOARD_WIDTH - 2):  # Need at least 3 in a row
                color = self.board[row][col]
                if color == 0:  # Skip empty cells
                    continue
                    
                # Check if we have 3+ same colors in a row
                match_length = 1
                for offset in range(1, self.BOARD_WIDTH - col):
                    if self.board[row][col + offset] == color:
                        match_length += 1
                    else:
                        break
                        
                if match_length >= 3:
                    matches_found += 1
                    # Mark these positions for clearing
                    for offset in range(match_length):
                        matched_positions.add((row, col + offset))
        
        # Check vertical matches
        for col in range(self.BOARD_WIDTH):
            for row in range(self.BOARD_HEIGHT - 2):  # Need at least 3 in a row
                color = self.board[row][col]
                if color == 0:  # Skip empty cells
                    continue
                    
                # Check if we have 3+ same colors in a column
                match_length = 1
                for offset in range(1, self.BOARD_HEIGHT - row):
                    if self.board[row + offset][col] == color:
                        match_length += 1
                    else:
                        break
                        
                if match_length >= 3:
                    matches_found += 1
                    # Mark these positions for clearing
                    for offset in range(match_length):
                        matched_positions.add((row + offset, col))
        
        # Check diagonal matches (top-left to bottom-right)
        for row in range(self.BOARD_HEIGHT - 2):
            for col in range(self.BOARD_WIDTH - 2):
                color = self.board[row][col]
                if color == 0:  # Skip empty cells
                    continue
                    
                # Check if we have 3+ same colors in a diagonal
                match_length = 1
                for offset in range(1, min(self.BOARD_HEIGHT - row, self.BOARD_WIDTH - col)):
                    if self.board[row + offset][col + offset] == color:
                        match_length += 1
                    else:
                        break
                        
                if match_length >= 3:
                    matches_found += 1
                    # Mark these positions for clearing
                    for offset in range(match_length):
                        matched_positions.add((row + offset, col + offset))
        
        # Check diagonal matches (top-right to bottom-left)
        for row in range(self.BOARD_HEIGHT - 2):
            for col in range(2, self.BOARD_WIDTH):
                color = self.board[row][col]
                if color == 0:  # Skip empty cells
                    continue
                    
                # Check if we have 3+ same colors in a diagonal
                match_length = 1
                for offset in range(1, min(self.BOARD_HEIGHT - row, col + 1)):
                    if self.board[row + offset][col - offset] == color:
                        match_length += 1
                    else:
                        break
                        
                if match_length >= 3:
                    matches_found += 1
                    # Mark these positions for clearing
                    for offset in range(match_length):
                        matched_positions.add((row + offset, col - offset))
        
        return matched_positions, matches_found
    
    def _clear_matches(self, matched_positions):
        """Clears all matched positions from the board."""
        for row, col in matched_positions:
            self.board[row][col] = 0  # Set to empty
    
    def _apply_gravity(self):
        """Makes balls fall down to fill empty spaces below them."""
        # Process each column independently
        for col in range(self.BOARD_WIDTH):
            # First, collect all non-empty cells in this column (from bottom to top)
            balls = []
            for row in range(self.BOARD_HEIGHT - 1, -1, -1):
                if self.board[row][col] != 0:
                    balls.append(self.board[row][col])
                    self.board[row][col] = 0  # Clear the cell
            
            # Then place them back starting from the bottom
            row = self.BOARD_HEIGHT - 1
            for ball in balls:
                self.board[row][col] = ball
                row -= 1
        
        print("Applied gravity to make balls fall")


    def get_state_dict(self):
        # Ensure the keys match what the frontend expects
        return {
            'board': self.board,
            'currentPiece': self.current_piece,    # Matches frontend: currentGameState.currentPiece
            'nextPieceColors': self.next_piece_colors, # Matches frontend: currentGameState.nextPieceColors
            'score': self.score,
            'level': self.level,
            'gameOver': self.game_over,
            'matchedPositions': self.matched_positions  # For flashing animation
        }
# Initialize with a default state when module is loaded for app.py
# game_state_instance = GameState()
