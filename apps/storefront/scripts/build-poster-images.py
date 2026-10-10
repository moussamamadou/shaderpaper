#!/usr/bin/env python3
"""Product thumbnails for the 54 posters.

Cuts plate 1 and plate 2 out of each poster's gallery strip (four 640 x 800
plates side by side in a 2560 x 800 JPEG, rendered from explorations/index.html
at the three colour strengths) and writes them as public/posters/<id>.webp and
public/posters/<id>-2.webp at 600 x 750, WebP quality 80. The strength used is
the gallery pick for that poster (picks.json: n, b or v), balanced by default.
Plate 1 is variation 1 with every knob left to the seed, which is what the
product page renders before the buyer touches anything.

Run with an isolated interpreter (Pillow required):
    python3 -I scripts/build-poster-images.py [GALLERY_DIR]
GALLERY_DIR holds data.json, picks.json and strip/<id>_<lvl>.jpg; it defaults
to $SP_GALLERY.
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image

PLATE_W, PLATE_H = 640, 800
OUT_W, OUT_H = 600, 750
QUALITY = 80

here = Path(__file__).resolve().parent
out_dir = here.parent / 'public' / 'posters'


def main() -> int:
    gallery = Path(sys.argv[1] if len(sys.argv) > 1 else os.environ.get('SP_GALLERY', ''))
    if not gallery.is_dir():
        print('usage: build-poster-images.py GALLERY_DIR (or set SP_GALLERY)', file=sys.stderr)
        return 2
    data = json.loads((gallery / 'data.json').read_text(encoding='utf-8'))
    picks_file = gallery / 'picks.json'
    picks = json.loads(picks_file.read_text(encoding='utf-8')) if picks_file.exists() else {}
    out_dir.mkdir(parents=True, exist_ok=True)

    written, missing = 0, []
    levels = {}
    for poster in data:
        pid = poster['id']
        lvl = picks.get(pid, 'b')
        if lvl not in ('n', 'b', 'v'):
            lvl = 'b'
        strip = gallery / 'strip' / f'{pid}_{lvl}.jpg'
        if not strip.exists():
            missing.append(str(strip))
            continue
        with Image.open(strip) as im:
            im = im.convert('RGB')
            if im.size != (4 * PLATE_W, PLATE_H):
                print(f'{strip}: expected {4 * PLATE_W}x{PLATE_H}, got {im.size[0]}x{im.size[1]}', file=sys.stderr)
                return 1
            for plate, suffix in ((0, ''), (1, '-2')):
                box = (plate * PLATE_W, 0, (plate + 1) * PLATE_W, PLATE_H)
                im.crop(box).resize((OUT_W, OUT_H), Image.LANCZOS).save(
                    out_dir / f'{pid}{suffix}.webp', 'WEBP', quality=QUALITY, method=6
                )
                written += 1
        levels[pid] = lvl

    # The strength each thumbnail was cut at, so the product page starts the
    # live preview from the same colour strength as the image the buyer clicked.
    (out_dir / 'levels.json').write_text(json.dumps(levels, indent=1, sort_keys=True) + '\n', encoding='utf-8')
    print(f'wrote {written} images for {len(levels)} posters to {out_dir}')
    if missing:
        print('missing strips:\n  ' + '\n  '.join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
