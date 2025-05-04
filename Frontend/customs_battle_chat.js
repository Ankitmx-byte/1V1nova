/**
 * Customs Battle Chat Module
 * Provides real-time chat functionality between opponents
 */
const BattleChat = {
    // Chat state
    state: {
        messages: [],
        socket: null,
        battleId: null,
        opponentName: null,
        userName: null,
        isMinimized: false,
        unreadCount: 0,
        typingTimeout: null,
        isTyping: false
    },

    /**
     * Initialize the chat module
     * @param {Object} socket Socket.IO instance
     * @param {string} battleId Battle ID
     * @param {string} opponentName Opponent's name
     */
    init: function(socket, battleId, opponentName) {
        console.log('Initializing battle chat...');

        // Set state
        this.state.socket = socket;
        this.state.battleId = battleId;
        this.state.opponentName = opponentName;

        // Get user name from Auth module or localStorage
        const user = this.getCurrentUser();
        this.state.userName = user ? user.name : 'You';

        // Create chat UI
        this.createChatUI();

        // Set up event listeners
        this.setupEventListeners();

        // Set up socket listeners
        this.setupSocketListeners();
    },

    /**
     * Get current user data
     */
    getCurrentUser: function() {
        // Try to get user data from Auth module if available
        if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
            return Auth.getCurrentUser();
        }

        // Fallback to localStorage
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Create chat UI elements
     */
    createChatUI: function() {
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.className = 'battle-chat-container';
        chatContainer.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <i class="fas fa-comment-alt"></i>
                    <span>Chat with ${this.state.opponentName}</span>
                </div>
                <div class="chat-actions">
                    <button class="minimize-btn" title="Minimize">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
            <div class="chat-body">
                <div class="chat-messages" id="chat-messages"></div>
                <div class="typing-indicator" id="chat-typing-indicator"></div>
                <div class="chat-input-container">
                    <textarea class="chat-input" id="chat-input" placeholder="Type a message..."></textarea>
                    <button class="send-btn" id="chat-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        // Add chat container to the page
        document.body.appendChild(chatContainer);

        // Add chat styles
        this.addChatStyles();
    },

    /**
     * Add chat styles to the page
     */
    addChatStyles: function() {
        // Create style element
        const style = document.createElement('style');
        style.textContent = `
            .battle-chat-container {
                position: fixed;
                bottom: 0;
                right: 20px;
                width: 300px;
                background-color: var(--bg-secondary);
                border-radius: 8px 8px 0 0;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                transition: height 0.3s ease;
                max-height: 400px;
            }

            .battle-chat-container.minimized {
                max-height: 40px;
                overflow: hidden;
            }

            .chat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background-color: var(--accent-primary);
                border-radius: 8px 8px 0 0;
                cursor: pointer;
            }

            .chat-title {
                display: flex;
                align-items: center;
                gap: 8px;
                color: white;
                font-weight: 500;
            }

            .chat-actions button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 14px;
                opacity: 0.8;
                transition: opacity 0.2s ease;
            }

            .chat-actions button:hover {
                opacity: 1;
            }

            .chat-body {
                display: flex;
                flex-direction: column;
                height: 100%;
                max-height: 360px;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .message {
                max-width: 80%;
                padding: 8px 12px;
                border-radius: 12px;
                position: relative;
                word-wrap: break-word;
            }

            .message.sent {
                align-self: flex-end;
                background-color: var(--accent-primary);
                color: white;
                border-bottom-right-radius: 4px;
            }

            .message.received {
                align-self: flex-start;
                background-color: var(--bg-tertiary);
                color: var(--text-primary);
                border-bottom-left-radius: 4px;
            }

            .message-time {
                font-size: 0.7rem;
                opacity: 0.7;
                margin-top: 4px;
                text-align: right;
            }

            .typing-indicator {
                padding: 0 15px;
                height: 20px;
                font-size: 0.8rem;
                color: var(--text-secondary);
                font-style: italic;
            }

            .chat-input-container {
                display: flex;
                padding: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .chat-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 18px;
                background-color: var(--bg-tertiary);
                color: var(--text-primary);
                resize: none;
                max-height: 100px;
                min-height: 36px;
            }

            .chat-input:focus {
                outline: none;
                border-color: var(--accent-primary);
            }

            .send-btn {
                background-color: var(--accent-primary);
                color: white;
                border: none;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                margin-left: 8px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                transition: background-color 0.2s ease;
            }

            .send-btn:hover {
                background-color: var(--accent-secondary);
            }

            .unread-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background-color: var(--error);
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 0.7rem;
                font-weight: bold;
            }
        `;

        // Add style to document head
        document.head.appendChild(style);
    },

    /**
     * Set up event listeners for chat UI
     */
    setupEventListeners: function() {
        // Chat header click (minimize/maximize)
        const chatHeader = document.querySelector('.chat-header');
        const minimizeBtn = document.querySelector('.minimize-btn');

        if (chatHeader) {
            chatHeader.addEventListener('click', (e) => {
                // Ignore clicks on minimize button
                if (e.target.closest('.minimize-btn')) return;

                this.toggleChat();
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.toggleChat();
            });
        }

        // Send button click
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Input keypress (Enter to send)
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Input typing event
            chatInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }
    },

    /**
     * Set up Socket.IO event listeners
     */
    setupSocketListeners: function() {
        const socket = this.state.socket;

        if (!socket) {
            console.error('Socket not initialized for chat');
            return;
        }

        console.log('Setting up chat socket listeners');

        // Listen for chat messages
        socket.on('customs_battle_update', (data) => {
            console.log('Chat received battle update:', data);

            if (data.type === 'chat_message') {
                this.receiveMessage(data.message);
            } else if (data.type === 'typing_start') {
                this.showTypingIndicator();
            } else if (data.type === 'typing_end') {
                this.hideTypingIndicator();
            }
        });

        // Listen for connection events
        socket.on('connect', () => {
            console.log('Chat socket connected');
        });

        socket.on('disconnect', () => {
            console.log('Chat socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Chat socket connection error:', error);
        });
    },

    /**
     * Toggle chat minimize/maximize
     */
    toggleChat: function() {
        const chatContainer = document.querySelector('.battle-chat-container');
        if (chatContainer) {
            chatContainer.classList.toggle('minimized');
            this.state.isMinimized = chatContainer.classList.contains('minimized');

            // If maximizing and there are unread messages, reset counter
            if (!this.state.isMinimized && this.state.unreadCount > 0) {
                this.resetUnreadCounter();
            }
        }
    },

    /**
     * Send a chat message
     */
    sendMessage: function() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message) return;

        // Clear input
        chatInput.value = '';

        // Add message to UI
        this.addMessageToUI({
            text: message,
            sender: this.state.userName,
            isSelf: true,
            timestamp: new Date()
        });

        // Send message via Socket.IO
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'chat_message',
            message: {
                text: message,
                sender: this.state.userName,
                timestamp: new Date().toISOString()
            }
        });

        // Stop typing indicator
        this.stopTyping();
    },

    /**
     * Receive a chat message
     * @param {Object} message Message object
     */
    receiveMessage: function(message) {
        // Add message to UI
        this.addMessageToUI({
            text: message.text,
            sender: message.sender,
            isSelf: false,
            timestamp: new Date(message.timestamp)
        });

        // If chat is minimized, increment unread counter
        if (this.state.isMinimized) {
            this.incrementUnreadCounter();
        }
    },

    /**
     * Add a message to the UI
     * @param {Object} message Message object
     */
    addMessageToUI: function(message) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.isSelf ? 'sent' : 'received'}`;

        // Format timestamp
        const time = this.formatTime(message.timestamp);

        // Set message content
        messageEl.innerHTML = `
            <div class="message-content">${this.escapeHTML(message.text)}</div>
            <div class="message-time">${time}</div>
        `;

        // Add to chat
        chatMessages.appendChild(messageEl);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add to state
        this.state.messages.push(message);
    },

    /**
     * Handle typing event
     */
    handleTyping: function() {
        if (!this.state.isTyping) {
            this.state.isTyping = true;

            // Notify opponent that user is typing
            this.state.socket.emit('customs_battle_action', {
                battle_id: this.state.battleId,
                action_type: 'typing_start'
            });
        }

        // Clear previous timeout
        if (this.state.typingTimeout) {
            clearTimeout(this.state.typingTimeout);
        }

        // Set new timeout
        this.state.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 2000);
    },

    /**
     * Stop typing indicator
     */
    stopTyping: function() {
        this.state.isTyping = false;

        // Notify opponent that user stopped typing
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'typing_end'
        });

        // Clear timeout
        if (this.state.typingTimeout) {
            clearTimeout(this.state.typingTimeout);
            this.state.typingTimeout = null;
        }
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator: function() {
        const typingIndicator = document.getElementById('chat-typing-indicator');
        if (typingIndicator) {
            typingIndicator.textContent = `${this.state.opponentName} is typing...`;
        }
    },

    /**
     * Hide typing indicator
     */
    hideTypingIndicator: function() {
        const typingIndicator = document.getElementById('chat-typing-indicator');
        if (typingIndicator) {
            typingIndicator.textContent = '';
        }
    },

    /**
     * Increment unread message counter
     */
    incrementUnreadCounter: function() {
        this.state.unreadCount++;

        // Update UI
        let badge = document.querySelector('.chat-header .unread-badge');

        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'unread-badge';
            document.querySelector('.chat-title').appendChild(badge);
        }

        badge.textContent = this.state.unreadCount;
    },

    /**
     * Reset unread message counter
     */
    resetUnreadCounter: function() {
        this.state.unreadCount = 0;

        // Update UI
        const badge = document.querySelector('.chat-header .unread-badge');
        if (badge) {
            badge.remove();
        }
    },

    /**
     * Format timestamp to readable time
     * @param {Date} date Date object
     * @returns {string} Formatted time
     */
    formatTime: function(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleChat;
}
