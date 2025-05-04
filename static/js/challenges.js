/**
 * CodeBattle Challenges JavaScript
 * This file contains the functionality for the challenges page
 */

// Store user data
let userData = {
    completedChallenges: [],
    totalPoints: 0,
    streak: 0,
    lastActive: null
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Load user data from localStorage
    loadUserData();

    // Update rewards display
    updateRewardsDisplay();

    // Initialize code editor if it exists
    if (document.getElementById('editor')) {
        initializeEditor();
    }
});

// Initialize the code editor
function initializeEditor() {
    // Initialize Ace editor
    window.editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/javascript");
    editor.setFontSize(14);

    // Set up language change event
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', changeLanguage);
    }
}

// Change editor language
function changeLanguage() {
    const language = document.getElementById('language-select').value;

    // Set editor mode
    if (language === 'javascript') {
        editor.session.setMode("ace/mode/javascript");
    } else if (language === 'python') {
        editor.session.setMode("ace/mode/python");
    } else if (language === 'java') {
        editor.session.setMode("ace/mode/java");
    } else if (language === 'cpp') {
        editor.session.setMode("ace/mode/c_cpp");
    }

    // Update code template
    if (window.currentChallenge) {
        setInitialCode(language);
    }
}

// Set initial code template based on language and challenge
function setInitialCode(language) {
    if (!window.currentChallenge) return;

    const challenge = window.currentChallenge;

    const codeTemplates = {
        javascript: `/**
 * ${challenge.title}
 * ${challenge.description}
 */
function solution(input) {
    // Your code here

    return [];
}

// Example usage:
// const result = solution([2, 7, 11, 15], 9);
// console.log(result);`,

        python: `# ${challenge.title}
# ${challenge.description}

def solution(input):
    # Your code here

    return []

# Example usage:
# result = solution([2, 7, 11, 15], 9)
# print(result)`,

        java: `/**
 * ${challenge.title}
 * ${challenge.description}
 */
public class Solution {
    public static void main(String[] args) {
        // Example usage
        // int[] result = solution(new int[]{2, 7, 11, 15}, 9);
        // System.out.println(Arrays.toString(result));
    }

    public static int[] solution(int[] nums, int target) {
        // Your code here

        return new int[]{};
    }
}`,

        cpp: `/**
 * ${challenge.title}
 * ${challenge.description}
 */
#include <iostream>
#include <vector>
using namespace std;

vector<int> solution(vector<int>& nums, int target) {
    // Your code here

    return {};
}

int main() {
    // Example usage
    // vector<int> nums = {2, 7, 11, 15};
    // int target = 9;
    // vector<int> result = solution(nums, target);
    // for (int i : result) {
    //     cout << i << " ";
    // }
    return 0;
}`
    };

    editor.setValue(codeTemplates[language], -1);
}

// Reset code to initial template
function resetCode() {
    const language = document.getElementById('language-select').value;
    setInitialCode(language);
}

// Run code
function runCode() {
    if (!window.currentChallenge) return;

    const code = editor.getValue();
    const language = document.getElementById('language-select').value;

    appendToTerminal(`> Running ${language} code...`);

    // In a real app, this would send the code to a backend for execution
    // For demo purposes, we'll simulate running the code
    setTimeout(() => {
        // Simulate test case results
        window.currentChallenge.test_cases.forEach((testCase, index) => {
            const passed = Math.random() > 0.3; // 70% chance of passing

            if (passed) {
                appendToTerminal(`> Test case ${index + 1}: PASSED`);
            } else {
                appendToTerminal(`> Test case ${index + 1}: FAILED`);
                appendToTerminal(`  Input: ${testCase.input}`);
                appendToTerminal(`  Expected: ${testCase.output}`);
                appendToTerminal(`  Actual: [Different output]`);
            }
        });

        appendToTerminal(`> Execution completed`);
    }, 1000);
}

// Submit code
function submitCode() {
    if (!window.currentChallenge) return;

    const code = editor.getValue();
    const language = document.getElementById('language-select').value;

    appendToTerminal(`> Submitting solution for ${window.currentChallenge.title}...`);

    // In a real app, this would send the code to a backend for evaluation
    // For demo purposes, we'll simulate submission
    setTimeout(() => {
        // Simulate all test cases passing
        let allPassed = true;

        window.currentChallenge.test_cases.forEach((testCase, index) => {
            const passed = Math.random() > 0.2; // 80% chance of passing

            if (passed) {
                appendToTerminal(`> Test case ${index + 1}: PASSED`);
            } else {
                allPassed = false;
                appendToTerminal(`> Test case ${index + 1}: FAILED`);
                appendToTerminal(`  Input: ${testCase.input}`);
                appendToTerminal(`  Expected: ${testCase.output}`);
                appendToTerminal(`  Actual: [Different output]`);
            }
        });

        if (allPassed) {
            appendToTerminal(`> All test cases passed! Challenge completed.`);

            // Check if challenge was already completed
            if (!userData.completedChallenges.includes(window.currentChallenge.id)) {
                // Add to completed challenges
                userData.completedChallenges.push(window.currentChallenge.id);

                // Award points
                userData.totalPoints += window.currentChallenge.points;

                // Show toast notification
                showToast(`You earned ${window.currentChallenge.points} points!`);

                // Update rewards display
                updateRewardsDisplay();

                // Save user data
                saveUserData();
            } else {
                appendToTerminal(`> You've already completed this challenge before.`);
            }
        } else {
            appendToTerminal(`> Some test cases failed. Try again!`);
        }
    }, 1500);
}

// Append text to terminal
function appendToTerminal(text) {
    const terminal = document.getElementById('terminal-output');
    if (terminal) {
        terminal.innerHTML += text + '\n';
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Clear terminal
function clearTerminal() {
    const terminal = document.getElementById('terminal-output');
    if (terminal) {
        terminal.innerHTML = '';
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('reward-toast');
    if (toast) {
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Select a challenge
function selectChallenge(id) {
    // Get challenges data from the global variable
    const challenges = window.challenges || [];

    // Remove active class from all challenges
    document.querySelectorAll('.challenge-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to selected challenge
    const selectedItem = document.querySelector(`.challenge-item[data-id="${id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    // Find the challenge data
    window.currentChallenge = challenges.find(c => c.id === id);

    if (!window.currentChallenge) return;

    // Hide placeholder and show challenge details
    const placeholder = document.getElementById('challenge-placeholder');
    const details = document.getElementById('challenge-details');

    if (placeholder) placeholder.style.display = 'none';
    if (details) details.style.display = 'block';

    // Update challenge details
    const titleElement = document.getElementById('challenge-title');
    const descriptionElement = document.getElementById('challenge-description');
    const difficultyElement = document.getElementById('challenge-difficulty');
    const categoryElement = document.getElementById('challenge-category');
    const pointsElement = document.getElementById('challenge-points');

    if (titleElement) titleElement.textContent = window.currentChallenge.title;
    if (descriptionElement) descriptionElement.textContent = window.currentChallenge.description;

    if (difficultyElement) {
        difficultyElement.textContent = window.currentChallenge.difficulty;
        difficultyElement.className = 'difficulty ' + window.currentChallenge.difficulty.toLowerCase();
    }

    if (categoryElement) categoryElement.textContent = window.currentChallenge.category;
    if (pointsElement) pointsElement.textContent = window.currentChallenge.points;

    // Update test cases
    const testCasesContainer = document.getElementById('test-cases-container');
    if (testCasesContainer) {
        testCasesContainer.innerHTML = '';

        window.currentChallenge.test_cases.forEach((testCase, index) => {
            const testCaseElement = document.createElement('div');
            testCaseElement.className = 'test-case';
            testCaseElement.innerHTML = `
                <h4>Test Case ${index + 1}</h4>
                <p><strong>Input:</strong> ${testCase.input}</p>
                <p><strong>Expected Output:</strong> ${testCase.output}</p>
            `;
            testCasesContainer.appendChild(testCaseElement);
        });
    }

    // Set initial code template
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        setInitialCode(languageSelect.value);
    }

    // Clear terminal
    clearTerminal();
}

// Update rewards display
function updateRewardsDisplay() {
    const pointsValue = document.getElementById('points-value');
    const challengesCompleted = document.getElementById('challenges-completed');
    const streakValue = document.getElementById('streak-value');
    const challengesProgress = document.getElementById('challenges-progress');

    if (pointsValue) pointsValue.textContent = userData.totalPoints;

    // Get total number of challenges
    const totalChallenges = window.challenges ? window.challenges.length : 5;

    if (challengesCompleted) {
        challengesCompleted.textContent = `${userData.completedChallenges.length}/${totalChallenges}`;
    }

    if (streakValue) streakValue.textContent = userData.streak;

    // Update progress bar
    if (challengesProgress) {
        const progressPercentage = (userData.completedChallenges.length / totalChallenges) * 100;
        challengesProgress.style.width = `${progressPercentage}%`;
    }
}

// Save user data to localStorage
function saveUserData() {
    userData.lastActive = new Date().toISOString().split('T')[0]; // Today's date
    localStorage.setItem('codebattle_user_data', JSON.stringify(userData));
}

// Load user data from localStorage
function loadUserData() {
    const storedData = localStorage.getItem('codebattle_user_data');

    if (storedData) {
        const data = JSON.parse(storedData);
        userData.completedChallenges = data.completedChallenges || [];
        userData.totalPoints = data.totalPoints || 0;
        userData.streak = data.streak || 0;
        userData.lastActive = data.lastActive;

        // Check if user was active yesterday
        const today = new Date().toISOString().split('T')[0];
        const lastActive = userData.lastActive;

        if (lastActive) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActive === yesterdayStr) {
                // User was active yesterday, increment streak
                userData.streak++;
            } else if (lastActive !== today) {
                // User wasn't active yesterday or today, reset streak
                userData.streak = 1;
            }

            // Save updated streak
            saveUserData();
        }
    }
}
