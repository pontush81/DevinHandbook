#!/usr/bin/env python3
"""
Script för att generera förbättrade PWA-ikoner för Handbok-appen med bokdesign
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_improved_icon(size, filename):
    """Skapa en förbättrad ikon med bokdesign"""
    # Skapa en gradient bakgrund (simulerar gradient med färgövergång)
    img = Image.new('RGB', (size, size), color='#2563eb')
    draw = ImageDraw.Draw(img)
    
    # Avrundade hörn effekt genom att maskera
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    corner_radius = size // 4  # 25% av storleken för avrundade hörn
    mask_draw.rounded_rectangle([0, 0, size, size], corner_radius, fill=255)
    
    # Tillämpa gradient bakgrund (blå till mörkare blå)
    for y in range(size):
        # Skapa en gradient från ljusare till mörkare blå
        ratio = y / size
        r = int(37 + (29 - 37) * ratio)  # 37 = 0x25, 29 = 0x1d
        g = int(99 + (78 - 99) * ratio)  # 99 = 0x63, 78 = 0x4e
        b = int(235 + (216 - 235) * ratio)  # 235 = 0xeb, 216 = 0xd8
        
        for x in range(size):
            img.putpixel((x, y), (r, g, b))
    
    # Beräkna proportioner baserat på ikonstorlek
    book_width = int(size * 0.5)
    book_height = int(size * 0.625)  # 5:8 förhållande
    book_x = (size - book_width) // 2
    book_y = (size - book_height) // 2
    
    # Rita bokens skugga först
    shadow_offset = max(1, size // 64)
    shadow_x = book_x + shadow_offset
    shadow_y = book_y + shadow_offset
    draw.rounded_rectangle(
        [shadow_x, shadow_y, shadow_x + book_width, shadow_y + book_height],
        radius=size // 32,
        fill=(0, 0, 0, 30)  # Svart med låg opacitet för skugga
    )
    
    # Rita bokens huvudform (vit bakgrund)
    draw.rounded_rectangle(
        [book_x, book_y, book_x + book_width, book_y + book_height],
        radius=size // 32,
        fill='#ffffff',
        outline='#e2e8f0',
        width=max(1, size // 128)
    )
    
    # Rita bokryggen (vänster kant)
    spine_width = max(2, book_width // 10)
    draw.rounded_rectangle(
        [book_x, book_y, book_x + spine_width, book_y + book_height],
        radius=size // 32,
        fill='#cbd5e1'
    )
    
    # Rita textlinjer på boken
    line_start_x = book_x + spine_width + size // 32
    line_width = book_width - spine_width - (size // 16)
    
    # Titel (första linjen, tjockare)
    title_y = book_y + size // 16
    title_height = max(2, size // 64)
    draw.rounded_rectangle(
        [line_start_x, title_y, line_start_x + int(line_width * 0.8), title_y + title_height * 2],
        radius=size // 128,
        fill='#64748b'
    )
    
    # Mindre textlinjer
    line_height = max(1, size // 96)
    line_spacing = size // 48
    current_y = title_y + title_height * 3 + line_spacing
    
    line_widths = [0.6, 0.7, 0.5, 0.8, 0.65]  # Varierade linjelängder
    for i, width_ratio in enumerate(line_widths):
        if current_y + line_height > book_y + book_height - size // 16:
            break
        draw.rounded_rectangle(
            [line_start_x, current_y, line_start_x + int(line_width * width_ratio), current_y + line_height],
            radius=size // 256,
            fill='#94a3b8'
        )
        current_y += line_height + line_spacing
    
    # Rita en stor 'H' i nedre högra hörnet av boken
    try:
        h_size = max(12, size // 12)
        font = ImageFont.load_default()
        
        # Försök ladda en bättre font om tillgänglig
        for font_path in [
            '/System/Library/Fonts/Arial Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            '/Windows/Fonts/arialbd.ttf'
        ]:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, h_size)
                    break
                except:
                    continue
    except:
        pass
    
    # Placera 'H' i nedre högra delen av boken
    h_text = 'H'
    bbox = draw.textbbox((0, 0), h_text, font=font)
    h_width = bbox[2] - bbox[0]
    h_height = bbox[3] - bbox[1]
    
    h_x = book_x + book_width - h_width - size // 32
    h_y = book_y + book_height - h_height - size // 24
    
    draw.text((h_x, h_y), h_text, fill='#2563eb', font=font)
    
    # Tillämpa den avrundade masken
    img.putalpha(mask)
    
    # Skapa final bild med transparent bakgrund för vissa storlekar
    final_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    final_img.paste(img, (0, 0), img)
    
    # Spara ikonen
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '..', 'public', filename)
    
    # Spara som PNG med eller utan transparens beroende på syfte
    if 'apple-touch' in filename or size <= 32:
        # Apple touch icon och små ikoner behöver inte transparens
        rgb_img = Image.new('RGB', (size, size), '#2563eb')
        rgb_img.paste(final_img, (0, 0), final_img)
        rgb_img.save(output_path, 'PNG')
    else:
        final_img.save(output_path, 'PNG')
    
    print(f'✓ Skapade förbättrad {filename} ({size}x{size})')

def main():
    """Huvudfunktion"""
    # Kontrollera att vi är i rätt mapp
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'public')
    
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        print(f'Skapade katalog: {public_dir}')
    
    print('Genererar förbättrade PWA-ikoner med bokdesign...')
    
    # Skapa alla nödvändiga ikonstorlekar
    icon_sizes = [
        (16, 'icon-16x16.png'),
        (32, 'icon-32x32.png'),
        (192, 'icon-192x192.png'),
        (512, 'icon-512x512.png'),
        (180, 'apple-touch-icon.png')
    ]
    
    for size, filename in icon_sizes:
        create_improved_icon(size, filename)
    
    print('\n✅ Alla förbättrade PWA-ikoner har skapats framgångsrikt!')
    print('Ikonerna har nu en modern bokdesign och ser mycket proffsigare ut.')
    print('Ikonerna finns i public/ mappen och är redo att användas.')

if __name__ == '__main__':
    main() 