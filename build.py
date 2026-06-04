import os
import shutil
import subprocess
import sys

print("ValorantRPC build")
print("=" * 40)

for d in ("build", "dist"):
    if os.path.exists(d):
        shutil.rmtree(d)

ENTRY = "run.py"
with open(ENTRY, "w", encoding="utf-8") as f:
    f.write("from vrpc.app import run\n\nif __name__ == '__main__':\n    run()\n")

command = [
    sys.executable, "-m", "PyInstaller",
    "--name=ValorantRPC",
    "--onefile",
    "--windowed",
    "--collect-all=customtkinter",
    "--hidden-import=PIL._tkinter_finder",
    "--noconfirm",
    ENTRY,
]

print("\nderleniyor...")
try:
    subprocess.run(command, check=True)
    print("\nTamam: dist/ValorantRPC.exe")
except subprocess.CalledProcessError as e:
    print(f"\nDerleme hatasi: {e}")
    sys.exit(1)
finally:
    for p in (ENTRY, "build", "ValorantRPC.spec"):
        if os.path.exists(p):
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
