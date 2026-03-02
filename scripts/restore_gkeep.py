import os
import subprocess
import sys

def run(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    return result.stdout

# 1. Create venv
venv_path = "/home/joel/.openclaw/workspace/venv"
if not os.path.exists(os.path.join(venv_path, "bin")):
    run(f"python3 -m venv {venv_path}")

# 2. Install dependencies
pip_path = os.path.join(venv_path, "bin", "pip")
run(f"{pip_path} install gkeepapi gpsoauth")

# 3. Test Auth
python_path = os.path.join(venv_path, "bin", "python")
test_script = f"""
import gkeepapi, os
try:
    token_path = os.path.expanduser('~/.config/gkeep/token')
    if not os.path.exists(token_path):
        print('Token file missing')
        exit(1)
    with open(token_path, 'r') as f:
        master_token = f.read().strip()
    keep = gkeepapi.Keep()
    keep.authenticate('moltpuppet@gmail.com', master_token)
    print('AUTH_SUCCESS')
except Exception as e:
    print(f'AUTH_FAILED: {{str(e)}}')
"""
with open("test_keep.py", "w") as f:
    f.write(test_script)

print(run(f"{python_path} test_keep.py"))
