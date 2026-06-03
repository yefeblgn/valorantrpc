"""ValorantRPC 2.0 — tek dosya .exe üretimi (PyInstaller)."""

import os
import shutil
import subprocess
import sys

print("ValorantRPC build")
print("=" * 40)

for d in ("build", "dist"):
    if os.path.exists(d):
        print(f"temizleniyor: {d}/")
        shutil.rmtree(d)

# Entry: küçük bir başlatıcı (python -m vrpc eşdeğeri).
ENTRY = "run.py"
with open(ENTRY, "w", encoding="utf-8") as f:
    f.write("from vrpc.app import run\n\nif __name__ == '__main__':\n    run()\n")

command = [
    sys.executable, "-m", "PyInstaller",
    "--name=ValorantRPC",
    "--onefile",
    "--windowed",
    "--icon=assets/game_icon_white.ico",
    "--add-data=assets;assets",
    "--collect-all=customtkinter",
    "--hidden-import=PIL._tkinter_finder",
    "--noconfirm",
    ENTRY,
]

print("\nderleniyor…")
try:
    subprocess.run(command, check=True)
    print("\n✅ Tamam: dist/ValorantRPC.exe")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Derleme hatası: {e}")
    sys.exit(1)
finally:
    if os.path.exists(ENTRY):
        os.remove(ENTRY)
    if os.path.exists("build"):
        shutil.rmtree("build")
    if os.path.exists("ValorantRPC.spec"):
        os.remove("ValorantRPC.spec")
