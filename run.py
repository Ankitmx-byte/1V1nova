"""
Run script for the 1V1nova Flask application.
This script checks if the required dependencies are installed and runs the Flask app.
"""

import subprocess
import sys
import os

def check_dependencies():
    """Check if required dependencies are installed."""
    try:
        import flask
        print("Flask is installed.")
        return True
    except ImportError:
        print("Flask is not installed. Installing required dependencies...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("Dependencies installed successfully.")
            return True
        except subprocess.CalledProcessError:
            print("Failed to install dependencies. Please run 'pip install -r requirements.txt' manually.")
            return False

def run_flask_app():
    """Run the Flask application."""
    if not check_dependencies():
        return
    
    # Check if templates directory exists and has files
    templates_dir = os.path.join(os.getcwd(), 'templates')
    if not os.path.exists(templates_dir) or not os.listdir(templates_dir):
        print("Templates directory is empty or doesn't exist.")
        print("Running setup script to copy HTML files...")
        try:
            import setup
            setup.setup_flask_app()
        except Exception as e:
            print(f"Error running setup script: {e}")
            print("Please run 'python setup.py' manually before starting the Flask app.")
            return
    
    print("Starting Flask application...")
    try:
        from app import app
        app.run(debug=True)
    except Exception as e:
        print(f"Error starting Flask application: {e}")

if __name__ == "__main__":
    run_flask_app()
