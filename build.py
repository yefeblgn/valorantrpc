"""
Build script for Valorant RPC
Creates standalone .exe file
"""

import os
import shutil
import subprocess
import sys

print("🔨 Valorant RPC Build Script")
print("=" * 50)

# Temizlik
if os.path.exists("build"):
    print("🧹 Cleaning build directory...")
    shutil.rmtree("build")

if os.path.exists("dist"):
    print("🧹 Cleaning dist directory...")
    shutil.rmtree("dist")

# PyInstaller komutu
print("\n📦 Building executable...")

command = [
    sys.executable,
    "-m",
    "PyInstaller",
    "--name=ValorantRPC",
    "--onefile",
    "--windowed",
    "--icon=assets/game_icon_white.ico",
    "--add-data=assets;assets",
    "--hidden-import=PIL._tkinter_finder",
    "--collect-all=customtkinter",
    "--collect-all=PIL",
    "--noconfirm",
    "gui_v2.py"
]

try:
    subprocess.run(command, check=True)
    print("\n✅ Build successful!")
    print(f"📁 Output: dist/ValorantRPC.exe")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Build failed: {e}")
    sys.exit(1)

# Temizlik
print("\n🧹 Cleaning up...")
if os.path.exists("build"):
    shutil.rmtree("build")

if os.path.exists("ValorantRPC.spec"):
    os.remove("ValorantRPC.spec")

print("\n✨ Done! Check dist/ValorantRPC.exe")
