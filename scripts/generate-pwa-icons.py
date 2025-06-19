#!/usr/bin/env python3
"""
Script för att generera PWA-ikoner för Handbok-appen
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Skapa en ikon med angiven storlek"""
    # Skapa en blå bakgrund med vit 'H' för Handbok
    img = Image.new('RGB', (size, size), color='#2563eb')
    draw = ImageDraw.Draw(img)
    
    # Försök att hitta ett font
    try:
        font_size = int(size * 0.6)  # 60% av ikonstorleken
        # Prova olika fonts
        for font_path in [
            '/System/Library/Fonts/Arial.ttf',
            '/usr/share/fonts/truetype/arial.ttf',
            '/Windows/Fonts/arial.ttf'
        ]:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Rita ett 'H' i mitten
    text = 'H'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]  # Justera för baseline
    
    draw.text((x, y), text, fill='white', font=font)
    
    # Lägg till en subtil border
    border_width = max(1, size // 32)
    draw.rectangle(
        [border_width, border_width, size - border_width, size - border_width],
        outline='#1e40af',
        width=border_width
    )
    
    # Spara ikonen
    output_path = f'../public/{filename}'
    img.save(output_path)
    print(f'✓ Skapade {filename} ({size}x{size})')

def main():
    """Huvudfunktion"""
    # Kontrollera att vi är i rätt mapp
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'public')
    
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        print(f'Skapade katalog: {public_dir}')
    
    print('Genererar PWA-ikoner...')
    
    # Skapa alla nödvändiga ikonstorlekar
    icon_sizes = [
        (16, 'icon-16x16.png'),
        (32, 'icon-32x32.png'),
        (192, 'icon-192x192.png'),
        (512, 'icon-512x512.png'),
        (180, 'apple-touch-icon.png')
    ]
    
    for size, filename in icon_sizes:
        create_icon(size, filename)
    
    print('\n✅ Alla PWA-ikoner har skapats framgångsrikt!')
    print('Ikonerna finns nu i public/ mappen och är redo att användas.')

if __name__ == '__main__':
    main() 