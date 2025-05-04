from flask import Flask, render_template, redirect, url_for, request, session, jsonify, Response
from flask_socketio import SocketIO, emit, join_room, leave_room
import time

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

# Set a secret key for session management
app.secret_key = 'your_secret_key_here'  # Change this to a random secret key in production

# Initialize Socket.IO
socketio = SocketIO(app, cors_allowed_origins="*")

# Helper function to get challenges data
def get_challenges_data():
    """
    Returns comprehensive challenges data.
    In a real app, this would fetch data from a database.
    """
    return [
        # Array/String Problems - Easy
        {
            'id': 1,
            'title': 'Two Sum',
            'description': 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
            'difficulty': 'Easy',
            'points': 50,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[2,7,11,15], 9', 'output': '[0,1]'},
                {'input': '[3,2,4], 6', 'output': '[1,2]'},
                {'input': '[3,3], 6', 'output': '[0,1]'}
            ]
        },
        {
            'id': 2,
            'title': 'Valid Palindrome',
            'description': 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.',
            'difficulty': 'Easy',
            'points': 50,
            'category': 'Strings',
            'test_cases': [
                {'input': '"A man, a plan, a canal: Panama"', 'output': 'true'},
                {'input': '"race a car"', 'output': 'false'},
                {'input': '" "', 'output': 'true'}
            ]
        },
        {
            'id': 3,
            'title': 'Valid Anagram',
            'description': 'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
            'difficulty': 'Easy',
            'points': 50,
            'category': 'Strings',
            'test_cases': [
                {'input': '"anagram", "nagaram"', 'output': 'true'},
                {'input': '"rat", "car"', 'output': 'false'},
                {'input': '"listen", "silent"', 'output': 'true'}
            ]
        },
        {
            'id': 4,
            'title': 'Best Time to Buy and Sell Stock',
            'description': 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[7,1,5,3,6,4]', 'output': '5'},
                {'input': '[7,6,4,3,1]', 'output': '0'},
                {'input': '[2,4,1]', 'output': '2'}
            ]
        },
        {
            'id': 5,
            'title': 'Merge Two Sorted Lists',
            'description': 'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Linked Lists',
            'test_cases': [
                {'input': '[1,2,4], [1,3,4]', 'output': '[1,1,2,3,4,4]'},
                {'input': '[], []', 'output': '[]'},
                {'input': '[], [0]', 'output': '[0]'}
            ]
        },

        # Array/String Problems - Medium
        {
            'id': 6,
            'title': '3Sum',
            'description': 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.',
            'difficulty': 'Medium',
            'points': 100,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[-1,0,1,2,-1,-4]', 'output': '[[-1,-1,2],[-1,0,1]]'},
                {'input': '[0,1,1]', 'output': '[]'},
                {'input': '[0,0,0]', 'output': '[[0,0,0]]'}
            ]
        },
        {
            'id': 7,
            'title': 'Longest Substring Without Repeating Characters',
            'description': 'Given a string s, find the length of the longest substring without repeating characters.',
            'difficulty': 'Medium',
            'points': 100,
            'category': 'Strings',
            'test_cases': [
                {'input': '"abcabcbb"', 'output': '3'},
                {'input': '"bbbbb"', 'output': '1'},
                {'input': '"pwwkew"', 'output': '3'}
            ]
        },
        {
            'id': 8,
            'title': 'Container With Most Water',
            'description': 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
            'difficulty': 'Medium',
            'points': 125,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[1,8,6,2,5,4,8,3,7]', 'output': '49'},
                {'input': '[1,1]', 'output': '1'},
                {'input': '[4,3,2,1,4]', 'output': '16'}
            ]
        },
        {
            'id': 9,
            'title': 'Group Anagrams',
            'description': 'Given an array of strings strs, group the anagrams together. You can return the answer in any order. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
            'difficulty': 'Medium',
            'points': 125,
            'category': 'Strings',
            'test_cases': [
                {'input': '["eat","tea","tan","ate","nat","bat"]', 'output': '[["bat"],["nat","tan"],["ate","eat","tea"]]'},
                {'input': '[""]', 'output': '[[""]]'},
                {'input': '["a"]', 'output': '[["a"]]'}
            ]
        },
        {
            'id': 10,
            'title': 'Rotate Image',
            'description': 'You are given an n x n 2D matrix representing an image, rotate the image by 90 degrees (clockwise). You have to rotate the image in-place, which means you have to modify the input 2D matrix directly. DO NOT allocate another 2D matrix and do the rotation.',
            'difficulty': 'Medium',
            'points': 150,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[[1,2,3],[4,5,6],[7,8,9]]', 'output': '[[7,4,1],[8,5,2],[9,6,3]]'},
                {'input': '[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]', 'output': '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]'},
                {'input': '[[1]]', 'output': '[[1]]'}
            ]
        },

        # Array/String Problems - Hard
        {
            'id': 11,
            'title': 'Trapping Rain Water',
            'description': 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
            'difficulty': 'Hard',
            'points': 200,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[0,1,0,2,1,0,1,3,2,1,2,1]', 'output': '6'},
                {'input': '[4,2,0,3,2,5]', 'output': '9'},
                {'input': '[4,2,3]', 'output': '1'}
            ]
        },
        {
            'id': 12,
            'title': 'Median of Two Sorted Arrays',
            'description': 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).',
            'difficulty': 'Hard',
            'points': 200,
            'category': 'Arrays',
            'test_cases': [
                {'input': '[1,3], [2]', 'output': '2.0'},
                {'input': '[1,2], [3,4]', 'output': '2.5'},
                {'input': '[0,0], [0,0]', 'output': '0.0'}
            ]
        },
        {
            'id': 13,
            'title': 'Longest Valid Parentheses',
            'description': 'Given a string containing just the characters "(" and ")", find the length of the longest valid (well-formed) parentheses substring.',
            'difficulty': 'Hard',
            'points': 250,
            'category': 'Strings',
            'test_cases': [
                {'input': '"(()"', 'output': '2'},
                {'input': '")()())"', 'output': '4'},
                {'input': '""', 'output': '0'}
            ]
        },

        # Dynamic Programming Problems
        {
            'id': 14,
            'title': 'Climbing Stairs',
            'description': 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Dynamic Programming',
            'test_cases': [
                {'input': '2', 'output': '2'},
                {'input': '3', 'output': '3'},
                {'input': '5', 'output': '8'}
            ]
        },
        {
            'id': 15,
            'title': 'Coin Change',
            'description': 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.',
            'difficulty': 'Medium',
            'points': 150,
            'category': 'Dynamic Programming',
            'test_cases': [
                {'input': '[1,2,5], 11', 'output': '3'},
                {'input': '[2], 3', 'output': '-1'},
                {'input': '[1], 0', 'output': '0'}
            ]
        },
        {
            'id': 16,
            'title': 'Longest Increasing Subsequence',
            'description': 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
            'difficulty': 'Medium',
            'points': 150,
            'category': 'Dynamic Programming',
            'test_cases': [
                {'input': '[10,9,2,5,3,7,101,18]', 'output': '4'},
                {'input': '[0,1,0,3,2,3]', 'output': '4'},
                {'input': '[7,7,7,7,7,7,7]', 'output': '1'}
            ]
        },
        {
            'id': 17,
            'title': 'Word Break',
            'description': 'Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words. Note that the same word in the dictionary may be reused multiple times in the segmentation.',
            'difficulty': 'Medium',
            'points': 175,
            'category': 'Dynamic Programming',
            'test_cases': [
                {'input': '"leetcode", ["leet","code"]', 'output': 'true'},
                {'input': '"applepenapple", ["apple","pen"]', 'output': 'true'},
                {'input': '"catsandog", ["cats","dog","sand","and","cat"]', 'output': 'false'}
            ]
        },
        {
            'id': 18,
            'title': 'Regular Expression Matching',
            'description': 'Given an input string s and a pattern p, implement regular expression matching with support for "." and "*" where: "." Matches any single character. "*" Matches zero or more of the preceding element. The matching should cover the entire input string (not partial).',
            'difficulty': 'Hard',
            'points': 250,
            'category': 'Dynamic Programming',
            'test_cases': [
                {'input': '"aa", "a"', 'output': 'false'},
                {'input': '"aa", "a*"', 'output': 'true'},
                {'input': '"ab", ".*"', 'output': 'true'}
            ]
        },

        # Graph Problems
        {
            'id': 19,
            'title': 'Number of Islands',
            'description': 'Given an m x n 2D binary grid grid which represents a map of "1"s (land) and "0"s (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.',
            'difficulty': 'Medium',
            'points': 150,
            'category': 'Graphs',
            'test_cases': [
                {'input': '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', 'output': '1'},
                {'input': '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', 'output': '3'},
                {'input': '[["1","0","1"],["0","1","0"],["1","0","1"]]', 'output': '5'}
            ]
        },
        {
            'id': 20,
            'title': 'Course Schedule',
            'description': 'There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.',
            'difficulty': 'Medium',
            'points': 175,
            'category': 'Graphs',
            'test_cases': [
                {'input': '2, [[1,0]]', 'output': 'true'},
                {'input': '2, [[1,0],[0,1]]', 'output': 'false'},
                {'input': '5, [[0,1],[0,2],[1,3],[1,4],[3,4]]', 'output': 'true'}
            ]
        },
        {
            'id': 21,
            'title': 'Word Ladder',
            'description': 'A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that: Every adjacent pair of words differs by a single letter. Every si for 1 <= i <= k is in wordList. Note that beginWord does not need to be in wordList. sk == endWord. Given two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.',
            'difficulty': 'Hard',
            'points': 225,
            'category': 'Graphs',
            'test_cases': [
                {'input': '"hit", "cog", ["hot","dot","dog","lot","log","cog"]', 'output': '5'},
                {'input': '"hit", "cog", ["hot","dot","dog","lot","log"]', 'output': '0'},
                {'input': '"a", "c", ["a","b","c"]', 'output': '2'}
            ]
        },

        # Tree Problems
        {
            'id': 22,
            'title': 'Maximum Depth of Binary Tree',
            'description': 'Given the root of a binary tree, return its maximum depth. A binary tree\'s maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Trees',
            'test_cases': [
                {'input': '[3,9,20,null,null,15,7]', 'output': '3'},
                {'input': '[1,null,2]', 'output': '2'},
                {'input': '[]', 'output': '0'}
            ]
        },
        {
            'id': 23,
            'title': 'Validate Binary Search Tree',
            'description': 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST is defined as follows: The left subtree of a node contains only nodes with keys less than the node\'s key. The right subtree of a node contains only nodes with keys greater than the node\'s key. Both the left and right subtrees must also be binary search trees.',
            'difficulty': 'Medium',
            'points': 150,
            'category': 'Trees',
            'test_cases': [
                {'input': '[2,1,3]', 'output': 'true'},
                {'input': '[5,1,4,null,null,3,6]', 'output': 'false'},
                {'input': '[5,4,6,null,null,3,7]', 'output': 'false'}
            ]
        },
        {
            'id': 24,
            'title': 'Binary Tree Maximum Path Sum',
            'description': 'A path in a binary tree is a sequence of nodes where each pair of adjacent nodes in the sequence has an edge connecting them. A node can only appear in the sequence at most once. Note that the path does not need to pass through the root. The path sum of a path is the sum of the node\'s values in the path. Given the root of a binary tree, return the maximum path sum of any non-empty path.',
            'difficulty': 'Hard',
            'points': 250,
            'category': 'Trees',
            'test_cases': [
                {'input': '[1,2,3]', 'output': '6'},
                {'input': '[-10,9,20,null,null,15,7]', 'output': '42'},
                {'input': '[2,-1]', 'output': '2'}
            ]
        },

        # Heap/Priority Queue Problems
        {
            'id': 25,
            'title': 'Kth Largest Element in an Array',
            'description': 'Given an integer array nums and an integer k, return the kth largest element in the array. Note that it is the kth largest element in the sorted order, not the kth distinct element.',
            'difficulty': 'Medium',
            'points': 125,
            'category': 'Heaps',
            'test_cases': [
                {'input': '[3,2,1,5,6,4], 2', 'output': '5'},
                {'input': '[3,2,3,1,2,4,5,5,6], 4', 'output': '4'},
                {'input': '[1], 1', 'output': '1'}
            ]
        },
        {
            'id': 26,
            'title': 'Merge k Sorted Lists',
            'description': 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
            'difficulty': 'Hard',
            'points': 200,
            'category': 'Heaps',
            'test_cases': [
                {'input': '[[1,4,5],[1,3,4],[2,6]]', 'output': '[1,1,2,3,4,4,5,6]'},
                {'input': '[]', 'output': '[]'},
                {'input': '[[]]', 'output': '[]'}
            ]
        },

        # Bit Manipulation Problems
        {
            'id': 27,
            'title': 'Single Number',
            'description': 'Given a non-empty array of integers nums, every element appears twice except for one. Find that single one. You must implement a solution with a linear runtime complexity and use only constant extra space.',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Bit Manipulation',
            'test_cases': [
                {'input': '[2,2,1]', 'output': '1'},
                {'input': '[4,1,2,1,2]', 'output': '4'},
                {'input': '[1]', 'output': '1'}
            ]
        },
        {
            'id': 28,
            'title': 'Counting Bits',
            'description': 'Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1\'s in the binary representation of i.',
            'difficulty': 'Easy',
            'points': 75,
            'category': 'Bit Manipulation',
            'test_cases': [
                {'input': '2', 'output': '[0,1,1]'},
                {'input': '5', 'output': '[0,1,1,2,1,2]'},
                {'input': '0', 'output': '[0]'}
            ]
        },

        # Math Problems
        {
            'id': 29,
            'title': 'Pow(x, n)',
            'description': 'Implement pow(x, n), which calculates x raised to the power n (i.e., x^n).',
            'difficulty': 'Medium',
            'points': 125,
            'category': 'Math',
            'test_cases': [
                {'input': '2.00000, 10', 'output': '1024.00000'},
                {'input': '2.10000, 3', 'output': '9.26100'},
                {'input': '2.00000, -2', 'output': '0.25000'}
            ]
        },
        {
            'id': 30,
            'title': 'Factorial Trailing Zeroes',
            'description': 'Given an integer n, return the number of trailing zeroes in n!. Note that n! = n * (n - 1) * (n - 2) * ... * 3 * 2 * 1.',
            'difficulty': 'Medium',
            'points': 125,
            'category': 'Math',
            'test_cases': [
                {'input': '3', 'output': '0'},
                {'input': '5', 'output': '1'},
                {'input': '0', 'output': '0'}
            ]
        },
        {
            'id': 2,
            'title': 'Reverse String',
            'description': 'Write a function that reverses a string. The input string is given as an array of characters.',
            'difficulty': 'Easy',
            'points': 30,
            'test_cases': [
                {'input': "['h','e','l','l','o']", 'output': "['o','l','l','e','h']"},
                {'input': "['H','a','n','n','a','h']", 'output': "['h','a','n','n','a','H']"}
            ]
        },
        {
            'id': 3,
            'title': 'Palindrome Number',
            'description': 'Given an integer x, return true if x is a palindrome, and false otherwise.',
            'difficulty': 'Easy',
            'points': 40,
            'test_cases': [
                {'input': '121', 'output': 'true'},
                {'input': '-121', 'output': 'false'},
                {'input': '10', 'output': 'false'}
            ]
        },
        {
            'id': 4,
            'title': 'Valid Parentheses',
            'description': 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
            'difficulty': 'Medium',
            'points': 70,
            'test_cases': [
                {'input': '()', 'output': 'true'},
                {'input': '()[]{}', 'output': 'true'},
                {'input': '(]', 'output': 'false'}
            ]
        },
        {
            'id': 5,
            'title': 'Merge Sorted Arrays',
            'description': 'Merge two sorted arrays into a single sorted array.',
            'difficulty': 'Medium',
            'points': 80,
            'test_cases': [
                {'input': '[1,3,5], [2,4,6]', 'output': '[1,2,3,4,5,6]'},
                {'input': '[1,2,3], [4,5,6]', 'output': '[1,2,3,4,5,6]'}
            ]
        }
    ]

# Home page route
@app.route('/')
@app.route('/home')
def home():
    # Get challenges data from the helper function
    challenges_data = get_challenges_data()

    return render_template('dashboard.html', challenges=challenges_data)

# Battle page route
@app.route('/battle')
def battle():
    return render_template('battle.html')

@app.route('/customs-battle')
def customs_battle():
    """Customs battle page route."""
    return render_template('customs_battle.html')

@app.route('/customs-battle-interface')
def customs_battle_interface():
    """Customs battle interface route."""
    battle_id = request.args.get('id')
    opponent = request.args.get('opponent')
    rating = request.args.get('rating', '1000')

    # Serve the enhanced battle interface directly from the file
    with open('Frontend/customs_battle.html', 'r') as file:
        html_content = file.read()

    # Replace placeholders with actual values
    html_content = html_content.replace('21a24e1c-5226-43b9-9fd2-384765513fa7', battle_id)
    html_content = html_content.replace('John Smith', opponent)
    html_content = html_content.replace('<span id="opponent-rating">1200</span>', f'<span id="opponent-rating">{rating}</span>')

    return html_content

@app.route('/customs-battle-test')
def customs_battle_test():
    """Customs battle test page route."""
    return render_template('customs_battle_test.html')

@app.route('/customs_battle.js')
def customs_battle_js():
    """Serve the customs battle JavaScript file."""
    with open('Frontend/customs_battle.js', 'r') as file:
        js_content = file.read()
    return Response(js_content, mimetype='application/javascript')

@app.route('/customs_battle_chat.js')
def customs_battle_chat_js():
    """Serve the customs battle chat JavaScript file."""
    with open('Frontend/customs_battle_chat.js', 'r') as file:
        js_content = file.read()
    return Response(js_content, mimetype='application/javascript')

@app.route('/auth.js')
def auth_js():
    """Serve the auth JavaScript file."""
    # Create a simple auth.js file if it doesn't exist
    auth_js_content = """
    // Simple Auth Module
    const Auth = {
        getCurrentUser: function() {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        }
    };
    """
    return Response(auth_js_content, mimetype='application/javascript')

# Leaderboard page route
@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

# Hiring Platform (practice) page route
@app.route('/practice')
def practice():
    return render_template('practice.html')

# User profile page route
@app.route('/user')
def user_profile():
    return render_template('user.html')

# Login page route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        password = request.form.get('password')

        # In a real app, you would validate against a database
        # For now, we'll use the client-side Auth module

        # Store user in session
        session['username'] = username

        # Redirect to home
        return redirect(url_for('home'))
    return render_template('login.html')

# Signup route
@app.route('/signup', methods=['POST'])
def signup():
    if request.method == 'POST':
        # Get form data
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        # In a real app, you would:
        # 1. Validate the data
        # 2. Check if username/email already exists
        # 3. Hash the password
        # 4. Store in database

        # For now, we'll use the client-side Auth module

        # Store user in session
        session['username'] = username

        # Redirect to home
        return redirect(url_for('home'))
    return redirect(url_for('login'))

# Friends page route
@app.route('/friends')
def friends():
    return render_template('friends.html')

# Messages page route
@app.route('/messages')
def messages():
    return render_template('messages.html')

# Settings page route
@app.route('/settings')
def settings():
    return render_template('settings.html')

# Achievements page route
@app.route('/achievements')
def achievements():
    return render_template('achievements.html')

# Tutorials page route
@app.route('/tutorials')
def tutorials():
    return render_template('tutorials.html')

# Courses page route
@app.route('/courses')
def courses():
    return render_template('courses.html')

# Help Center page route
@app.route('/help')
def help_center():
    return render_template('help.html')

# Challenges page route
@app.route('/challenges')
def challenges():
    # Get challenges data from the helper function
    challenges_data = get_challenges_data()

    return render_template('challenges.html', challenges=challenges_data)

# Logout route
@app.route('/logout')
def logout():
    # Clear the session
    session.clear()
    return redirect(url_for('login'))

# Back button API route
@app.route('/api/back')
def go_back():
    # This route is used by JavaScript to get the previous URL
    # The actual back functionality is handled client-side with JavaScript
    referer = request.headers.get('Referer', url_for('home'))
    return jsonify({'previous_url': referer})

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error_code=404, error_message="Page Not Found"), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('error.html', error_code=500, error_message="Internal Server Error"), 500

# Matchmaking queue and active battles
matchmaking_queue = []
active_battles = {}
user_data = {}  # Store user data like username, rating, etc.

# Socket.IO event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

    # Remove from matchmaking queue if present
    for i, player in enumerate(matchmaking_queue):
        if player['sid'] == request.sid:
            matchmaking_queue.pop(i)
            break

    # Handle disconnection from active battle
    for battle_id, battle in list(active_battles.items()):
        if request.sid in [battle['player1']['sid'], battle['player2']['sid']]:
            # Notify the other player about disconnection
            other_sid = battle['player1']['sid'] if request.sid == battle['player2']['sid'] else battle['player2']['sid']
            emit('opponent_disconnected', {
                'message': 'Your opponent has disconnected'
            }, room=other_sid)

            # Remove the battle
            del active_battles[battle_id]
            break

@socketio.on('join_matchmaking')
def handle_join_matchmaking(data):
    """Add player to matchmaking queue"""
    # Get user data
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Add to matchmaking queue
    player_data = {
        'sid': request.sid,
        'username': username,
        'rating': rating,
        'joined_at': socketio.time()
    }
    matchmaking_queue.append(player_data)

    # Notify player they've joined the queue
    emit('matchmaking_status', {
        'status': 'searching',
        'message': 'Searching for opponent...',
        'queue_position': len(matchmaking_queue)
    })

    # Try to find a match
    find_match()

@socketio.on('cancel_matchmaking')
def handle_cancel_matchmaking():
    """Remove player from matchmaking queue"""
    for i, player in enumerate(matchmaking_queue):
        if player['sid'] == request.sid:
            matchmaking_queue.pop(i)
            emit('matchmaking_status', {
                'status': 'cancelled',
                'message': 'Matchmaking cancelled'
            })
            break

@socketio.on('battle_action')
def handle_battle_action(data):
    """Handle battle actions (code submission, test results, etc.)"""
    battle_id = data.get('battle_id')
    action_type = data.get('action_type')

    if battle_id not in active_battles:
        emit('error', {'message': 'Battle not found'})
        return

    battle = active_battles[battle_id]

    # Determine the other player
    other_sid = battle['player1']['sid'] if request.sid == battle['player2']['sid'] else battle['player2']['sid']

    # Handle different action types
    if action_type == 'code_submission':
        # Forward the code submission to the opponent
        emit('opponent_action', {
            'action_type': 'code_submission',
            'progress': data.get('progress', 0),
            'code': data.get('code', ''),
            'language': data.get('language', 'python'),
            'stats': data.get('stats', {})
        }, room=other_sid)

    elif action_type == 'code_update':
        # Forward code updates (typing) to the opponent
        emit('opponent_action', {
            'action_type': 'code_update',
            'code': data.get('code', ''),
            'language': data.get('language', 'python'),
            'stats': data.get('stats', {})
        }, room=other_sid)

    elif action_type == 'test_result':
        # Forward test results to the opponent
        emit('opponent_action', {
            'action_type': 'test_result',
            'test_id': data.get('test_id'),
            'status': data.get('status'),
            'details': data.get('details', {})
        }, room=other_sid)

    elif action_type == 'battle_complete':
        # Handle battle completion
        winner_sid = request.sid
        loser_sid = other_sid

        # Get player data
        winner_data = battle['player1'] if request.sid == battle['player1']['sid'] else battle['player2']
        loser_data = battle['player1'] if request.sid != battle['player1']['sid'] else battle['player2']

        # Calculate rating changes (ELO system)
        winner_old_rating = winner_data.get('rating', 1000)
        loser_old_rating = loser_data.get('rating', 1000)

        # Expected scores
        expected_winner = 1 / (1 + 10 ** ((loser_old_rating - winner_old_rating) / 400))
        expected_loser = 1 / (1 + 10 ** ((winner_old_rating - loser_old_rating) / 400))

        # K-factor (importance of match)
        k_factor = 32

        # New ratings
        winner_new_rating = round(winner_old_rating + k_factor * (1 - expected_winner))
        loser_new_rating = round(loser_old_rating + k_factor * (0 - expected_loser))

        # Rating changes
        winner_rating_change = winner_new_rating - winner_old_rating
        loser_rating_change = loser_new_rating - loser_old_rating

        # Update user data if available
        if winner_sid in user_data:
            user_data[winner_sid]['rating'] = winner_new_rating

        if loser_sid in user_data:
            user_data[loser_sid]['rating'] = loser_new_rating

        # Battle statistics
        battle_stats = data.get('stats', {})

        # Notify winner
        emit('battle_result', {
            'result': 'win',
            'message': 'You won the battle!',
            'old_rating': winner_old_rating,
            'new_rating': winner_new_rating,
            'rating_change': winner_rating_change,
            'stats': battle_stats
        })

        # Notify loser
        emit('battle_result', {
            'result': 'loss',
            'message': 'You lost the battle!',
            'old_rating': loser_old_rating,
            'new_rating': loser_new_rating,
            'rating_change': loser_rating_change,
            'stats': battle_stats
        }, room=other_sid)

        # Remove the battle
        del active_battles[battle_id]

@socketio.on('create_private_battle')
def handle_create_private_battle(data):
    """Create a private battle and return a join code"""
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Generate a unique battle ID
    import uuid
    battle_id = str(uuid.uuid4())[:8]

    # Create the battle
    active_battles[battle_id] = {
        'player1': {
            'sid': request.sid,
            'username': username,
            'rating': rating
        },
        'player2': None,
        'problem': select_random_problem(),
        'status': 'waiting',
        'created_at': socketio.time()
    }

    # Join the room
    join_room(battle_id)

    # Return the battle ID to the client
    emit('private_battle_created', {
        'battle_id': battle_id,
        'message': 'Private battle created. Share this code with your friend.'
    })

@socketio.on('join_private_battle')
def handle_join_private_battle(data):
    """Join a private battle using a battle ID"""
    battle_id = data.get('battle_id')
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)

    if battle_id not in active_battles:
        emit('error', {'message': 'Battle not found'})
        return

    battle = active_battles[battle_id]

    if battle['status'] != 'waiting':
        emit('error', {'message': 'Battle already in progress'})
        return

    if battle['player1']['sid'] == request.sid:
        emit('error', {'message': 'You cannot join your own battle'})
        return

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Update battle with player 2
    battle['player2'] = {
        'sid': request.sid,
        'username': username,
        'rating': rating
    }
    battle['status'] = 'in_progress'

    # Join the room
    join_room(battle_id)

    # Notify both players
    emit('battle_started', {
        'battle_id': battle_id,
        'opponent': {
            'username': battle['player1']['username'],
            'rating': battle['player1']['rating']
        },
        'problem': battle['problem']
    })

    emit('battle_started', {
        'battle_id': battle_id,
        'opponent': {
            'username': username,
            'rating': rating
        },
        'problem': battle['problem']
    }, room=battle['player1']['sid'])

def find_match():
    """Find a match for players in the queue"""
    if len(matchmaking_queue) < 2:
        return

    # Sort queue by join time (oldest first)
    matchmaking_queue.sort(key=lambda x: x['joined_at'])

    # Simple matching algorithm - match the first two players
    # In a real app, you'd use a more sophisticated algorithm based on rating
    player1 = matchmaking_queue.pop(0)
    player2 = matchmaking_queue.pop(0)

    # Create a battle
    import uuid
    battle_id = str(uuid.uuid4())[:8]

    active_battles[battle_id] = {
        'player1': player1,
        'player2': player2,
        'problem': select_random_problem(),
        'status': 'in_progress',
        'created_at': socketio.time()
    }

    # Add both players to the battle room
    join_room(battle_id, sid=player1['sid'])
    join_room(battle_id, sid=player2['sid'])

    # Notify both players
    emit('battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player2['username'],
            'rating': player2['rating']
        },
        'problem': active_battles[battle_id]['problem']
    }, room=player1['sid'])

    emit('battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player1['username'],
            'rating': player1['rating']
        },
        'problem': active_battles[battle_id]['problem']
    }, room=player2['sid'])

def select_random_problem():
    """Select a random problem for the battle"""
    challenges = get_challenges_data()
    import random
    return random.choice(challenges)

# Customs battle matchmaking queue and active battles
customs_matchmaking_queue = []
customs_active_battles = {}
customs_private_battles = {}

@socketio.on('customs_join_matchmaking')
def handle_customs_join_matchmaking(data):
    """Add player to customs matchmaking queue"""
    # Get user data
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)
    match_type = data.get('type', 'ranked')  # 'ranked' or 'unranked'

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Add to matchmaking queue
    player_data = {
        'sid': request.sid,
        'username': username,
        'rating': rating,
        'type': match_type,
        'joined_at': time.time()
    }
    customs_matchmaking_queue.append(player_data)

    # Notify player they've joined the queue
    emit('customs_matchmaking_status', {
        'status': 'searching',
        'message': 'Searching for opponent...',
        'queue_position': len(customs_matchmaking_queue),
        'match_type': match_type
    })

    # Try to find a match
    find_customs_match()

@socketio.on('customs_cancel_matchmaking')
def handle_customs_cancel_matchmaking():
    """Remove player from customs matchmaking queue"""
    for i, player in enumerate(customs_matchmaking_queue):
        if player['sid'] == request.sid:
            customs_matchmaking_queue.pop(i)
            emit('customs_matchmaking_status', {
                'status': 'cancelled',
                'message': 'Matchmaking cancelled'
            })
            break

@socketio.on('customs_create_private_battle')
def handle_customs_create_private_battle(data):
    """Create a private customs battle and return a join code"""
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Generate a unique battle code (easier to share than UUID)
    import random
    import string
    battle_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    # Generate a unique battle ID
    import uuid
    battle_id = str(uuid.uuid4())

    # Create the battle
    customs_private_battles[battle_code] = {
        'battle_id': battle_id,
        'player1': {
            'sid': request.sid,
            'username': username,
            'rating': rating
        },
        'player2': None,
        'problem': select_random_problem(),
        'status': 'waiting',
        'created_at': time.time()
    }

    # Join the room
    join_room(battle_id)

    # Return the battle code to the client
    emit('customs_private_battle_created', {
        'battle_id': battle_id,
        'battle_code': battle_code,
        'message': 'Private battle created. Share this code with your friend.'
    })

@socketio.on('customs_join_private_battle')
def handle_customs_join_private_battle(data):
    """Join a private customs battle using a battle code"""
    battle_code = data.get('battle_code')
    username = data.get('username', f'User_{request.sid[:6]}')
    rating = data.get('rating', 1000)

    if battle_code not in customs_private_battles:
        emit('customs_error', {'message': 'Battle not found'})
        return

    battle = customs_private_battles[battle_code]
    battle_id = battle['battle_id']

    if battle['status'] != 'waiting':
        emit('customs_error', {'message': 'Battle already in progress'})
        return

    if battle['player1']['sid'] == request.sid:
        emit('customs_error', {'message': 'You cannot join your own battle'})
        return

    # Store user data
    user_data[request.sid] = {
        'username': username,
        'rating': rating
    }

    # Update battle with player 2
    battle['player2'] = {
        'sid': request.sid,
        'username': username,
        'rating': rating
    }
    battle['status'] = 'in_progress'

    # Add battle to active battles
    customs_active_battles[battle_id] = battle

    # Join the room
    join_room(battle_id)

    # Notify both players
    emit('customs_private_battle_joined', {
        'battle_id': battle_id,
        'opponent': {
            'username': battle['player1']['username'],
            'rating': battle['player1']['rating']
        },
        'problem': battle['problem']
    })

    emit('customs_private_battle_joined', {
        'battle_id': battle_id,
        'opponent': {
            'username': username,
            'rating': rating
        },
        'problem': battle['problem']
    }, room=battle['player1']['sid'])

    # Remove from private battles dict (now it's in active battles)
    del customs_private_battles[battle_code]

@socketio.on('customs_battle_action')
def handle_customs_battle_action(data):
    """Handle customs battle actions (code submission, test results, etc.)"""
    battle_id = data.get('battle_id')
    action_type = data.get('action_type')

    if battle_id not in customs_active_battles:
        emit('customs_error', {'message': 'Battle not found'})
        return

    battle = customs_active_battles[battle_id]

    # Determine the other player
    other_sid = battle['player1']['sid'] if request.sid == battle['player2']['sid'] else battle['player2']['sid']

    # Handle different action types
    if action_type == 'code_submission':
        # Forward the code submission to the opponent
        emit('customs_opponent_action', {
            'action_type': 'code_submission',
            'progress': data.get('progress', 0),
            'code': data.get('code', ''),
            'language': data.get('language', 'python'),
            'stats': data.get('stats', {})
        }, room=other_sid)

    elif action_type == 'code_update':
        # Forward code updates (typing) to the opponent
        emit('customs_opponent_action', {
            'action_type': 'code_update',
            'code': data.get('code', ''),
            'language': data.get('language', 'python'),
            'stats': data.get('stats', {})
        }, room=other_sid)

    elif action_type == 'test_result':
        # Forward test results to the opponent
        emit('customs_opponent_action', {
            'action_type': 'test_result',
            'test_id': data.get('test_id'),
            'status': data.get('status'),
            'details': data.get('details', {})
        }, room=other_sid)

    elif action_type == 'battle_complete':
        # Handle battle completion
        winner_sid = request.sid
        loser_sid = other_sid

        # Get player data
        winner_data = battle['player1'] if request.sid == battle['player1']['sid'] else battle['player2']
        loser_data = battle['player1'] if request.sid != battle['player1']['sid'] else battle['player2']

        # Calculate rating changes (ELO system)
        winner_old_rating = winner_data.get('rating', 1000)
        loser_old_rating = loser_data.get('rating', 1000)

        # Expected scores
        expected_winner = 1 / (1 + 10 ** ((loser_old_rating - winner_old_rating) / 400))
        expected_loser = 1 / (1 + 10 ** ((winner_old_rating - loser_old_rating) / 400))

        # K-factor (importance of match)
        k_factor = 32

        # New ratings
        winner_new_rating = round(winner_old_rating + k_factor * (1 - expected_winner))
        loser_new_rating = round(loser_old_rating + k_factor * (0 - expected_loser))

        # Rating changes
        winner_rating_change = winner_new_rating - winner_old_rating
        loser_rating_change = loser_new_rating - loser_old_rating

        # Update user data if available
        if winner_sid in user_data:
            user_data[winner_sid]['rating'] = winner_new_rating

        if loser_sid in user_data:
            user_data[loser_sid]['rating'] = loser_new_rating

        # Battle statistics
        battle_stats = data.get('stats', {})

        # Notify winner
        emit('customs_battle_result', {
            'result': 'win',
            'message': 'You won the battle!',
            'old_rating': winner_old_rating,
            'new_rating': winner_new_rating,
            'rating_change': winner_rating_change,
            'stats': battle_stats
        })

        # Notify loser
        emit('customs_battle_result', {
            'result': 'loss',
            'message': 'You lost the battle!',
            'old_rating': loser_old_rating,
            'new_rating': loser_new_rating,
            'rating_change': loser_rating_change,
            'stats': battle_stats
        }, room=other_sid)

        # Remove the battle
        del customs_active_battles[battle_id]

def find_customs_match():
    """Find a match for players in the customs queue"""
    if len(customs_matchmaking_queue) < 2:
        return

    # Group players by match type
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
            create_customs_battle(player1, player2, 'ranked')

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
        create_customs_battle(player1, player2, 'unranked')

def create_customs_battle(player1, player2, battle_type):
    """Create a customs battle between two players"""
    import uuid
    battle_id = str(uuid.uuid4())

    customs_active_battles[battle_id] = {
        'battle_id': battle_id,
        'player1': player1,
        'player2': player2,
        'problem': select_random_problem(),
        'status': 'in_progress',
        'type': battle_type,
        'created_at': time.time()
    }

    # Add both players to the battle room
    join_room(battle_id, sid=player1['sid'])
    join_room(battle_id, sid=player2['sid'])

    # Notify both players
    emit('customs_battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player2['username'],
            'rating': player2['rating']
        },
        'problem': customs_active_battles[battle_id]['problem'],
        'battle_type': battle_type
    }, room=player1['sid'])

    emit('customs_battle_found', {
        'battle_id': battle_id,
        'opponent': {
            'username': player1['username'],
            'rating': player1['rating']
        },
        'problem': customs_active_battles[battle_id]['problem'],
        'battle_type': battle_type
    }, room=player2['sid'])

# Function to select a random problem for battles
def select_random_problem():
    """
    Select a random problem from the challenges data.
    In a real app, this would select an appropriate problem based on user ratings.
    """
    import random
    challenges = get_challenges_data()
    return random.choice(challenges)

# Import customs battle socket handlers
from customs_battle_socket import register_customs_handlers

# Register customs battle socket handlers
register_customs_handlers(socketio)

if __name__ == '__main__':
    socketio.run(app, debug=True)
