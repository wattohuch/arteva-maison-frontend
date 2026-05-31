import os
import random
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_product_image():
    # 1. Image dimensions
    width, height = 1080, 1080

    # 2. Exact background color from Brown Image.png
    bg_color = (59, 49, 29) # Average RGB of Brown Image.png
    # Text: Soft cream
    text_color = (222, 213, 194)

    # 3. Create base image
    img = Image.new('RGB', (width, height), color=bg_color)

    # 4. Add subtle noise texture to mimic the paper
    pixels = img.load()
    for x in range(width):
        for y in range(height):
            noise = random.randint(-4, 4)
            r = max(0, min(255, bg_color[0] + noise))
            g = max(0, min(255, bg_color[1] + noise))
            b = max(0, min(255, bg_color[2] + noise))
            pixels[x, y] = (r, g, b)

    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    # 5. Draw text
    draw = ImageDraw.Draw(img)
    
    font_path = "C:\\Windows\\Fonts\\georgia.ttf"
    if not os.path.exists(font_path):
        font_path = "C:\\Windows\\Fonts\\times.ttf"

    try:
        font = ImageFont.truetype(font_path, 120)
    except:
        font = ImageFont.load_default()

    text = "I N F O"
    
    # Get text dimensions using getbbox
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Calculate center position
    x = (width - text_width) / 2
    y = (height - text_height) / 2 - 20

    # Draw text
    draw.text((x, y), text, font=font, fill=text_color)

    # 6. Save the image
    output_path = "assets/images/INFO_exact_bg.png"
    img.save(output_path)
    print(f"Success! Image saved to: {os.path.abspath(output_path)}")

if __name__ == '__main__':
    create_product_image()
