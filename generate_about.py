import os
import urllib.request
import random
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_about_image():
    # 1. Use an elegant serif font from the system (Georgia or Times New Roman)
    font_path = "C:\\Windows\\Fonts\\georgia.ttf"
    if not os.path.exists(font_path):
        font_path = "C:\\Windows\\Fonts\\times.ttf"

    # 2. Image dimensions
    width, height = 1080, 1080

    # 3. Exact colors from the original image
    # Background: Dark olive green
    bg_color = (49, 49, 35) # Hex #313123
    # Text: Soft cream
    text_color = (222, 213, 194) # Hex #DED5C2

    # 4. Create base image
    img = Image.new('RGB', (width, height), color=bg_color)

    # 5. Add subtle noise texture to mimic the paper
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

    # 6. Draw text
    draw = ImageDraw.Draw(img)
    
    # Try loading the font
    try:
        font = ImageFont.truetype(font_path, 120)
    except:
        font = ImageFont.load_default()

    text = "A B O U T"
    
    # Get text dimensions using getbbox (newer Pillow)
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Calculate center position
    x = (width - text_width) / 2
    y = (height - text_height) / 2 - 20 # adjust slightly up

    # Draw text
    draw.text((x, y), text, font=font, fill=text_color)

    # 7. Save the image
    output_path = "ABOUT_exact_color.png"
    img.save(output_path)
    print(f"Success! Image saved to: {os.path.abspath(output_path)}")

if __name__ == '__main__':
    create_about_image()
