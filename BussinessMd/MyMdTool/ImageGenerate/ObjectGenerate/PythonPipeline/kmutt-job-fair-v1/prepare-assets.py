from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parent
PIPELINE = ROOT.parent
EDITOR = Path(r'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/POC-Phaser/Editor')
OUT = EDITOR / 'public/maps/kmutt'
palette = json.loads((PIPELINE/'sample-source/inventory.json').read_text(encoding='utf8'))['palette']
pal = Image.new('P', (1, 1))
flat = [v for color in palette for v in bytes.fromhex(color)]
pal.putpalette(flat + list(bytes.fromhex(palette[-1])) * ((768-len(flat))//3))
inventory = []
images = {}

def save(key, image, group, source, crop=None):
    dest = OUT / group / (key + '.png')
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest)
    delivery = ROOT/'native'/group/dest.name
    delivery.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(dest, delivery)
    visible = [pixel[:3] for pixel in image.get_flattened_data() if pixel[3]]
    colors = sorted(set(visible))
    assert set(image.getchannel('A').get_flattened_data()) <= {0, 255}, key
    assert set(colors) <= {tuple(bytes.fromhex(c)) for c in palette}, key
    inventory.append(dict(id=key, image=f'{group}/{dest.name}', width=image.width, height=image.height,
                          anchor=[image.width//2, image.height-1], source=str(source), source_crop=crop,
                          palette_count=len(colors), binary_alpha=True, sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    images[key] = image

for key, width in [('kmutt-stage-platform',384), ('kmutt-stage-screen',256), ('kmutt-podium',32), ('kmutt-buffet-counter',144), ('kmutt-booth-panel',192)]:
    source = ROOT/'source'/(key+'.png')
    raw = Image.open(source).convert('RGBA')
    alpha = raw.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    bounds = alpha.getbbox()
    assert bounds, key
    raw.putalpha(alpha)
    crop = raw.crop(bounds)
    native = crop.resize((width, round(crop.height*width/crop.width)), Image.Resampling.NEAREST)
    clean = native.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
    clean.putalpha(native.getchannel('A'))
    padded = Image.new('RGBA', (clean.width+4, clean.height+4))
    padded.alpha_composite(clean, (2,2))
    save(key, padded, 'props', source, list(bounds))

# Existing cleaned sprites are reused without resampling or palette changes.
for group, keys in [('furniture', ['table-short-h','table-long-h','table-round-small','chair-padded-up','chair-padded-down']),
                    ('decor', ['barrier-v','planter-h','sign-right'])]:
    for key in keys:
        source = PIPELINE/'sample-source'/group/'individual'/(key+'.png')
        save(key, Image.open(source).convert('RGBA'), 'props', source)

# Modular floor and low perimeter trim use the guide's geometry-based component workflow.
for key, color in [('kmutt-floor-ivory','eee5cc'),('kmutt-floor-sage','bed0ca'),('kmutt-floor-oat','eed2a0'),('kmutt-floor-guide','d6ad57')]:
    image = Image.new('RGBA', (32,32), '#'+color)
    if key == 'kmutt-floor-ivory':
        draw = ImageDraw.Draw(image)
        draw.line((0,31,31,31), fill='#d2c1a5')
        draw.line((31,0,31,31), fill='#d2c1a5')
    save(key, image, 'structure', 'authored modular floor geometry; shared palette')
for key, size in [('kmutt-trim-h',(32,16)), ('kmutt-trim-v',(16,32))]:
    image = Image.new('RGBA', size)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0,0,size[0]-1,size[1]-1), fill='#594e55')
    draw.rectangle((1,1,size[0]-2,size[1]-4), fill='#d2c1a5')
    draw.rectangle((2,2,size[0]-3,size[1]-6), fill='#eee5cc')
    save(key, image, 'structure', 'authored low wall trim geometry; shared palette')

for group, filename in [('props','asset-sheet.png'), ('structure','map-components-sheet.png')]:
    entries=[entry for entry in inventory if entry['image'].startswith(group+'/')]
    sheet = Image.new('RGBA',(640,((len(entries)+3)//4)*80))
    draw = ImageDraw.Draw(sheet)
    for i, entry in enumerate(entries):
        key=entry['id'];image=images[key]
        x=16+(i%4)*156; y=12+(i//4)*80
        if image.width>144 or image.height>54:
            scale=min(144/image.width,54/image.height)
            display=image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.NEAREST)
        else: display=image
        sheet.alpha_composite(display,(x,y))
        draw.text((x,y+56),key.replace('kmutt-',''),fill='#eee5cc')
    sheet.save(ROOT/filename)
    cell_width = 416 if group == 'props' else 112
    cell_height = 160 if group == 'props' else 64
    atlas = Image.new('RGBA',(cell_width*4,((len(entries)+3)//4)*cell_height))
    for i, entry in enumerate(entries):
        atlas.alpha_composite(images[entry['id']],(8+i%4*cell_width,8+i//4*cell_height))
    atlas.save(ROOT/filename.replace('.png','-native.png'))
    atlas.resize((atlas.width*2,atlas.height*2),Image.Resampling.NEAREST).save(ROOT/filename.replace('.png','-2x.png'))
(ROOT/'inventory.json').write_text(json.dumps(dict(profile='KMUTT-Editor32-v1', palette=palette, native_pixel_unit=1,
    world_tile=32, preview_character_visible_height=56, panel_width_override=192, assets=inventory),indent=2),encoding='utf8')
print(json.dumps([dict(id=a['id'],width=a['width'],height=a['height']) for a in inventory]))
