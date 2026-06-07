import os
import shutil
import subprocess
import sys
from PIL import Image, ImageDraw

print("ValorantRPC build")
print("=" * 40)

for d in ("build", "dist"):
    if os.path.exists(d):
        shutil.rmtree(d)

# Generate custom red-and-white icon for the Windows executable
ICO_PATH = "icon.ico"
try:
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(img)
    # Red circle background
    d_draw.ellipse([4, 4, size - 5, size - 5], fill=(255, 70, 85, 255))
    s = size
    # White V symbol
    pts = [
        (s * 0.20, s * 0.27), (s * 0.33, s * 0.27),
        (s * 0.50, s * 0.57), (s * 0.67, s * 0.27),
        (s * 0.80, s * 0.27), (s * 0.50, s * 0.75),
    ]
    d_draw.polygon([(int(x), int(y)) for x, y in pts], fill=(255, 255, 255, 235))
    # Save as ICO with multiple sizes for clean rendering on Windows
    img.save(ICO_PATH, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("Olusuturulan ikon: icon.ico")
except Exception as e:
    print(f"Ikon olusturma hatasi (varsayilan ikon kullanilacak): {e}")

ENTRY = "run.py"
with open(ENTRY, "w", encoding="utf-8") as f:
    f.write("from vrpc.app import run\n\nif __name__ == '__main__':\n    run()\n")

command = [
    sys.executable, "-m", "PyInstaller",
    "--name=ValorantRPC",
    "--onefile",
    "--windowed",
    f"--icon={ICO_PATH}" if os.path.exists(ICO_PATH) else None,
    "--collect-all=customtkinter",
    "--hidden-import=PIL._tkinter_finder",
    "--noconfirm",
    ENTRY,
]
# Remove None values
command = [c for c in command if c is not None]

print("\nderleniyor...")
try:
    subprocess.run(command, check=True)
    print("\nTamam: dist/ValorantRPC.exe")
except subprocess.CalledProcessError as e:
    print(f"\nDerleme hatasi: {e}")
    sys.exit(1)
finally:
    for p in (ENTRY, "build", "ValorantRPC.spec", ICO_PATH):
        if os.path.exists(p):
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
