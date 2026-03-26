import subprocess
import os
import sys
import platform

def run():
    print("--- Splitty Backend Startup ---")
    
    # OS detection for venv path
    is_windows = platform.system() == "Windows"
    python_exe = os.path.join(".venv", "Scripts", "python.exe") if is_windows else os.path.join(".venv", "bin", "python")
    
    if not os.path.exists(python_exe):
        print(f"Error: Virtual environment not found at {python_exe}")
        print("Please create it first: python -m venv .venv")
        sys.exit(1)

    # 1. Run migrations
    print("\n[1/2] Checking database migrations...")
    try:
        # Use python -m flask to ensure we use the venv's flask
        subprocess.run([python_exe, "-m", "flask", "db", "upgrade"], check=True)
        print("Done.")
    except subprocess.CalledProcessError as e:
        print(f"Warning: Migrations failed or not initialized: {e}")
        print("Continuing anyway...")

    # 2. Start server
    port = os.environ.get("PORT", "3001")
    print(f"\n[2/2] Starting Splitty Backend on port {port}...")
    print(f"URL: http://127.0.0.1:{port}")
    
    try:
        # Run flask run from the root, pointing to src/app.py
        env = os.environ.copy()
        env["FLASK_APP"] = "src/app.py"
        env["FLASK_DEBUG"] = "1"
        
        subprocess.run([python_exe, "-m", "flask", "run", "--host=0.0.0.0", "--port", port], env=env)
    except KeyboardInterrupt:
        print("\nStopping server...")

if __name__ == "__main__":
    run()
