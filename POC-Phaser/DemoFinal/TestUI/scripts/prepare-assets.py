"""Build preview-only atlases from every supplied sheet, without touching sources."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'D:\A_SIT04\SIT4-TERM1\a_M_CapStone\BussinessMd\MyMdTool\ImageGenerate\CharacterGenerate')
OUT = ROOT / 'assets' / 'characters'
OUT.mkdir(parents=True, exist_ok=True)
manifest = []
labels = ['Mika', 'Haru', 'Nami', 'Ren', 'Sora', 'Yuki', 'Mali', 'Nont', 'Phum', 'Prae', 'Dr. Arun', 'Dr. Pim', 'Fah', 'Dr. May']

def frames_for(file):
    im = Image.open(file).convert('RGBA')
    frames = []
    for row in range(4):
        for col in range(4):
            frame = im.crop((round(col * im.width / 4), round(row * im.height / 4), round((col+1)*im.width/4), round((row+1)*im.height/4)))
            box = frame.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
            frames.append(frame.crop(box) if box else Image.new('RGBA',(1,1)))
    return frames

sources = [(f, None) for f in sorted((SOURCE/'Example01-sprites').glob('*.png'))]
sources += [(f, f.with_name(f.name.replace('-walk-', '-idle-'))) for f in sorted((SOURCE/'Example02-sprites').glob('*-walk-4x4.png'))]
for index, (walk, idle) in enumerate(sources):
    walk_frames = frames_for(walk)
    idle_frames = frames_for(idle) if idle and idle.exists() else None
    all_frames = walk_frames + (idle_frames or [])
    scale = min(66 / max(f.height for f in all_frames), 58 / max(f.width for f in all_frames))
    char_id = f'character-{index+1:02}'
    for kind, frames in [('walk',walk_frames), ('idle',idle_frames)]:
        if not frames:
            continue
        atlas = Image.new('RGBA',(320,320))
        for n, frame in enumerate(frames):
            frame = frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.NEAREST)
            atlas.alpha_composite(frame,(n%4*80+(80-frame.width)//2,n//4*80+73-frame.height))
        atlas.save(OUT/f'{char_id}-{kind}.png',optimize=True)
    manifest.append({'id':char_id,'name':labels[index],'group':'Campus friends' if index<8 else 'The university crew','walk':f'assets/characters/{char_id}-walk.png','idle':f'assets/characters/{char_id}-idle.png' if idle_frames else None,'source':str(walk),'idleSource':str(idle) if idle_frames else None,'directions':['down','up','left','right'],'columns':4,'rows':4,'frameSize':80,'idleMode':'sheet' if idle_frames else 'breathing'})
    thumb = Image.open(OUT/f'{char_id}-walk.png').crop((0,0,80,80))
    thumb.save(OUT/f'{char_id}-portrait.png',optimize=True)

(OUT/'manifest.js').write_text('window.CONNECTA_CHARACTERS = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
contact = Image.new('RGB',(700,240),'#eef1f8')
draw = ImageDraw.Draw(contact)
for i,char in enumerate(manifest):
    im=Image.open(OUT/f"{char['id']}-portrait.png")
    x=(i%7)*100+10
    y=(i//7)*120
    contact.paste(im,(x,y),im)
    draw.text((x,y+82),char['name'],fill='#0f1a3a')
contact.save(ROOT/'screenshots'/'character-contact-sheet.png')
print(f'Prepared {len(manifest)} characters, {len(sources)} source walk sheets, {sum(bool(c["idle"]) for c in manifest)} idle sheets.')
