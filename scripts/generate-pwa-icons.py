from pathlib import Path
from PIL import Image, ImageDraw

output_dir = Path("/home/ubuntu/webclient-hunter-source/frontend/assets")
output_dir.mkdir(parents=True, exist_ok=True)

for size in (180, 192, 512):
    image = Image.new("RGBA", (size, size), "#312e81")
    draw = ImageDraw.Draw(image)
    s = size / 512
    # A high-contrast target and forward arrow, matching the product's discovery theme.
    for radius, color in ((184, "#818cf8"), (132, "#4f46e5"), (78, "#f8fafc"), (28, "#f59e0b")):
        r = radius * s
        c = size / 2
        draw.ellipse((c-r, c-r, c+r, c+r), fill=color)
    draw.polygon([(300*s, 200*s), (406*s, 256*s), (300*s, 312*s)], fill="#f59e0b")
    draw.rectangle((244*s, 235*s, 328*s, 277*s), fill="#f59e0b")
    filename = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
    image.save(output_dir / filename, "PNG", optimize=True)
