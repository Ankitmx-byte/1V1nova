"""
Socket.IO handlers for customs battle functionality.
This module integrates with the main app.py file to handle real-time
communication for the customs battle feature.
"""

import time
import uuid
import json
from flask import request
from flask_socketio import emit, join_room, leave_room

# Store active customs battles
# Structure: {battle_id: {battle_data}}
active_customs_battles = {}

# Store customs matchmaking queue
# Structure: [{player_data}]
customs_matchmaking_queue = []

# Store private battle invitations
# Structure: {code: {battle_data}}
private_battle_invitations = {}

def register_customs_handlers(socketio):
    """Register all Socket.IO event handlers for customs battles."""

    @socketio.on('customs_join_matchmaking')
    def handle_customs_join_matchmaking(data):
        """Add player to customs matchmaking queue."""
        # Extract player data
        username = data.get('username', f'User_{request.sid[:6]}')
        rating = data.get('rating', 1000)
        match_type = data.get('type', 'ranked')  # 'ranked' or 'unranked'

        # Create player data object
        player_data = {
            'sid': request.sid,
            'username': username,
            'rating': rating,
            'type': match_type,
            'joined_at': time.time()
        }

        # Add to matchmaking queue
        customs_matchmaking_queue.append(player_data)

        # Notify player
        emit('customs_matchmaking_status', {
            'status': 'searching',
            'type': match_type,
            'queue_size': len(customs_matchmaking_queue)
        })

        # Try to find a match
        find_customs_match(socketio)

    @socketio.on('customs_cancel_matchmaking')
    def handle_customs_cancel_matchmaking():
        """Remove player from matchmaking queue."""
        # Find player in queue
        for i, player in enumerate(customs_matchmaking_queue):
            if player['sid'] == request.sid:
                # Remove from queue
                customs_matchmaking_queue.pop(i)
                break

        # Notify player
        emit('customs_matchmaking_status', {
            'status': 'cancelled'
        })

    @socketio.on('customs_create_private_battle')
    def handle_customs_create_private_battle(data):
        """Create a private battle and generate invitation code."""
        # Extract player data
        username = data.get('username', f'User_{request.sid[:6]}')
        rating = data.get('rating', 1000)

        # Generate battle code (6 characters alphanumeric)
        import random
        import string
        battle_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        # Generate battle ID
        battle_id = str(uuid.uuid4())

        # Create battle data
        battle_data = {
            'battle_id': battle_id,
            'creator': {
                'sid': request.sid,
                'username': username,
                'rating': rating
            },
            'created_at': time.time(),
            'status': 'waiting',
            'battle_code': battle_code
        }

        # Store in private battle invitations
        private_battle_invitations[battle_code] = battle_data

        # Notify creator
        emit('customs_private_battle_created', {
            'battle_id': battle_id,
            'battle_code': battle_code
        })

    @socketio.on('customs_join_private_battle')
    def handle_customs_join_private_battle(data):
        """Join a private battle using invitation code."""
        # Extract data
        battle_code = data.get('battle_code')
        username = data.get('username', f'User_{request.sid[:6]}')
        rating = data.get('rating', 1000)

        # Check if battle code exists
        if battle_code not in private_battle_invitations:
            emit('customs_error', {
                'message': 'Invalid battle code'
            })
            return

        # Get battle data
        battle_data = private_battle_invitations[battle_code]

        # Check if battle is still waiting
        if battle_data['status'] != 'waiting':
            emit('customs_error', {
                'message': 'Battle already started or expired'
            })
            return

        # Update battle status
        battle_data['status'] = 'in_progress'
        battle_data['joiner'] = {
            'sid': request.sid,
            'username': username,
            'rating': rating
        }

        # Get battle ID
        battle_id = battle_data['battle_id']

        # Add both players to battle room
        join_room(battle_id, sid=battle_data['creator']['sid'])
        join_room(battle_id, sid=request.sid)

        # Select a random problem
        from app import select_random_problem
        problem = select_random_problem()
        battle_data['problem'] = problem

        # Move to active battles
        active_customs_battles[battle_id] = battle_data

        # Notify creator
        emit('customs_private_battle_joined', {
            'battle_id': battle_id,
            'opponent': {
                'username': username,
                'rating': rating
            },
            'problem': problem
        }, room=battle_data['creator']['sid'])

        # Notify joiner
        emit('customs_private_battle_joined', {
            'battle_id': battle_id,
            'opponent': {
                'username': battle_data['creator']['username'],
                'rating': battle_data['creator']['rating']
            },
            'problem': problem
        })

        # Remove from private battle invitations
        del private_battle_invitations[battle_code]

    @socketio.on('customs_join_battle')
    def handle_customs_join_battle(data):
        """Join an existing battle."""
        # Extract data
        battle_id = data.get('battle_id')

        # Check if battle exists
        if battle_id not in active_customs_battles:
            emit('customs_error', {
                'message': 'Battle not found'
            })
            return

        # Join battle room
        join_room(battle_id)

        # Notify player
        emit('customs_battle_joined', {
            'battle_id': battle_id,
            'battle_data': active_customs_battles[battle_id]
        })

    @socketio.on('customs_battle_action')
    def handle_customs_battle_action(data):
        """Handle battle actions (code updates, test results, etc.)."""
        # Extract data
        battle_id = data.get('battle_id')
        action_type = data.get('action_type')

        # Check if battle exists
        if battle_id not in active_customs_battles:
            emit('customs_error', {
                'message': 'Battle not found'
            })
            return

        # Get battle data
        battle_data = active_customs_battles[battle_id]

        # Handle different action types
        if action_type == 'code_update':
            # Store code in battle data
            if battle_data['creator']['sid'] == request.sid:
                battle_data['creator_code'] = data.get('code', '')
            else:
                battle_data['joiner_code'] = data.get('code', '')

            # Broadcast to opponent
            emit('customs_battle_update', {
                'type': 'code_update',
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'typing_start':
            # Broadcast typing indicator to opponent
            emit('customs_battle_update', {
                'type': 'typing_start',
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'typing_end':
            # Broadcast typing end to opponent
            emit('customs_battle_update', {
                'type': 'typing_end',
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'chat_message':
            # Get message data
            message = data.get('message', {})

            # Broadcast message to all users in the battle
            emit('customs_battle_update', {
                'type': 'chat_message',
                'message': message,
                'from': request.sid
            }, room=battle_id)

        elif action_type == 'language_change':
            # Store language in battle data
            language = data.get('language', 'python')
            if battle_data['creator']['sid'] == request.sid:
                battle_data['creator_language'] = language
            else:
                battle_data['joiner_language'] = language

            # Broadcast to opponent
            emit('customs_battle_update', {
                'type': 'language_change',
                'language': language,
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'run_code':
            # Execute code and get results
            code = data.get('code', '')
            language = data.get('language', 'python')

            # In a real implementation, this would execute the code
            # For now, we'll simulate test results
            import random
            test_results = []
            for i in range(4):
                test_results.append({
                    'test_case': i + 1,
                    'status': random.choice(['passed', 'failed']),
                    'execution_time': random.randint(50, 500)
                })

            # Store results in battle data
            if battle_data['creator']['sid'] == request.sid:
                battle_data['creator_results'] = test_results
            else:
                battle_data['joiner_results'] = test_results

            # Send results to player
            emit('customs_battle_update', {
                'type': 'test_results',
                'results': test_results
            })

            # Broadcast to opponent
            emit('customs_battle_update', {
                'type': 'opponent_results',
                'results': test_results,
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'test_result':
            # Store individual test result
            test_case = data.get('test_case')
            status = data.get('status')

            # Broadcast to opponent
            emit('customs_battle_update', {
                'type': 'opponent_test_result',
                'test_case': test_case,
                'status': status,
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

        elif action_type == 'submit_code':
            # Final submission
            code = data.get('code', '')
            language = data.get('language', 'python')

            # In a real implementation, this would execute the code against all test cases
            # For now, we'll simulate test results
            import random
            test_results = []
            passed_count = 0
            for i in range(4):
                passed = random.random() > 0.3  # 70% chance of passing
                if passed:
                    passed_count += 1
                test_results.append({
                    'test_case': i + 1,
                    'status': 'passed' if passed else 'failed',
                    'execution_time': random.randint(50, 500)
                })

            # Store results in battle data
            if battle_data['creator']['sid'] == request.sid:
                battle_data['creator_final_results'] = test_results
                battle_data['creator_final_score'] = passed_count
                battle_data['creator_submitted'] = True
            else:
                battle_data['joiner_final_results'] = test_results
                battle_data['joiner_final_score'] = passed_count
                battle_data['joiner_submitted'] = True

            # Send results to player
            emit('customs_battle_update', {
                'type': 'final_results',
                'results': test_results,
                'score': passed_count
            })

            # Broadcast to opponent
            emit('customs_battle_update', {
                'type': 'opponent_submitted',
                'from': request.sid
            }, room=battle_id, skip_sid=request.sid)

            # Check if both players have submitted
            if battle_data.get('creator_submitted') and battle_data.get('joiner_submitted'):
                # Determine winner
                creator_score = battle_data.get('creator_final_score', 0)
                joiner_score = battle_data.get('joiner_final_score', 0)

                if creator_score > joiner_score:
                    winner = 'creator'
                elif joiner_score > creator_score:
                    winner = 'joiner'
                else:
                    winner = 'draw'

                # Update battle data
                battle_data['winner'] = winner
                battle_data['ended_at'] = time.time()
                battle_data['duration'] = battle_data['ended_at'] - battle_data['created_at']

                # Calculate rating changes
                creator_rating = battle_data['creator']['rating']
                joiner_rating = battle_data['joiner']['rating']

                # Simple ELO calculation
                k_factor = 32
                expected_creator = 1 / (1 + 10 ** ((joiner_rating - creator_rating) / 400))
                expected_joiner = 1 - expected_creator

                if winner == 'creator':
                    creator_score = 1
                    joiner_score = 0
                elif winner == 'joiner':
                    creator_score = 0
                    joiner_score = 1
                else:
                    creator_score = 0.5
                    joiner_score = 0.5

                creator_rating_change = round(k_factor * (creator_score - expected_creator))
                joiner_rating_change = round(k_factor * (joiner_score - expected_joiner))

                # Update battle data with rating changes
                battle_data['creator_rating_change'] = creator_rating_change
                battle_data['joiner_rating_change'] = joiner_rating_change

                # Notify creator
                emit('customs_battle_update', {
                    'type': 'battle_end',
                    'result': 'win' if winner == 'creator' else ('loss' if winner == 'joiner' else 'draw'),
                    'rating_change': creator_rating_change,
                    'old_rating': creator_rating,
                    'new_rating': creator_rating + creator_rating_change,
                    'opponent_score': joiner_score
                }, room=battle_data['creator']['sid'])

                # Notify joiner
                emit('customs_battle_update', {
                    'type': 'battle_end',
                    'result': 'win' if winner == 'joiner' else ('loss' if winner == 'creator' else 'draw'),
                    'rating_change': joiner_rating_change,
                    'old_rating': joiner_rating,
                    'new_rating': joiner_rating + joiner_rating_change,
                    'opponent_score': creator_score
                }, room=battle_data['joiner']['sid'])

        elif action_type == 'time_up':
            # Time's up - force submission
            battle_data['time_up'] = True

            # Broadcast to all players in the room
            emit('customs_battle_update', {
                'type': 'time_up'
            }, room=battle_id)

            # If any player hasn't submitted, count their current results
            if not battle_data.get('creator_submitted'):
                # Use their last run results or empty results
                test_results = battle_data.get('creator_results', [])
                passed_count = sum(1 for result in test_results if result.get('status') == 'passed')

                battle_data['creator_final_results'] = test_results
                battle_data['creator_final_score'] = passed_count
                battle_data['creator_submitted'] = True

            if not battle_data.get('joiner_submitted'):
                # Use their last run results or empty results
                test_results = battle_data.get('joiner_results', [])
                passed_count = sum(1 for result in test_results if result.get('status') == 'passed')

                battle_data['joiner_final_results'] = test_results
                battle_data['joiner_final_score'] = passed_count
                battle_data['joiner_submitted'] = True

            # Determine winner
            creator_score = battle_data.get('creator_final_score', 0)
            joiner_score = battle_data.get('joiner_final_score', 0)

            if creator_score > joiner_score:
                winner = 'creator'
            elif joiner_score > creator_score:
                winner = 'joiner'
            else:
                winner = 'draw'

            # Update battle data
            battle_data['winner'] = winner
            battle_data['ended_at'] = time.time()
            battle_data['duration'] = battle_data['ended_at'] - battle_data['created_at']

            # Calculate rating changes (same as above)
            creator_rating = battle_data['creator']['rating']
            joiner_rating = battle_data['joiner']['rating']

            k_factor = 32
            expected_creator = 1 / (1 + 10 ** ((joiner_rating - creator_rating) / 400))
            expected_joiner = 1 - expected_creator

            if winner == 'creator':
                creator_score = 1
                joiner_score = 0
            elif winner == 'joiner':
                creator_score = 0
                joiner_score = 1
            else:
                creator_score = 0.5
                joiner_score = 0.5

            creator_rating_change = round(k_factor * (creator_score - expected_creator))
            joiner_rating_change = round(k_factor * (joiner_score - expected_joiner))

            # Update battle data with rating changes
            battle_data['creator_rating_change'] = creator_rating_change
            battle_data['joiner_rating_change'] = joiner_rating_change

            # Notify creator
            emit('customs_battle_update', {
                'type': 'battle_end',
                'result': 'win' if winner == 'creator' else ('loss' if winner == 'joiner' else 'draw'),
                'rating_change': creator_rating_change,
                'old_rating': creator_rating,
                'new_rating': creator_rating + creator_rating_change,
                'opponent_score': joiner_score
            }, room=battle_data['creator']['sid'])

            # Notify joiner
            emit('customs_battle_update', {
                'type': 'battle_end',
                'result': 'win' if winner == 'joiner' else ('loss' if winner == 'creator' else 'draw'),
                'rating_change': joiner_rating_change,
                'old_rating': joiner_rating,
                'new_rating': joiner_rating + joiner_rating_change,
                'opponent_score': creator_score
            }, room=battle_data['joiner']['sid'])

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle player disconnect."""
        # Remove from matchmaking queue
        for i, player in enumerate(customs_matchmaking_queue):
            if player['sid'] == request.sid:
                customs_matchmaking_queue.pop(i)
                break

        # Check active battles
        for battle_id, battle_data in list(active_customs_battles.items()):
            if battle_data['creator']['sid'] == request.sid or \
               battle_data.get('joiner', {}).get('sid') == request.sid:
                # Notify opponent
                if battle_data['creator']['sid'] == request.sid and 'joiner' in battle_data:
                    emit('customs_battle_update', {
                        'type': 'opponent_disconnected'
                    }, room=battle_data['joiner']['sid'])
                elif battle_data.get('joiner', {}).get('sid') == request.sid:
                    emit('customs_battle_update', {
                        'type': 'opponent_disconnected'
                    }, room=battle_data['creator']['sid'])

                # Mark battle as abandoned
                battle_data['status'] = 'abandoned'
                battle_data['ended_at'] = time.time()
                battle_data['duration'] = battle_data['ended_at'] - battle_data['created_at']

                # Determine winner (the player who didn't disconnect)
                if battle_data['creator']['sid'] == request.sid:
                    battle_data['winner'] = 'joiner'

                    # Calculate rating changes
                    joiner_rating = battle_data['joiner']['rating']
                    joiner_rating_change = 15  # Fixed rating gain for disconnect win

                    # Notify joiner
                    emit('customs_battle_update', {
                        'type': 'battle_end',
                        'result': 'win',
                        'reason': 'opponent_disconnected',
                        'rating_change': joiner_rating_change,
                        'old_rating': joiner_rating,
                        'new_rating': joiner_rating + joiner_rating_change
                    }, room=battle_data['joiner']['sid'])
                else:
                    battle_data['winner'] = 'creator'

                    # Calculate rating changes
                    creator_rating = battle_data['creator']['rating']
                    creator_rating_change = 15  # Fixed rating gain for disconnect win

                    # Notify creator
                    emit('customs_battle_update', {
                        'type': 'battle_end',
                        'result': 'win',
                        'reason': 'opponent_disconnected',
                        'rating_change': creator_rating_change,
                        'old_rating': creator_rating,
                        'new_rating': creator_rating + creator_rating_change
                    }, room=battle_data['creator']['sid'])

def find_customs_match(socketio):
    """Find matches for players in the customs matchmaking queue."""
    if len(customs_matchmaking_queue) < 2:
        return

    # Separate ranked and unranked players
    ranked_players = [p for p in customs_matchmaking_queue if p['type'] == 'ranked']
    unranked_players = [p for p in customs_matchmaking_queue if p['type'] == 'unranked']

    # Process ranked matches (match by rating)
    if len(ranked_players) >= 2:
        # Sort by rating
        ranked_players.sort(key=lambda x: x['rating'])

        # Find closest rating match
        best_match = None
        min_rating_diff = float('inf')

        for i in range(len(ranked_players) - 1):
            rating_diff = abs(ranked_players[i]['rating'] - ranked_players[i+1]['rating'])
            if rating_diff < min_rating_diff:
                min_rating_diff = rating_diff
                best_match = (i, i+1)

        if best_match:
            player1_idx, player2_idx = best_match
            player1 = ranked_players[player1_idx]
            player2 = ranked_players[player2_idx]

            # Remove from queue
            customs_matchmaking_queue.remove(player1)
            customs_matchmaking_queue.remove(player2)

            # Create battle
            create_customs_battle(socketio, player1, player2, 'ranked')

    # Process unranked matches (first come, first served)
    if len(unranked_players) >= 2:
        # Sort by join time
        unranked_players.sort(key=lambda x: x['joined_at'])

        player1 = unranked_players[0]
        player2 = unranked_players[1]

        # Remove from queue
        customs_matchmaking_queue.remove(player1)
        customs_matchmaking_queue.remove(player2)

        # Create battle
        create_customs_battle(socketio, player1, player2, 'unranked')

def create_customs_battle(socketio, player1, player2, battle_type):
    """Create a customs battle between two players."""
    # Generate battle ID
    battle_id = str(uuid.uuid4())

    # Select a random problem
    from app import select_random_problem
    problem = select_random_problem()

    # Create battle data
    battle_data = {
        'battle_id': battle_id,
        'creator': player1,
        'joiner': player2,
        'problem': problem,
        'status': 'in_progress',
        'type': battle_type,
        'created_at': time.time()
    }

    # Store in active battles
    active_customs_battles[battle_id] = battle_data

    # Add both players to the battle room
    join_room(battle_id, sid=player1['sid'])
    join_room(battle_id, sid=player2['sid'])

    # Notify both players
    socketio.emit('customs_battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player2['username'],
            'rating': player2['rating']
        },
        'problem': problem,
        'battle_type': battle_type
    }, room=player1['sid'])

    socketio.emit('customs_battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player1['username'],
            'rating': player1['rating']
        },
        'problem': problem,
        'battle_type': battle_type
    }, room=player2['sid'])
