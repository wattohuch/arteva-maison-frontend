import os
import random
try:
    from PIL import Image, ImageFilter
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageFilter

def create_blank_background():
    # 1. Image dimensions
    width, height = 1080, 1080

    # 2. Exact background color: Dark olive green / brown
    bg_color = (49, 49, 35) # Hex #313123

    # 3. Create base image
    img = Image.new('RGB', (width, height), color=bg_color)

    # 4. Add subtle noise texture to mimic the paper
    pixels = img.load()
    for x in range(width):
        for y in range(height):
            # subtle noise
            noise = random.randint(-4, 4)
            r = max(0, min(255, bg_color[0] + noise))
            g = max(0, min(255, bg_color[1] + noise))
            b = max(0, min(255, bg_color[2] + noise))
            pixels[x, y] = (r, g, b)

    # Blur slightly to soften the texture
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    # 5. Save the image (No text added)
    output_path = "blank_background_exact_color.png"
    img.save(output_path)
    print(f"Success! Image saved to: {os.path.abspath(output_path)}")

if __name__ == '__main__':
    create_blank_background()
