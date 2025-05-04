import os
import shutil
import sys

def setup_flask_app():
    """
    Set up the Flask application by moving HTML files to templates directory
    and JavaScript/CSS files to static directory.
    """
    # Define source and destination directories
    frontend_dir = os.path.join(os.getcwd(), 'Frontend')
    templates_dir = os.path.join(os.getcwd(), 'templates')
    static_js_dir = os.path.join(os.getcwd(), 'static', 'js')
    
    # Check if Frontend directory exists
    if not os.path.exists(frontend_dir):
        print(f"Error: Frontend directory not found at {frontend_dir}")
        return False
    
    # Ensure destination directories exist
    os.makedirs(templates_dir, exist_ok=True)
    os.makedirs(static_js_dir, exist_ok=True)
    
    # Copy HTML files to templates directory
    html_files_copied = 0
    js_files_copied = 0
    
    for filename in os.listdir(frontend_dir):
        source_path = os.path.join(frontend_dir, filename)
        
        # Skip directories
        if os.path.isdir(source_path):
            continue
        
        # Copy HTML files to templates
        if filename.endswith('.html'):
            dest_path = os.path.join(templates_dir, filename)
            shutil.copy2(source_path, dest_path)
            print(f"Copied {filename} to templates directory")
            html_files_copied += 1
        
        # Copy JS files to static/js
        elif filename.endswith('.js'):
            dest_path = os.path.join(static_js_dir, filename)
            shutil.copy2(source_path, dest_path)
            print(f"Copied {filename} to static/js directory")
            js_files_copied += 1
    
    print(f"\nSetup complete: {html_files_copied} HTML files and {js_files_copied} JS files copied.")
    print("You can now run the Flask app with: python app.py")
    return True

if __name__ == "__main__":
    setup_flask_app()
