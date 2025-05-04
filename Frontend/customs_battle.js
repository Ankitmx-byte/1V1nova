/**
 * Customs Battle Module
 * Enhanced battle interface with real-time features
 */
const CustomsBattle = {
    // Battle state
    state: {
        battleId: null,
        opponent: null,
        problem: null,
        timeRemaining: 30 * 60, // 30 minutes in seconds
        editor: null,
        language: 'python',
        socket: null,
        testCases: [
            { id: 1, status: 'pending' },
            { id: 2, status: 'pending' },
            { id: 3, status: 'pending' },
            { id: 4, status: 'pending' }
        ],
        opponentTestCases: [
            { id: 1, status: 'pending' },
            { id: 2, status: 'pending' },
            { id: 3, status: 'pending' },
            { id: 4, status: 'pending' }
        ],
        yourProgress: 0,
        opponentProgress: 0,
        timer: null,
        isTyping: false,
        typingTimeout: null,
        lastCodeUpdate: Date.now(),
        codeHistory: [],
        statistics: {
            keystrokes: 0,
            codeLength: 0,
            startTime: null,
            endTime: null,
            executionTimes: []
        },
        webcam: {
            stream: null,
            enabled: false,
            monitoringInterval: null,
            faceDetectionInterval: null,
            movementDetectionInterval: null,
            screenshots: [],
            warningCount: 0,
            lastWarningTime: 0,
            suspiciousActivityDetected: false,
            previousImageData: null,
            movementDetected: false,
            movementLevel: 0,
            stablePosition: false,
            stablePositionCounter: 0,
            movementWarningCount: 0,
            lastMovementWarningTime: 0
        },
        opponentWebcam: {
            connected: false,
            lastUpdate: null
        },
        peerConnection: null,
        dataChannel: null
    },

    /**
     * Initialize the customs battle interface
     */
    init: function() {
        console.log('Initializing customs battle...');

        // Get battle ID and opponent from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.state.battleId = urlParams.get('id');

        if (!this.state.battleId) {
            console.error('No battle ID provided');
            alert('Invalid battle. Redirecting to battle selection...');
            window.location.href = 'battle.html';
            return;
        }

        // Initialize Socket.IO connection
        this.initializeSocket();

        // Initialize the code editor
        this.initializeEditor();

        // Initialize UI elements
        this.initializeUI();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize statistics
        this.initializeStatistics();

        // Initialize webcam for anti-cheat
        this.initializeWebcam();

        // Start the timer
        this.startTimer();

        // Join the battle room
        this.joinBattle();

        // Initialize chat if opponent info is available
        if (urlParams.get('opponent')) {
            // Initialize chat with opponent name
            BattleChat.init(this.state.socket, this.state.battleId, urlParams.get('opponent'));
        }
    },

    /**
     * Initialize Socket.IO connection
     */
    initializeSocket: function() {
        // Connect to Socket.IO server
        // Use the same host and port as the current page
        const socketUrl = window.location.protocol + '//' + window.location.host;
        console.log('Connecting to Socket.IO server at:', socketUrl);

        try {
            this.state.socket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });

            console.log('Socket.IO connection initialized');

            // Set up socket event listeners
            this.setupSocketListeners();
        } catch (error) {
            console.error('Failed to connect to Socket.IO server:', error);
            alert('Failed to connect to the battle server. Please refresh the page and try again.');
        }
    },

    /**
     * Set up Socket.IO event listeners
     */
    setupSocketListeners: function() {
        const socket = this.state.socket;

        socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        // Battle events
        socket.on('customs_battle_update', (data) => {
            console.log('Battle update:', data);

            if (data.type === 'code_update') {
                // Opponent is typing
                this.showOpponentTyping();
            } else if (data.type === 'test_results') {
                // Update opponent's test results
                this.updateOpponentTestResults(data.results);
            } else if (data.type === 'battle_end') {
                // Battle has ended
                this.handleBattleEnd(data);
            } else if (data.type === 'opponent_disconnected') {
                // Opponent disconnected
                this.handleOpponentDisconnect();
            } else if (data.type === 'code_history') {
                // Code history update
                this.updateCodeHistory(data.history);
            }
        });

        // Error events
        socket.on('customs_error', (data) => {
            console.error('Customs error:', data);
            alert(data.message);
        });
    },

    /**
     * Initialize the code editor
     */
    initializeEditor: function() {
        // Initialize Ace editor
        this.state.editor = ace.edit('code-editor');
        this.state.editor.setTheme('ace/theme/monokai');
        this.state.editor.session.setMode('ace/mode/python');

        // Set initial code based on language
        this.setInitialCode('python');

        // Disable copy and paste functionality
        this.state.editor.commands.removeCommand('copy');
        this.state.editor.commands.removeCommand('cut');
        this.state.editor.commands.removeCommand('paste');

        // Add custom message for copy/paste attempts
        this.state.editor.commands.addCommand({
            name: "copy",
            bindKey: {win: "Ctrl-C", mac: "Command-C"},
            exec: () => {
                const terminalOutput = document.getElementById('terminal-output');
                if (terminalOutput) {
                    terminalOutput.textContent += "> Copy functionality is disabled in this battle.\n";
                }
            }
        });

        this.state.editor.commands.addCommand({
            name: "cut",
            bindKey: {win: "Ctrl-X", mac: "Command-X"},
            exec: () => {
                const terminalOutput = document.getElementById('terminal-output');
                if (terminalOutput) {
                    terminalOutput.textContent += "> Cut functionality is disabled in this battle.\n";
                }
            }
        });

        this.state.editor.commands.addCommand({
            name: "paste",
            bindKey: {win: "Ctrl-V", mac: "Command-V"},
            exec: () => {
                const terminalOutput = document.getElementById('terminal-output');
                if (terminalOutput) {
                    terminalOutput.textContent += "> Paste functionality is disabled in this battle.\n";
                }
            }
        });

        // Set up editor change event
        this.state.editor.getSession().on('change', (e) => {
            // Track keystrokes for statistics
            if (e.action === 'insert' || e.action === 'remove') {
                this.state.statistics.keystrokes++;
                this.state.statistics.codeLength = this.state.editor.getValue().length;
            }

            // Notify server about typing
            this.handleEditorChange();
        });
    },

    /**
     * Initialize UI elements
     */
    initializeUI: function() {
        // Set battle ID
        document.getElementById('battle-id').textContent = this.state.battleId;

        // Set opponent info if available
        const urlParams = new URLSearchParams(window.location.search);
        const opponentName = urlParams.get('opponent');
        const opponentRating = urlParams.get('rating');

        if (opponentName) {
            document.getElementById('opponent-name').textContent = opponentName;
        }

        if (opponentRating) {
            document.getElementById('opponent-rating').textContent = opponentRating;
        }

        // Initialize test case elements
        this.initializeTestCases();

        // Show notification about disabled copy/paste and webcam requirement
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent = "> Welcome to the Customs Battle Arena!\n";
            terminalOutput.textContent += "> Note: Copy and paste functionality is disabled in this battle to ensure fair competition.\n";
            terminalOutput.textContent += "> Camera access is required to participate in battles as part of our anti-cheat system.\n";
            terminalOutput.textContent += "> Please enable your camera to begin coding.\n";
        }
    },

    /**
     * Initialize test case elements
     */
    initializeTestCases: function() {
        // Your test cases
        for (let i = 1; i <= 4; i++) {
            const testCase = document.getElementById(`your-test-${i}`);
            if (testCase) {
                testCase.className = 'test-case';
                testCase.querySelector('.test-status').textContent = '○';
            }
        }

        // Opponent test cases
        for (let i = 1; i <= 4; i++) {
            const testCase = document.getElementById(`opponent-test-${i}`);
            if (testCase) {
                testCase.className = 'test-case';
                testCase.querySelector('.test-status').textContent = '○';
            }
        }

        // Reset progress bars
        document.getElementById('your-progress').style.width = '0%';
        document.getElementById('opponent-progress').style.width = '0%';
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Language selector
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Run button (disabled until webcam is enabled)
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = !this.state.webcam.enabled;
            runBtn.addEventListener('click', () => {
                if (this.state.webcam.enabled) {
                    this.runCode();
                } else {
                    const terminalOutput = document.getElementById('terminal-output');
                    if (terminalOutput) {
                        terminalOutput.textContent += "> Error: Camera access is required to run code.\n";
                    }
                }
            });
        }

        // Submit button (disabled until webcam is enabled)
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = !this.state.webcam.enabled;
            submitBtn.addEventListener('click', () => {
                if (this.state.webcam.enabled) {
                    this.submitCode();
                } else {
                    const terminalOutput = document.getElementById('terminal-output');
                    if (terminalOutput) {
                        terminalOutput.textContent += "> Error: Camera access is required to submit code.\n";
                    }
                }
            });
        }

        // Enable webcam button
        const enableWebcamBtn = document.getElementById('enable-webcam-btn');
        if (enableWebcamBtn) {
            enableWebcamBtn.addEventListener('click', () => {
                this.initializeWebcam();
            });
        }

        // Back button
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', (e) => {
                if (confirm('Are you sure you want to leave the battle? This will count as a forfeit.')) {
                    // Stop webcam if it's running
                    this.stopWebcam();
                    window.location.href = 'battle.html';
                } else {
                    e.preventDefault();
                }
            });
        }
    },

    /**
     * Start the timer
     */
    startTimer: function() {
        const timerElement = document.getElementById('battle-timer');

        this.state.timer = setInterval(() => {
            if (this.state.timeRemaining > 0) {
                this.state.timeRemaining--;

                const minutes = Math.floor(this.state.timeRemaining / 60);
                const seconds = this.state.timeRemaining % 60;

                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                // Warning when time is running out
                if (this.state.timeRemaining <= 300) { // 5 minutes
                    timerElement.style.color = 'var(--error)';

                    if (this.state.timeRemaining <= 60) { // 1 minute
                        timerElement.style.animation = 'pulse 1s infinite';
                    }
                }
            } else {
                // Time's up
                clearInterval(this.state.timer);
                timerElement.textContent = "Time's up!";
                timerElement.style.color = 'var(--error)';

                // Notify server
                this.handleTimeUp();
            }
        }, 1000);
    },

    /**
     * Join the battle room
     */
    joinBattle: function() {
        // Get user data
        const user = this.getCurrentUser();

        // Join battle room
        this.state.socket.emit('customs_join_battle', {
            battle_id: this.state.battleId,
            username: user ? user.name : 'Anonymous',
            rating: user ? user.rating : 1000
        });
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
     * Set initial code based on language
     * @param {string} language Programming language
     */
    setInitialCode: function(language) {
        let initialCode = '';

        switch (language) {
            case 'python':
                initialCode = `def two_sum(nums, target):
    # Your solution here
    pass`;
                break;
            case 'javascript':
                initialCode = `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Your solution here
}`;
                break;
            case 'java':
                initialCode = `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
        return new int[]{0, 0};
    }
}`;
                break;
            case 'cpp':
                initialCode = `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your solution here
        return {0, 0};
    }
};`;
                break;
            default:
                initialCode = '// Your code here';
        }

        this.state.editor.setValue(initialCode);
        this.state.editor.clearSelection();
    },

    /**
     * Change programming language
     * @param {string} language Programming language
     */
    changeLanguage: function(language) {
        this.state.language = language;

        // Update editor mode
        let mode;
        switch (language) {
            case 'python':
                mode = 'ace/mode/python';
                break;
            case 'javascript':
                mode = 'ace/mode/javascript';
                break;
            case 'java':
                mode = 'ace/mode/java';
                break;
            case 'cpp':
                mode = 'ace/mode/c_cpp';
                break;
            default:
                mode = 'ace/mode/text';
        }

        this.state.editor.session.setMode(mode);

        // Set initial code
        this.setInitialCode(language);

        // Notify server about language change
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'language_change',
            language: language
        });
    },

    /**
     * Handle editor changes
     */
    handleEditorChange: function() {
        // Throttle updates to avoid flooding the server
        const now = Date.now();
        if (now - this.state.lastCodeUpdate > 1000) { // Send at most once per second
            this.state.lastCodeUpdate = now;

            const code = this.state.editor.getValue();

            // Notify server about code update
            this.state.socket.emit('customs_battle_action', {
                battle_id: this.state.battleId,
                action_type: 'code_update',
                code: code
            });

            // Save to code history
            this.saveToCodeHistory(code);
        }

        // Show typing indicator to opponent
        if (!this.state.isTyping) {
            this.state.isTyping = true;

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
            this.state.isTyping = false;

            this.state.socket.emit('customs_battle_action', {
                battle_id: this.state.battleId,
                action_type: 'typing_end'
            });
        }, 2000);
    },

    /**
     * Save code to history
     * @param {string} code Code to save
     */
    saveToCodeHistory: function(code) {
        // Initialize code history if it doesn't exist
        if (!this.state.codeHistory) {
            this.state.codeHistory = [];
        }

        // Add to history (max 10 entries)
        this.state.codeHistory.push({
            code: code,
            timestamp: new Date().toISOString(),
            language: this.state.language
        });

        // Limit history size
        if (this.state.codeHistory.length > 10) {
            this.state.codeHistory.shift();
        }

        // Update history UI if it exists
        this.updateCodeHistory(this.state.codeHistory);
    },

    /**
     * Show opponent typing indicator
     */
    showOpponentTyping: function() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.textContent = 'Opponent is typing...';

            // Clear after 2 seconds if no further updates
            setTimeout(() => {
                typingIndicator.textContent = '';
            }, 2000);
        }
    },

    /**
     * Update connection status indicator
     * @param {boolean} connected Whether connected to server
     */
    updateConnectionStatus: function(connected) {
        const statusIndicator = document.querySelector('.real-time-indicator .status');
        if (statusIndicator) {
            statusIndicator.style.backgroundColor = connected ? 'var(--success)' : 'var(--error)';
        }

        const statusText = document.querySelector('.real-time-indicator span');
        if (statusText) {
            statusText.textContent = connected ? 'Real-time connection active' : 'Connection lost. Reconnecting...';
        }
    },

    /**
     * Initialize statistics tracking
     */
    initializeStatistics: function() {
        // Set start time
        this.state.statistics.startTime = Date.now();
    },

    /**
     * Initialize webcam for anti-cheat monitoring
     */
    initializeWebcam: function() {
        // Check if webcam is already enabled
        if (this.state.webcam.enabled) {
            return Promise.resolve(true);
        }

        // Get DOM elements
        const webcamVideo = document.getElementById('webcam-video');
        const webcamPlaceholder = document.getElementById('webcam-placeholder');
        const webcamStatus = document.getElementById('webcam-status');
        const runBtn = document.getElementById('run-btn');
        const submitBtn = document.getElementById('submit-btn');

        // Return a promise that resolves when webcam is initialized
        return new Promise(async (resolve) => {
            try {
                // Request webcam access
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 320 },
                        height: { ideal: 240 },
                        facingMode: 'user'
                    }
                });

                // Set video source
                if (webcamVideo) {
                    webcamVideo.srcObject = stream;
                }

                // Hide placeholder
                if (webcamPlaceholder) {
                    webcamPlaceholder.style.display = 'none';
                }

                // Update status
                if (webcamStatus) {
                    webcamStatus.innerHTML = '<i class="fas fa-check-circle"></i> Camera active - Anti-cheat monitoring enabled';
                    webcamStatus.className = 'webcam-status active';
                }

                // Enable run and submit buttons
                if (runBtn) runBtn.disabled = false;
                if (submitBtn) submitBtn.disabled = false;

                // Update state
                this.state.webcam.stream = stream;
                this.state.webcam.enabled = true;

                // Start anti-cheat monitoring
                this.startAntiCheatMonitoring();

                // Update terminal
                const terminalOutput = document.getElementById('terminal-output');
                if (terminalOutput) {
                    terminalOutput.textContent += "> Anti-cheat monitoring enabled. You can now participate in the battle.\n";
                }

                resolve(true);
            } catch (error) {
                console.error('Error accessing webcam:', error);

                // Update status with error message
                if (webcamStatus) {
                    webcamStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Camera access denied: ${error.message}`;
                }

                // Update terminal
                const terminalOutput = document.getElementById('terminal-output');
                if (terminalOutput) {
                    terminalOutput.textContent += "> Error: Camera access is required to participate in battles.\n";
                }

                resolve(false);
            }
        });
    },

    /**
     * Start anti-cheat monitoring
     */
    startAntiCheatMonitoring: function() {
        // Create a canvas element for capturing screenshots
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 240;

        // Create a second canvas for movement detection
        const prevCanvas = document.createElement('canvas');
        const prevContext = prevCanvas.getContext('2d');
        prevCanvas.width = 320;
        prevCanvas.height = 240;

        // Get webcam video element
        const webcamVideo = document.getElementById('webcam-video');

        // Initialize cheating detection variables
        this.state.webcam.warningCount = 0;
        this.state.webcam.lastWarningTime = 0;
        this.state.webcam.suspiciousActivityDetected = false;
        this.state.webcam.previousImageData = null;
        this.state.webcam.movementDetected = false;
        this.state.webcam.movementLevel = 0;
        this.state.webcam.stablePosition = false;
        this.state.webcam.stablePositionCounter = 0;

        // Take screenshots periodically
        this.state.webcam.monitoringInterval = setInterval(() => {
            if (webcamVideo && webcamVideo.srcObject && this.state.webcam.enabled) {
                try {
                    // Draw the current video frame to the canvas
                    context.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

                    // Convert canvas to data URL
                    const screenshot = canvas.toDataURL('image/jpeg', 0.5);

                    // Store screenshot (limited to last 10)
                    this.state.webcam.screenshots.push({
                        timestamp: new Date().toISOString(),
                        data: screenshot
                    });

                    // Limit array size
                    if (this.state.webcam.screenshots.length > 10) {
                        this.state.webcam.screenshots.shift();
                    }

                    // Analyze the screenshot for potential cheating
                    this.analyzeScreenshotForCheating(context, screenshot);

                    // For demo purposes, we'll just log that a screenshot was taken
                    console.log('Anti-cheat screenshot captured at', new Date().toLocaleTimeString());

                    // Notify server about anti-cheat monitoring
                    if (this.state.socket) {
                        this.state.socket.emit('customs_battle_action', {
                            battle_id: this.state.battleId,
                            action_type: 'anti_cheat_heartbeat',
                            timestamp: new Date().toISOString(),
                            suspicious_activity: this.state.webcam.suspiciousActivityDetected
                        });
                    }
                } catch (error) {
                    console.error('Error capturing screenshot:', error);
                }
            }
        }, 5000); // Take a screenshot every 5 seconds for more frequent monitoring

        // Add face detection monitoring at a different interval
        this.state.webcam.faceDetectionInterval = setInterval(() => {
            if (webcamVideo && webcamVideo.srcObject && this.state.webcam.enabled) {
                this.detectFacePresence();
            }
        }, 3000); // Check for face presence every 3 seconds

        // Add movement detection at a more frequent interval
        this.state.webcam.movementDetectionInterval = setInterval(() => {
            if (webcamVideo && webcamVideo.srcObject && this.state.webcam.enabled) {
                try {
                    // Draw current frame to the main canvas
                    context.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

                    // Get current image data
                    const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

                    // If we have a previous frame, compare them to detect movement
                    if (this.state.webcam.previousImageData) {
                        const movementScore = this.detectMovement(
                            this.state.webcam.previousImageData.data,
                            currentImageData.data
                        );

                        // Update movement level (with some smoothing)
                        this.state.webcam.movementLevel =
                            this.state.webcam.movementLevel * 0.7 + movementScore * 0.3;

                        // Check if movement exceeds threshold
                        if (this.state.webcam.movementLevel > 20) { // Threshold for significant movement
                            this.handleExcessiveMovement(this.state.webcam.movementLevel);
                        } else {
                            // If movement is minimal, increment stable position counter
                            this.state.webcam.stablePositionCounter++;

                            // After 10 stable frames (about 5 seconds), consider position stable
                            if (this.state.webcam.stablePositionCounter >= 10 && !this.state.webcam.stablePosition) {
                                this.state.webcam.stablePosition = true;
                                console.log('User position is now stable');

                                // Show a positive message in terminal
                                const terminalOutput = document.getElementById('terminal-output');
                                if (terminalOutput && this.state.webcam.warningCount > 0) {
                                    terminalOutput.textContent += "> Position stable. Thank you for maintaining proper posture.\n";
                                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                                }
                            }
                        }
                    }

                    // Store current frame as previous for next comparison
                    this.state.webcam.previousImageData = currentImageData;

                    // Draw current frame to the previous canvas (for debugging if needed)
                    prevContext.putImageData(currentImageData, 0, 0);

                } catch (error) {
                    console.error('Error detecting movement:', error);
                }
            }
        }, 500); // Check for movement every 500ms for responsive detection
    },

    /**
     * Analyze screenshot for potential cheating
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {string} screenshot - Data URL of the screenshot
     */
    analyzeScreenshotForCheating: function(context, screenshot) {
        // In a real implementation, this would use AI/ML to detect:
        // 1. If the user is looking away from the screen
        // 2. If there are multiple people in the frame
        // 3. If there are phones or other devices visible
        // 4. If the user is reading from another screen

        // For demo purposes, we'll simulate detection with random checks
        // and also detect significant changes in the frame that might indicate
        // the user is looking at reference materials

        // Simulate random checks (approximately 10% chance of detecting something)
        const now = Date.now();
        if (Math.random() < 0.1 && (now - this.state.webcam.lastWarningTime > 15000)) {
            // Only trigger a new warning if it's been at least 15 seconds since the last one
            this.state.webcam.warningCount++;
            this.state.webcam.lastWarningTime = now;
            this.state.webcam.suspiciousActivityDetected = true;

            // Determine what kind of suspicious activity was "detected"
            let warningMessage = "";
            const randomFactor = Math.random();

            if (randomFactor < 0.25) {
                warningMessage = "Warning: Looking away from screen detected. Please focus on the coding task.";
            } else if (randomFactor < 0.5) {
                warningMessage = "Warning: Additional person detected in frame. Only the participant should be visible.";
            } else if (randomFactor < 0.75) {
                warningMessage = "Warning: Phone or secondary device detected. External devices are not allowed.";
            } else {
                warningMessage = "Warning: Suspicious movement detected. Please maintain a normal coding posture.";
            }

            // Display warning in terminal
            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += `> ${warningMessage}\n`;
                terminalOutput.textContent += `> Anti-cheat warning #${this.state.webcam.warningCount}: Continued violations may result in disqualification.\n`;

                // Auto-scroll to bottom
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            // Display visual warning
            this.showCheatingWarning(warningMessage);

            // If this is the third warning, take more serious action
            if (this.state.webcam.warningCount >= 3) {
                this.handleExcessiveCheating();
            }

            // Reset suspicious activity flag after 5 seconds
            setTimeout(() => {
                this.state.webcam.suspiciousActivityDetected = false;
            }, 5000);
        }
    },

    /**
     * Detect if a face is present in the webcam feed
     */
    detectFacePresence: function() {
        const webcamVideo = document.getElementById('webcam-video');
        if (!webcamVideo || !webcamVideo.srcObject) return;

        // In a real implementation, this would use face detection AI
        // For demo purposes, we'll randomly detect "no face" occasionally

        const now = Date.now();
        if (Math.random() < 0.05 && (now - this.state.webcam.lastWarningTime > 15000)) {
            this.state.webcam.lastWarningTime = now;

            // Display warning in terminal
            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += "> Warning: No face detected in camera. Please ensure your face is visible.\n";

                // Auto-scroll to bottom
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            // Display visual warning
            this.showCheatingWarning("No face detected in camera. Please ensure your face is visible.");
        }
    },

    /**
     * Detect movement between two frames
     * @param {Uint8ClampedArray} prevData - Previous frame pixel data
     * @param {Uint8ClampedArray} currData - Current frame pixel data
     * @returns {number} - Movement score (0-100)
     */
    detectMovement: function(prevData, currData) {
        // Calculate the difference between frames
        let diffCount = 0;
        let pixelCount = 0;

        // We'll sample every 10th pixel to save processing power
        // and focus on the center area where the face is likely to be
        const width = 320;
        const height = 240;
        const centerX = width / 2;
        const centerY = height / 2;
        const faceRegionSize = 100; // Size of the region to focus on

        for (let y = centerY - faceRegionSize; y < centerY + faceRegionSize; y += 2) {
            for (let x = centerX - faceRegionSize; x < centerX + faceRegionSize; x += 2) {
                if (y < 0 || y >= height || x < 0 || x >= width) continue;

                const i = (y * width + x) * 4; // RGBA has 4 values per pixel

                // Calculate difference in RGB values (ignore alpha)
                const rDiff = Math.abs(prevData[i] - currData[i]);
                const gDiff = Math.abs(prevData[i + 1] - currData[i + 1]);
                const bDiff = Math.abs(prevData[i + 2] - currData[i + 2]);

                // If the difference is significant (adjust threshold as needed)
                if (rDiff > 20 || gDiff > 20 || bDiff > 20) {
                    diffCount++;
                }

                pixelCount++;
            }
        }

        // Calculate percentage of pixels that changed
        const movementScore = (diffCount / pixelCount) * 100;

        // Log movement score for debugging
        if (movementScore > 5) {
            console.log('Movement score:', movementScore.toFixed(2));
        }

        return movementScore;
    },

    /**
     * Handle excessive movement detection
     * @param {number} movementLevel - Level of detected movement
     */
    handleExcessiveMovement: function(movementLevel) {
        const now = Date.now();

        // Reset stable position counter
        this.state.webcam.stablePositionCounter = 0;
        this.state.webcam.stablePosition = false;

        // Only trigger a warning if it's been at least 5 seconds since the last movement warning
        if (now - this.state.webcam.lastMovementWarningTime > 5000) {
            this.state.webcam.lastMovementWarningTime = now;
            this.state.webcam.movementWarningCount++;

            // Determine warning message based on movement level
            let warningMessage = "";
            if (movementLevel > 50) {
                warningMessage = "Warning: Significant head/body movement detected. Please maintain a stable position.";
            } else if (movementLevel > 30) {
                warningMessage = "Warning: Moderate head movement detected. Please face the screen directly.";
            } else {
                warningMessage = "Warning: Slight movement detected. Try to maintain a stable position.";
            }

            // Display warning in terminal
            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += `> ${warningMessage}\n`;
                terminalOutput.textContent += `> Movement warning #${this.state.webcam.movementWarningCount}: Excessive movement may indicate cheating behavior.\n`;

                // Auto-scroll to bottom
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            // Display visual warning
            this.showCheatingWarning(warningMessage);

            // If this is the third movement warning, count it as a regular cheating warning
            if (this.state.webcam.movementWarningCount >= 3 && now - this.state.webcam.lastWarningTime > 15000) {
                this.state.webcam.warningCount++;
                this.state.webcam.lastWarningTime = now;

                // Display more serious warning
                if (terminalOutput) {
                    terminalOutput.textContent += "> Anti-cheat warning: Repeated excessive movement detected.\n";
                    terminalOutput.textContent += `> This is anti-cheat warning #${this.state.webcam.warningCount}. Continued violations may result in disqualification.\n`;
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                }

                // Reset movement warning count
                this.state.webcam.movementWarningCount = 0;

                // If this is the third overall warning, take more serious action
                if (this.state.webcam.warningCount >= 3) {
                    this.handleExcessiveCheating();
                }
            }
        }
    },

    /**
     * Show a visual warning about detected cheating
     * @param {string} message - Warning message to display
     */
    showCheatingWarning: function(message) {
        // Create or get the warning element
        let warningElement = document.getElementById('cheating-warning');

        if (!warningElement) {
            warningElement = document.createElement('div');
            warningElement.id = 'cheating-warning';
            warningElement.className = 'cheating-warning';
            document.body.appendChild(warningElement);

            // Add CSS for the warning
            const style = document.createElement('style');
            style.textContent = `
                .cheating-warning {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: rgba(240, 71, 71, 0.9);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 1000;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                    max-width: 80%;
                    text-align: center;
                }

                @keyframes shake {
                    10%, 90% { transform: translateX(-51%); }
                    20%, 80% { transform: translateX(-49%); }
                    30%, 50%, 70% { transform: translateX(-52%); }
                    40%, 60% { transform: translateX(-48%); }
                }

                .cheating-warning.fade-out {
                    animation: fadeOut 1s forwards;
                }

                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; visibility: hidden; }
                }
            `;
            document.head.appendChild(style);
        }

        // Set the warning message
        warningElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        warningElement.className = 'cheating-warning'; // Reset class to remove fade-out

        // Make the webcam border flash red
        const webcamFeed = document.getElementById('webcam-feed');
        if (webcamFeed) {
            webcamFeed.style.boxShadow = '0 0 0 3px rgba(240, 71, 71, 1)';
            setTimeout(() => {
                webcamFeed.style.boxShadow = '';
            }, 5000);
        }

        // Remove the warning after 5 seconds
        setTimeout(() => {
            warningElement.className = 'cheating-warning fade-out';
        }, 5000);
    },

    /**
     * Handle excessive cheating (after 3 warnings)
     */
    handleExcessiveCheating: function() {
        // In a real implementation, this would:
        // 1. Notify the server about excessive cheating
        // 2. Potentially disqualify the user
        // 3. End the battle or apply penalties

        // For demo purposes, we'll show a more serious warning
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent += "> CRITICAL WARNING: Multiple anti-cheat violations detected.\n";
            terminalOutput.textContent += "> Your battle session has been flagged for review by moderators.\n";
            terminalOutput.textContent += "> Continued violations will result in automatic disqualification.\n";

            // Auto-scroll to bottom
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }

        // Show a more serious warning
        this.showCheatingWarning("CRITICAL: Multiple violations detected. Your session is being reviewed by moderators.");

        // Notify server about excessive cheating
        if (this.state.socket) {
            this.state.socket.emit('customs_battle_action', {
                battle_id: this.state.battleId,
                action_type: 'excessive_cheating_detected',
                warning_count: this.state.webcam.warningCount,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Stop webcam and anti-cheat monitoring
     */
    stopWebcam: function() {
        // Stop monitoring intervals
        if (this.state.webcam.monitoringInterval) {
            clearInterval(this.state.webcam.monitoringInterval);
            this.state.webcam.monitoringInterval = null;
        }

        if (this.state.webcam.faceDetectionInterval) {
            clearInterval(this.state.webcam.faceDetectionInterval);
            this.state.webcam.faceDetectionInterval = null;
        }

        if (this.state.webcam.movementDetectionInterval) {
            clearInterval(this.state.webcam.movementDetectionInterval);
            this.state.webcam.movementDetectionInterval = null;
        }

        // Stop webcam stream
        if (this.state.webcam.stream) {
            const tracks = this.state.webcam.stream.getTracks();
            tracks.forEach(track => track.stop());
            this.state.webcam.stream = null;
        }

        // Update state
        this.state.webcam.enabled = false;
        this.state.webcam.previousImageData = null;
        this.state.webcam.movementDetected = false;
        this.state.webcam.movementLevel = 0;
        this.state.webcam.stablePosition = false;
        this.state.webcam.stablePositionCounter = 0;

        // Update UI
        const webcamVideo = document.getElementById('webcam-video');
        const webcamPlaceholder = document.getElementById('webcam-placeholder');
        const webcamStatus = document.getElementById('webcam-status');

        if (webcamVideo) {
            webcamVideo.srcObject = null;
        }

        if (webcamPlaceholder) {
            webcamPlaceholder.style.display = 'flex';
        }

        if (webcamStatus) {
            webcamStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Camera access is required to participate in battles';
            webcamStatus.className = 'webcam-status';
        }

        // Disable run and submit buttons
        const runBtn = document.getElementById('run-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (runBtn) runBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;

        // Remove any active warnings
        const warningElement = document.getElementById('cheating-warning');
        if (warningElement) {
            warningElement.remove();
        }
    },

    /**
     * Run code
     */
    runCode: function() {
        const code = this.state.editor.getValue();
        const language = this.state.language;

        // Update terminal
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent = '> Running code...\n';
        }

        // Track execution start time for statistics
        const executionStartTime = Date.now();

        // Send code to server for execution
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'run_code',
            code: code,
            language: language
        });

        // For demo purposes, simulate test results
        this.simulateTestResults();

        // Track execution time for statistics
        setTimeout(() => {
            const executionTime = Date.now() - executionStartTime;
            this.state.statistics.executionTimes.push(executionTime);
        }, 2500);
    },

    /**
     * Submit code
     */
    submitCode: function() {
        const code = this.state.editor.getValue();
        const language = this.state.language;

        // Confirm submission
        if (!confirm('Are you sure you want to submit your solution? This will finalize your answer.')) {
            return;
        }

        // Update terminal
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent = '> Submitting solution...\n';
        }

        // Set end time for statistics
        this.state.statistics.endTime = Date.now();

        // Calculate statistics
        const stats = this.calculateStatistics();

        // Send code to server for submission
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'submit_code',
            code: code,
            language: language,
            statistics: stats
        });

        // For demo purposes, simulate test results
        this.simulateTestResults(true);
    },

    /**
     * Calculate statistics for submission
     * @returns {Object} Statistics object
     */
    calculateStatistics: function() {
        const stats = {
            keystrokes: this.state.statistics.keystrokes,
            code_length: this.state.statistics.codeLength,
            time_taken: Math.floor((this.state.statistics.endTime - this.state.statistics.startTime) / 1000),
            execution_time: 0,
            memory_used: Math.floor(Math.random() * 1000) + 500, // Simulated memory usage (500-1500 KB)
            test_cases_passed: 0,
            total_test_cases: 4
        };

        // Calculate average execution time if available
        if (this.state.statistics.executionTimes.length > 0) {
            const sum = this.state.statistics.executionTimes.reduce((a, b) => a + b, 0);
            stats.execution_time = Math.floor(sum / this.state.statistics.executionTimes.length);
        }

        // Count passed test cases
        stats.test_cases_passed = this.state.testCases.filter(tc => tc.status === 'passed').length;

        return stats;
    },

    /**
     * Simulate test results (for demo purposes)
     * @param {boolean} isSubmission Whether this is a final submission
     */
    simulateTestResults: function(isSubmission = false) {
        // Test case 1
        setTimeout(() => {
            this.updateTestCase(1, 'passed');
            this.updateProgress(25);

            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += '> Test case 1: Passed\n';
            }
        }, 500);

        // Test case 2
        setTimeout(() => {
            this.updateTestCase(2, 'passed');
            this.updateProgress(50);

            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += '> Test case 2: Passed\n';
            }
        }, 1000);

        // Test case 3
        setTimeout(() => {
            this.updateTestCase(3, 'failed');

            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += '> Test case 3: Failed\n';
                terminalOutput.textContent += '> Expected: [1, 2], Got: [0, 1]\n';
            }
        }, 1500);

        // Test case 4
        setTimeout(() => {
            this.updateTestCase(4, 'running');

            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += '> Test case 4: Running...\n';
            }
        }, 2000);

        setTimeout(() => {
            this.updateTestCase(4, 'passed');
            this.updateProgress(75);

            const terminalOutput = document.getElementById('terminal-output');
            if (terminalOutput) {
                terminalOutput.textContent += '> Test case 4: Passed\n';
            }

            const executionTime = document.getElementById('execution-time');
            if (executionTime) {
                executionTime.textContent = 'Execution time: 245ms';
            }

            // If this is a submission, show final results
            if (isSubmission) {
                setTimeout(() => {
                    const terminalOutput = document.getElementById('terminal-output');
                    if (terminalOutput) {
                        terminalOutput.textContent += '\n> Submission result: 3/4 test cases passed\n';
                        terminalOutput.textContent += '> Your solution needs improvement. Keep working on it!\n';
                    }
                }, 500);
            }
        }, 2500);
    },

    /**
     * Update test case status
     * @param {number} testCaseNumber Test case number (1-4)
     * @param {string} status Test case status ('pending', 'running', 'passed', 'failed')
     */
    updateTestCase: function(testCaseNumber, status) {
        const testCase = document.getElementById(`your-test-${testCaseNumber}`);
        if (!testCase) return;

        testCase.className = `test-case ${status}`;

        const statusElement = testCase.querySelector('.test-status');
        if (statusElement) {
            switch (status) {
                case 'pending':
                    statusElement.textContent = '○';
                    break;
                case 'running':
                    statusElement.textContent = '⟳';
                    break;
                case 'passed':
                    statusElement.textContent = '✓';
                    break;
                case 'failed':
                    statusElement.textContent = '✗';
                    break;
            }
        }

        // Update state
        this.state.testCases[testCaseNumber - 1].status = status;

        // Notify server about test result
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'test_result',
            test_case: testCaseNumber,
            status: status
        });
    },

    /**
     * Update opponent's test results
     * @param {Array} results Test results array
     */
    updateOpponentTestResults: function(results) {
        if (!results || !Array.isArray(results)) return;

        results.forEach((result, index) => {
            const testCaseNumber = index + 1;
            const testCase = document.getElementById(`opponent-test-${testCaseNumber}`);
            if (!testCase) return;

            const status = result.status || (result.passed ? 'passed' : 'failed');

            testCase.className = `test-case ${status}`;

            const statusElement = testCase.querySelector('.test-status');
            if (statusElement) {
                switch (status) {
                    case 'pending':
                        statusElement.textContent = '○';
                        break;
                    case 'running':
                        statusElement.textContent = '⟳';
                        break;
                    case 'passed':
                        statusElement.textContent = '✓';
                        break;
                    case 'failed':
                        statusElement.textContent = '✗';
                        break;
                }
            }

            // Update state
            this.state.opponentTestCases[index].status = status;
        });

        // Update opponent progress
        const passedCount = this.state.opponentTestCases.filter(tc => tc.status === 'passed').length;
        const progress = (passedCount / this.state.opponentTestCases.length) * 100;

        const progressBar = document.getElementById('opponent-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    },

    /**
     * Update your progress bar
     * @param {number} progress Progress percentage (0-100)
     */
    updateProgress: function(progress) {
        this.state.yourProgress = progress;

        const progressBar = document.getElementById('your-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    },

    /**
     * Handle time up event
     */
    handleTimeUp: function() {
        // Notify server
        this.state.socket.emit('customs_battle_action', {
            battle_id: this.state.battleId,
            action_type: 'time_up'
        });

        // Disable editor and buttons
        this.state.editor.setReadOnly(true);

        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = true;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        // Show time up message
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent += '\n> Time\'s up! Your final solution has been submitted.\n';
        }
    },

    /**
     * Handle battle end
     * @param {Object} data Battle end data
     */
    handleBattleEnd: function(data) {
        // Stop timer
        clearInterval(this.state.timer);

        // Disable editor and buttons
        this.state.editor.setReadOnly(true);

        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = true;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        // Show battle result
        const result = data.result || 'draw';
        let message = '';

        switch (result) {
            case 'win':
                message = 'Congratulations! You won the battle!';
                break;
            case 'loss':
                message = 'You lost the battle. Better luck next time!';
                break;
            case 'draw':
                message = 'The battle ended in a draw!';
                break;
        }

        // Show result in terminal
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent += `\n> Battle ended: ${message}\n`;

            if (data.rating_change) {
                terminalOutput.textContent += `> Rating change: ${data.rating_change > 0 ? '+' : ''}${data.rating_change}\n`;
            }

            // Show detailed statistics if available
            if (data.stats) {
                terminalOutput.textContent += '\n> Battle Statistics:\n';
                terminalOutput.textContent += `> Time taken: ${this.formatTime(data.stats.time_taken)}\n`;
                terminalOutput.textContent += `> Code length: ${data.stats.code_length} characters\n`;
                terminalOutput.textContent += `> Execution time: ${data.stats.execution_time}ms\n`;
                terminalOutput.textContent += `> Memory used: ${data.stats.memory_used}KB\n`;

                if (data.stats.test_cases_passed) {
                    terminalOutput.textContent += `> Test cases passed: ${data.stats.test_cases_passed}/${data.stats.total_test_cases}\n`;
                }
            }
        }

        // Show alert
        setTimeout(() => {
            alert(message);
        }, 500);
    },

    /**
     * Handle opponent disconnect
     */
    handleOpponentDisconnect: function() {
        // Show notification
        const terminalOutput = document.getElementById('terminal-output');
        if (terminalOutput) {
            terminalOutput.textContent += '\n> Your opponent has disconnected from the battle.\n';
            terminalOutput.textContent += '> You win by default!\n';
        }

        // Show alert
        setTimeout(() => {
            alert('Your opponent has disconnected. You win by default!');
        }, 500);

        // Disable editor and buttons
        this.state.editor.setReadOnly(true);

        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.disabled = true;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
        }

        // Stop timer
        clearInterval(this.state.timer);
    },

    /**
     * Update code history
     * @param {Array} history Code history entries
     */
    updateCodeHistory: function(history) {
        if (!history || !Array.isArray(history) || history.length === 0) return;

        // Create history UI if it doesn't exist
        this.createCodeHistoryUI();

        // Update history list
        const historyList = document.getElementById('code-history-list');
        if (!historyList) return;

        // Clear existing entries
        historyList.innerHTML = '';

        // Add history entries
        history.forEach((entry, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-info">
                    <span class="history-version">v${index + 1}</span>
                    <span class="history-time">${this.formatTime(new Date(entry.timestamp))}</span>
                </div>
                <button class="history-view-btn" data-index="${index}">View</button>
            `;

            historyList.appendChild(historyItem);

            // Add click event
            const viewBtn = historyItem.querySelector('.history-view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    this.viewCodeVersion(entry.code);
                });
            }
        });
    },

    /**
     * Create code history UI
     */
    createCodeHistoryUI: function() {
        // Check if history UI already exists
        if (document.getElementById('code-history-panel')) return;

        // Create history panel
        const historyPanel = document.createElement('div');
        historyPanel.id = 'code-history-panel';
        historyPanel.className = 'code-history-panel';
        historyPanel.innerHTML = `
            <div class="history-header">
                <h3>Code History</h3>
                <button id="close-history-btn" class="close-history-btn">×</button>
            </div>
            <div class="history-body">
                <div id="code-history-list" class="code-history-list"></div>
            </div>
        `;

        // Add to page
        const codeEditorContainer = document.querySelector('.code-editor-container');
        if (codeEditorContainer) {
            codeEditorContainer.appendChild(historyPanel);
        }

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .code-history-panel {
                position: absolute;
                top: 50px;
                right: 10px;
                width: 200px;
                background-color: var(--bg-secondary);
                border-radius: var(--border-radius);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                z-index: 10;
                display: none;
            }

            .code-history-panel.show {
                display: block;
            }

            .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .history-header h3 {
                margin: 0;
                font-size: 1rem;
            }

            .close-history-btn {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.2rem;
                cursor: pointer;
            }

            .close-history-btn:hover {
                color: var(--text-primary);
            }

            .code-history-list {
                max-height: 300px;
                overflow-y: auto;
                padding: 10px;
            }

            .history-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                border-radius: var(--border-radius);
                margin-bottom: 5px;
                background-color: var(--bg-tertiary);
            }

            .history-info {
                display: flex;
                flex-direction: column;
            }

            .history-version {
                font-weight: 500;
            }

            .history-time {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }

            .history-view-btn {
                background-color: var(--accent-primary);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 0.8rem;
                cursor: pointer;
            }

            .history-view-btn:hover {
                background-color: var(--accent-secondary);
            }

            .history-toggle-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: var(--bg-tertiary);
                color: var(--text-primary);
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 0.8rem;
                cursor: pointer;
                z-index: 5;
            }
        `;

        document.head.appendChild(style);

        // Add history toggle button to editor header
        const editorHeader = document.querySelector('.editor-header');
        if (editorHeader) {
            const historyToggleBtn = document.createElement('button');
            historyToggleBtn.className = 'history-toggle-btn';
            historyToggleBtn.innerHTML = '<i class="fas fa-history"></i> History';
            historyToggleBtn.addEventListener('click', () => {
                this.toggleCodeHistory();
            });

            editorHeader.appendChild(historyToggleBtn);
        }

        // Close button event
        const closeBtn = document.getElementById('close-history-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleCodeHistory(false);
            });
        }
    },

    /**
     * Toggle code history panel
     * @param {boolean} show Whether to show or hide the panel
     */
    toggleCodeHistory: function(show) {
        const historyPanel = document.getElementById('code-history-panel');
        if (!historyPanel) return;

        if (typeof show === 'boolean') {
            historyPanel.classList.toggle('show', show);
        } else {
            historyPanel.classList.toggle('show');
        }
    },

    /**
     * View a specific code version
     * @param {string} code Code to view
     */
    viewCodeVersion: function(code) {
        // Store current code
        const currentCode = this.state.editor.getValue();

        // Create a modal to show the code
        const modal = document.createElement('div');
        modal.className = 'code-history-modal';
        modal.innerHTML = `
            <div class="history-modal-content">
                <div class="history-modal-header">
                    <h3>Code Version</h3>
                    <button class="history-modal-close">×</button>
                </div>
                <div class="history-modal-body">
                    <div id="history-code-view" class="history-code-view"></div>
                </div>
                <div class="history-modal-footer">
                    <button id="restore-code-btn" class="restore-code-btn">Restore This Version</button>
                    <button class="history-modal-close-btn">Close</button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(modal);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .code-history-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .history-modal-content {
                background-color: var(--bg-secondary);
                border-radius: var(--border-radius);
                width: 80%;
                max-width: 800px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            }

            .history-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .history-modal-header h3 {
                margin: 0;
            }

            .history-modal-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
            }

            .history-modal-body {
                flex: 1;
                overflow: hidden;
                padding: 15px;
            }

            .history-code-view {
                height: 400px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: var(--border-radius);
            }

            .history-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .restore-code-btn {
                background-color: var(--accent-primary);
                color: white;
                border: none;
                border-radius: var(--border-radius);
                padding: 8px 16px;
                cursor: pointer;
            }

            .history-modal-close-btn {
                background-color: var(--bg-tertiary);
                color: var(--text-primary);
                border: none;
                border-radius: var(--border-radius);
                padding: 8px 16px;
                cursor: pointer;
            }
        `;

        document.head.appendChild(style);

        // Initialize code viewer
        const historyEditor = ace.edit('history-code-view');
        historyEditor.setTheme('ace/theme/monokai');
        historyEditor.session.setMode(`ace/mode/${this.state.language}`);
        historyEditor.setValue(code);
        historyEditor.setReadOnly(true);

        // Close button events
        const closeButtons = modal.querySelectorAll('.history-modal-close, .history-modal-close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
                style.remove();
            });
        });

        // Restore button event
        const restoreBtn = document.getElementById('restore-code-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                // Confirm restore
                if (confirm('Are you sure you want to restore this version? Your current code will be replaced.')) {
                    this.state.editor.setValue(code);
                    modal.remove();
                    style.remove();
                }
            });
        }
    },

    /**
     * Format time duration
     * @param {number} seconds Time in seconds
     * @returns {string} Formatted time
     */
    formatTime: function(seconds) {
        if (typeof seconds !== 'number') {
            return '00:00';
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const user = localStorage.getItem('user');
    if (!user) {
        // Redirect to login
        window.location.href = 'login.html';
        return;
    }

    // Initialize battle
    CustomsBattle.init();
});
