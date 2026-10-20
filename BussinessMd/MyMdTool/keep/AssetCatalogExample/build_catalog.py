"""Build a portable documentation example. Read source assets; write only beside this script."""
from pathlib import Path
import base64
import html
import json
import math
import re
import shutil
import struct

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
EDITOR = ROOT / 'POC-Phaser' / 'Editor'
IMAGES = OUT / 'images'
DIAGRAMS = OUT / 'diagrams'
IMAGES.mkdir(exist_ok=True)
DIAGRAMS.mkdir(exist_ok=True)
TILE = 32
tileset = json.loads((EDITOR / 'maps/tilesets/exhibition.tsj').read_text(encoding='utf-8'))
map_doc = json.loads((EDITOR / 'maps/exhibition.tmj').read_text(encoding='utf-8'))
prefabs = json.loads((EDITOR / 'assets/booth-parts.json').read_text(encoding='utf-8'))
config_text = (EDITOR / 'src/game/config.ts').read_text(encoding='utf-8')

def props(node):
    return {p['name']: p['value'] for p in node.get('properties', [])}

tiles = {props(t)['assetKey']: t for t in tileset['tiles']}
by_gid = {t['id'] + 1: key for key, t in tiles.items()}
defaults = {}

def walk(layers):
    for layer in layers:
        for obj in layer.get('objects', []):
            key = by_gid.get(obj.get('gid'))
            if key and key not in defaults:
                defaults[key] = obj
        walk(layer.get('layers', []))

walk(map_doc['layers'])

def n(value):
    return f'{value:.4f}'.rstrip('0').rstrip('.')

def pair(w, h):
    return f'{n(w)} × {n(h)}'

def esc(value):
    return html.escape(str(value), quote=True)

def copy_image(source, name=None):
    source = Path(source)
    target = IMAGES / (name or source.name)
    shutil.copy2(source, target)
    return target

def png_size(path):
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', path
    return struct.unpack('>II', data[16:24])

def data_uri(path):
    return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

def svg_begin(w, h, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{esc(title)}</title><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#d6dee8" stroke-width="0.7"/></pattern></defs><rect width="100%" height="100%" fill="#f5f8fc"/>'

def asset_svg(key):
    t = tiles[key]
    meta = props(t)
    path = copy_image(EDITOR / 'public/world/pieces' / Path(t['image']).name)
    w, h = png_size(path)
    assert (w, h) == (t['imagewidth'], t['imageheight'])
    margin = 54
    svg = svg_begin(w + 108, h + 112, key)
    svg += f'<rect x="{margin}" y="{margin}" width="{w}" height="{h}" fill="url(#grid)"/>'
    svg += f'<image href="{data_uri(path)}" x="{margin}" y="{margin}" width="{w}" height="{h}"/>'
    svg += f'<rect x="{margin}" y="{margin}" width="{w}" height="{h}" fill="none" stroke="#2865d5" stroke-width="2"/>'
    for c in t.get('objectgroup', {}).get('objects', []):
        svg += f'<rect x="{margin+c["x"]}" y="{margin+c["y"]}" width="{c["width"]}" height="{c["height"]}" fill="#ef943322" stroke="#ce6c00" stroke-width="2" stroke-dasharray="6 3"/>'
    depth = meta.get('depthY')
    if depth is not None:
        svg += f'<path d="M{margin} {margin+depth}h{w}" stroke="#12946c" stroke-width="2"/>'
    svg += f'<circle cx="{margin}" cy="{margin}" r="4" fill="#bd2652"/>'
    svg += f'<g font-family="Segoe UI, sans-serif" font-size="12" fill="#233449"><text x="12" y="22">{esc(key)} · SOURCE PIXELS</text><text x="{margin}" y="{margin-12}">{w} px</text><text x="12" y="{margin+h/2}">{h} px</text><text x="12" y="{h+margin+26}">BLUE: image bounds / origin (0,0)</text><text x="12" y="{h+margin+44}">ORANGE: collision · GREEN: depthY</text></g></svg>'
    (DIAGRAMS / f'{key}.svg').write_text(svg, encoding='utf-8')
    o = defaults[key]
    sx, sy = o['width']/w, o['height']/h
    cols = []
    for c in t.get('objectgroup', {}).get('objects', []):
        cols.append({'local': {a: c[a] for a in ('x','y','width','height')}, 'world': {'x': c['x']*sx, 'y': c['y']*sy, 'width': c['width']*sx, 'height': c['height']*sy}})
    return {'key': key, 'image': path.name, 'source': (w,h), 'display': (o['width'],o['height']), 'scale': (sx,sy), 'depth': depth, 'colliders': cols, 'seed_id': o['id']}

objects = [asset_svg('round-table'), asset_svg('chair')]
booth = next(p for p in prefabs if p['key'] == 'booth1-1')
booth_w, booth_h = booth['width'], booth['height']
booth_svg = svg_begin(booth_w + 100, booth_h + 120, booth['key'])
booth_svg += f'<rect x="50" y="50" width="{booth_w}" height="{booth_h}" fill="url(#grid)"/>'
for part in booth['parts']:
    t = tiles[part['key']]
    image = copy_image(EDITOR / 'public/world/pieces' / Path(t['image']).name)
    booth_svg += f'<image href="{data_uri(image)}" x="{50+part["x"]}" y="{50+part["y"]}" width="{part["w"]}" height="{part["h"]}"/>'
for part in booth['parts']:
    t = tiles[part['key']]
    sx, sy = part['w']/t['imagewidth'], part['h']/t['imageheight']
    for c in t.get('objectgroup', {}).get('objects', []):
        booth_svg += f'<rect x="{50+part["x"]+c["x"]*sx}" y="{50+part["y"]+c["y"]*sy}" width="{c["width"]*sx}" height="{c["height"]*sy}" fill="#ef943322" stroke="#ce6c00" stroke-width="2" stroke-dasharray="6 3"/>'
booth_svg += f'<rect x="50" y="50" width="{booth_w}" height="{booth_h}" fill="none" stroke="#2865d5" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="#bd2652"/>'
booth_svg += f'<g font-family="Segoe UI, sans-serif" font-size="13" fill="#233449"><text x="14" y="25">booth1-1 · PREFAB RECIPE · SOURCE PIXELS</text><text x="14" y="{booth_h+78}">{booth_w} × {booth_h} px · {len(booth["parts"])} separate parts</text><text x="14" y="{booth_h+100}">Outline = recipe bounds; orange = part collision</text></g></svg>'
(DIAGRAMS / 'booth1-1.svg').write_text(booth_svg, encoding='utf-8')
part_scales = [(defaults[p['key']]['width']/p['w'], defaults[p['key']]['height']/p['h']) for p in booth['parts'] if p['key'] in defaults]
booth_scale = part_scales[0] if part_scales and all(abs(a-part_scales[0][0])<1e-5 and abs(b-part_scales[0][1])<1e-5 for a,b in part_scales) else None

def cfg_number(name):
    match = re.search(r'\b'+name+r':\s*([\d.]+)', config_text)
    assert match, name
    return float(match.group(1))

fw, fh, char_scale = int(cfg_number('frameWidth')), int(cfg_number('frameHeight')), cfg_number('scale')
body_match = re.search(r'body:\s*\{\s*width:\s*(\d+),\s*height:\s*(\d+),\s*offsetX:\s*(\d+),\s*offsetY:\s*(\d+)', config_text)
bw, bh, bx, by = map(int, body_match.groups())
origin_match = re.search(r'origin:\s*\{\s*x:\s*([\d.]+),\s*y:\s*(\d+)\s*/\s*(\d+)', config_text)
origin_x = float(origin_match.group(1))*fw
origin_y = int(origin_match.group(2))/int(origin_match.group(3))*fh
character = copy_image(EDITOR / 'public/world/characters/kaguya-walk.png')
sw, sh = png_size(character)
assert sw == fw*6 and sh == fh*4
anim_ranges = [(name,int(start),int(end),int(idle)) for name,start,end,idle in re.findall(r'(up|down|left|right):\s*\{\s*start:\s*(\d+),\s*end:\s*(\d+),\s*idle:\s*(\d+)', config_text)]
assert len(anim_ranges) == 4
svg = svg_begin(fw+108, fh+118, 'kaguya frame 6 geometry')
svg += f'<defs><clipPath id="frame"><rect x="54" y="54" width="{fw}" height="{fh}"/></clipPath></defs><rect x="54" y="54" width="{fw}" height="{fh}" fill="url(#grid)"/>'
svg += f'<image href="{data_uri(character)}" x="54" y="{54-fh}" width="{sw}" height="{sh}" clip-path="url(#frame)"/>'
svg += f'<rect x="54" y="54" width="{fw}" height="{fh}" fill="none" stroke="#2865d5" stroke-width="2"/><rect x="{54+bx}" y="{54+by}" width="{bw}" height="{bh}" fill="#ef943333" stroke="#ce6c00" stroke-width="2" stroke-dasharray="6 3"/>'
svg += f'<path d="M54 {54+origin_y}h{fw}" stroke="#12946c" stroke-width="2"/><circle cx="{54+origin_x}" cy="{54+origin_y}" r="5" fill="#bd2652"/>'
svg += f'<g font-family="Segoe UI, sans-serif" font-size="12" fill="#233449"><text x="12" y="24">kaguya · DOWN IDLE / FRAME 6</text><text x="12" y="{fh+78}">BLUE: {fw} × {fh} frame (includes padding)</text><text x="12" y="{fh+96}">ORANGE: physics body · RED: feet anchor</text><text x="12" y="{fh+112}">GREEN: y = {n(origin_y)} source px</text></g></svg>'
(DIAGRAMS / 'kaguya-frame.svg').write_text(svg, encoding='utf-8')

intro = '''# Asset Catalog ตัวอย่าง

Profile: **Editor32-v1** · ตรวจข้อมูลต้นทางวันที่ **2026-10-11** · 1 tile = **32 world pixels**

เริ่มดูภาพและการเทียบสัดส่วนที่ [Catalog.html](Catalog.html) แล้วใช้เอกสารนี้เป็นตัวอย่างข้อมูลกำกับ asset อ่านร่วมกับ [MapStandard.md](../MapStandard.md), [ObjectAssetGuide.md](../ObjectAssetGuide.md) และ [CharacterAssetGuide.md](../CharacterAssetGuide.md)

ตัวอย่างนี้คัดลอกภาพเดิมเพื่อทำเอกสาร ไม่ได้สร้าง artwork ใหม่ เปลี่ยนแมป หรือปรับ config ของเกม รูปและค่ามาจากไฟล์ใน POC-Phaser/Editor ไม่ได้อ่านแมปฉบับล่าสุดในฐานข้อมูล

## วิธีอ่าน

- **Source pixels** คือพิกเซลในภาพต้นฉบับ และพิกัด collision/depth ภายในภาพ
- **World pixels** คือขนาดและระยะในเกมหลังปรับ scale; หาร 32 เพื่อแสดงเป็น tile
- **Image/frame bounds** รวมพื้นที่โปร่งใสและส่วนบนของภาพ ไม่ใช่ฐานบนพื้นทั้งหมด
- **Collision** คือพื้นที่ชนที่นิยามไว้ ไม่ควรใช้แทน footprint สำหรับจองพื้นที่ใน blueprint โดยอัตโนมัติ
- **Blueprint footprint** ต้องกำหนดแยกเมื่อไม่มีข้อมูลที่รับรอง กรอก unresolved ได้ ไม่ปั้นตัวเลขให้ดูแม่น
- สีฟ้าในภาพกำกับ = กรอบภาพ, ส้มเส้นประ = collision, เขียว = depth/แนวเท้า, แดง = origin/anchor
- assetId เช่น `round-table` เป็นชื่อแบบ ส่วน instanceId เช่น `T01` ระบุของแต่ละชิ้นบน blueprint และ object.id เป็นรหัสเชิงตัวเลขใน TMJ

## สถานะ

ค่าที่ระบุว่า source-checked ตรวจจาก TSJ/TMJ/config และขนาด PNG แล้ว ตัวอย่างนี้ **ยังไม่ได้ทดสอบ runtime หรืออนุมัติ artwork ใหม่** การมีภาพและ collider ไม่ได้ยืนยัน interaction, path accessibility หรือการบังหน้าหลังในทุกตำแหน่ง

## รายการ

| Asset ID | ประเภท | สถานะ | Blueprint footprint |
|---|---|---|---|
| round-table | สิ่งของภาพเดียว | source-checked | unresolved |
| chair | สิ่งของภาพเดียว | source-checked | unresolved |
| booth1-1 | prefab หลายชิ้น | source-checked | unresolved |
| kaguya | ตัวละคร 24 เฟรม | source-checked | ใช้ anchor/body ตามเกม ไม่ใช้กรอบเฟรมเป็นฐาน |
'''
md = [intro]
cards = []
for a in objects:
    dw, dh = a['display']
    w,h = a['source']
    cx = a['colliders'][0]
    local, world = cx['local'], cx['world']
    rows = [('Asset ID',a['key']),('ไฟล์ภาพ',f"images/{a['image']}"),('ขนาดภาพต้นฉบับ',pair(w,h)+' source px'),('ขนาดแสดงใน seed TMJ',pair(dw,dh)+' world px'),('กรอบภาพแสดงคิดเป็น tile',pair(dw/TILE,dh/TILE)+' tile'),('Scale X/Y',pair(*a['scale'])),('Blueprint footprint','unresolved; ยังไม่เท่ากับกรอบภาพหรือ collision'),('Origin','มุมซ้ายบนกรอบภาพ (0,0)'),('Collision local',f"x={n(local['x'])}, y={n(local['y'])}, w={n(local['width'])}, h={n(local['height'])} source px"),('Collision หลัง scale',f"offset=({n(world['x'])},{n(world['y'])}), size={pair(world['width'],world['height'])} world px"),('Collision คิดเป็น tile',pair(world['width']/TILE,world['height']/TILE)+' tile'),('Depth',f"depthY={n(a['depth'])} source px; depth โลก = object.y + depthY × scaleY"),('Interaction','ไม่มี handler เฉพาะสิ่งของนี้ที่ตรวจในตัวอย่าง; ต้องกำหนดตอนวางและรองรับในเกม'),('Facing / variants','unresolved; ให้เลือกและตรวจ reference ก่อนใช้เป็นกติกา'),('Source',f"exhibition.tsj tile.id={tiles[a['key']]['id']}; seed TMJ object.id={a['seed_id']}"),('Status','source-checked; runtime not checked in this example')]
    md.append(f"\n## {a['key']}\n\n![ภาพกำกับ {a['key']}](diagrams/{a['key']}.svg)\n\nภาพต้นฉบับ: [PNG](images/{a['image']})\n\n| ข้อมูล | ค่า |\n|---|---|\n"+'\n'.join('| '+k+' | '+v+' |' for k,v in rows)+'\n')
    cards.append(f'<section class="asset"><div class="asset-head"><span class="pill">OBJECT / SOURCE-CHECKED</span><h2>{a["key"]}</h2></div><div class="asset-content"><img class="diagram" src="diagrams/{a["key"]}.svg" alt="กรอบภาพ พื้นที่ชน และแนว depth ของ {a["key"]}"><div>'+''.join(f'<div class="detail"><span>{esc(k)}</span><strong>{esc(v)}</strong></div>' for k,v in rows)+'</div></div></section>')

booth_display = pair(booth_w*booth_scale[0],booth_h*booth_scale[1])+' world px' if booth_scale else 'unresolved: ไม่พบ uniform scale เดียวกันครบทุกชิ้น'
booth_tiles = pair(booth_w*booth_scale[0]/TILE,booth_h*booth_scale[1]/TILE)+' tile' if booth_scale else 'unresolved'
md.append(f'''\n## booth1-1: prefab บูธหลายชิ้น

![ภาพประกอบบูธและ collision](diagrams/booth1-1.svg)

ภาพนี้ประกอบเพื่อดูเอกสารจาก recipe ไม่ใช่ PNG ใหม่สำหรับแทน prefab ในเกม เส้นสีส้มเป็น collision ของแต่ละชิ้น; depth ยังคงกำหนดรายชิ้นใน TSJ

| ข้อมูล | ค่า |
|---|---|
| Asset ID / prefab key | booth1-1 |
| ขอบเขต recipe | {pair(booth_w,booth_h)} source px |
| จำนวนชิ้น | {len(booth['parts'])} |
| ขอบเขตแสดงตาม scale ชิ้นใน seed | {booth_display} |
| ขอบเขตภาพคิดเป็น tile | {booth_tiles} |
| Blueprint footprint | unresolved; recipe bounds รวมภาพส่วนบน ไม่ใช่ฐานที่รับรอง |
| Origin ของ recipe | มุมซ้ายบนกรอบ recipe |
| Collision / depth | อ่านจาก TSJ ของแต่ละ part แล้วแปลงด้วยตำแหน่งและ scale |
| การย้าย | ย้าย group; เก็บตำแหน่งย่อยสัมพันธ์กับ group |
| NPC / interact | ไม่ได้เพิ่ม NPC ให้ทุก prefab อัตโนมัติ ต้องกำหนดและตรวจ handler |
| Source | assets/booth-parts.json + exhibition.tsj + seed TMJ |

| Part key | Local X,Y | W×H source px |
|---|---|---|
'''+ '\n'.join(f"| {p['key']} | {p['x']}, {p['y']} | {p['w']} × {p['h']} |" for p in booth['parts'])+'\n')
cards.append(f'<section class="asset"><div class="asset-head"><span class="pill">PREFAB / {len(booth["parts"])} PARTS</span><h2>booth1-1</h2></div><div class="asset-content"><img class="diagram" src="diagrams/booth1-1.svg" alt="prefab ประกอบจากภาพหลายชิ้น"><div><p>ขอบเขต recipe: <b>{pair(booth_w,booth_h)} source px</b></p><p>ขอบเขตภาพแสดง: <b>{booth_display}</b> / {booth_tiles}</p><p class="warning">Blueprint footprint: unresolved</p><p>ใช้กรอบ recipe เป็นขนาดภาพรวม ส่วนฐานและพื้นที่ชนต้องระบุแยก ภาพประกอบนี้ใช้ดูเอกสาร เกมยังใช้ภาพแต่ละชิ้นเพื่อจัด depth</p><details><summary>ดูชิ้นส่วน {len(booth["parts"])} ชิ้น</summary><table><thead><tr><th>Part</th><th>X,Y</th><th>W×H</th></tr></thead><tbody>'+''.join(f'<tr><td>{esc(p["key"])}</td><td>{p["x"]},{p["y"]}</td><td>{p["w"]}×{p["h"]}</td></tr>' for p in booth['parts'])+'</tbody></table></details></div></div></section>')

animation_table = '| ทิศ | เฟรมเดิน | Idle |\n|---|---|---|\n'+'\n'.join(f'| {d} | {s}–{e} | {i} |' for d,s,e,i in anim_ranges)
md.append(f'''\n## kaguya: ตัวละครและ animation

![เฟรมเดินลงและ geometry](diagrams/kaguya-frame.svg)

| ข้อมูล | ค่า |
|---|---|
| Character ID | kaguya |
| ภาพ | images/kaguya-walk.png |
| Spritesheet | {pair(sw,sh)} source px; 6 columns × 4 rows |
| Frame | {pair(fw,fh)} source px รวม padding |
| Scale | {n(char_scale)} |
| กรอบเฟรมบนโลก | {pair(fw*char_scale,fh*char_scale)} world px; {pair(fw*char_scale/TILE,fh*char_scale/TILE)} tile |
| Visible body height | unresolved; ไม่ใช้ frameHeight แทนความสูงตัวคน |
| Feet anchor | ({n(origin_x)}, {n(origin_y)}) source px; entity x/y ใช้อ้างจุดนี้ |
| Physics body | {pair(bw,bh)} source px; offset ({bx},{by}) |
| Physics body บนโลก | {pair(bw*char_scale,bh*char_scale)} world px |
| Frame rate | {n(cfg_number('frameRate'))} animation frames/second |
| Movement speed | {n(cfg_number('speed'))} world px/second; คนละค่ากับ frame rate |
| Depth | entity.y ที่อ้างใกล้เท้า |
| Blueprint placement | Player ใช้ Spawn; NPC ใช้ Npc contract ที่เกมรองรับ |
| Status | geometry source-checked; ไม่ได้ทดสอบ loop หรือ artwork approval ในรอบนี้ |

{animation_table}

### Sheet พร้อมเลขเฟรม

ดูภาพพร้อมเลขเฟรมและปุ่มเล่นตัวอย่างใน [Catalog.html](Catalog.html#character) ภาพต้นฉบับ: [kaguya-walk.png](images/kaguya-walk.png)

การใส่รูปตัวละครเป็น object ธรรมดาใน TMJ ไม่ได้สร้าง Player หรือ NPC และ catalog นี้ไม่ได้ทำให้เกมรับ character ใหม่ได้ทันที
''')
frame_cells = ''.join(f'<div class="frame-cell"><div class="frame-preview" style="background-position:-{(i%6)*fw/2}px -{(i//6)*fh/2}px"></div><span>{i} · {anim_ranges[i//6][0]}</span></div>' for i in range(24))
cards.append(f'<section class="asset" id="character"><div class="asset-head"><span class="pill">CHARACTER / 24 FRAMES</span><h2>kaguya</h2></div><div class="asset-content"><img class="diagram" src="diagrams/kaguya-frame.svg" alt="เฟรม 6 กรอบชนและแนวเท้า"><div><p>Frame: <b>{pair(fw,fh)} source px</b> · scale {n(char_scale)}</p><p>กรอบเฟรมในโลก: {pair(fw*char_scale,fh*char_scale)} px</p><p>กรอบชนในโลก: <b>{pair(bw*char_scale,bh*char_scale)} px</b></p><p>Feet anchor: ({n(origin_x)},{n(origin_y)}) source px</p><p class="warning">กรอบเฟรมรวม padding ไม่ใช่ความสูงตัวคนหรือพื้นที่ชน</p><div class="animation-demo"><div id="walk-preview" class="frame-preview"></div><div><label for="direction">ลองท่าเดิน</label><select id="direction"><option value="6">down · 6–11</option><option value="0">up · 0–5</option><option value="12">left · 12–17</option><option value="18">right · 18–23</option></select><button id="play" type="button" aria-pressed="false">เล่นตัวอย่าง</button><p id="frame-label">frame 6</p></div></div><p class="small">การเล่นนี้ใช้ดูเฟรมในเอกสาร ไม่ใช่การทดสอบ physics หรือ Phaser</p></div></div><details><summary>ดู spritesheet ทั้ง 24 เฟรมพร้อมเลข</summary><div class="frame-grid">{frame_cells}</div></details></section>')

md.append('''\n## ตัวอย่างการอ้างจาก blueprint

| Instance ID บน blueprint | Asset ID | ตำแหน่ง | ขนาดแสดง | ฐาน/slot |
|---|---|---|---|---|
| T01 | round-table | ใช้ X,Y ของกรอบภาพตาม origin ของ Editor หรือแปลงจากฐานก่อน | ใช้ preset ที่อนุมัติ | unresolved จนกำหนดฐาน |
| T02 | round-table | อีกตำแหน่งหนึ่ง | preset เดียวกัน | ฐานเดียวกัน |
| C01 | chair | แยกจากตำแหน่งโต๊ะ | preset เก้าอี้ | unresolved |
| B01 | booth1-1 | ตำแหน่ง group | recipe/preset | unresolved |
| S01 | Spawn | จุดเท้าของ Player ในโลก | point | ตรวจ body ไม่ทับ collider |

ตารางนี้อธิบายการอ้างอิง ไม่ใช่แมปพร้อมใช้ ยังไม่มี TMJ ใหม่ ถ้า blueprint ระบุ X,Y ของฐาน แต่ runtime ใช้มุมซ้ายบนภาพ ต้องกำหนด footprint offset และแปลงพิกัดก่อนประกอบแมป

## ก่อนอนุมัติ asset ใหม่

- [ ] กำหนด footprint พร้อม offset จากมุมภาพ และขนาดใน world pixels/tile
- [ ] กำหนด default display size หรือ uniform scale โดยไม่ยืดเฉพาะแกน
- [ ] ยืนยัน reference role, กล้อง, สไตล์, ทิศแสงและขนาดสัมพันธ์กับตัวละคร
- [ ] ตรวจ alpha, padding, ขอบภาพ และรอยต่อของชิ้นที่ต่อซ้ำ
- [ ] ตรวจ collision, depth, spawn clearance และทางเดินในเกม
- [ ] ถ้ามี interaction ต้องมี handler และระยะที่เกมอ่านได้จริง
- [ ] ตัวละครต้องตรวจเฟรม ทิศ idle anchor และ loop ในเกม
- [ ] เก็บสถานะ visual-approved และ runtime-validated แยกกัน พร้อมหลักฐาน

## แหล่งข้อมูลและการสร้างใหม่

อ่านภาพและค่าจาก `POC-Phaser/Editor/maps/tilesets/exhibition.tsj`, `maps/exhibition.tmj`, `assets/booth-parts.json` และ `src/game/config.ts` ค่าขนาด seed เป็นตัวอย่างจากไฟล์ ไม่ใช่สถานะล่าสุดในฐานข้อมูล

`build_catalog.py` สร้างเอกสารและภาพกำกับด้วยพิกัดจาก source เขียนเฉพาะในโฟลเดอร์นี้ ภาพ PNG ใน images เป็นสำเนาเดิม ภาพ SVG เป็นแผนภาพเอกสารที่มี annotation ไม่ใช่ asset ใหม่สำหรับเกม การสร้างใหม่จะเขียนทับไฟล์ตัวอย่างในโฟลเดอร์นี้
''')
(OUT / 'AssetCatalog.md').write_text('\n'.join(md), encoding='utf-8')

template = '''# Asset card template

ใช้หนึ่ง card ต่อหนึ่งแบบ asset ภาพต้องมีบทบาทชัดเจน อ่านร่วมกับ MapStandard.md และ ReferenceImageGuide.md กรอก unresolved เมื่อยังไม่ทราบ

## [asset-id]

![ภาพที่ใช้เป็นต้นแบบ](images/[filename].png)

| ข้อมูล | ค่า |
|---|---|
| Asset ID | [ชื่อแบบคงที่ ไม่ใช่ instanceId] |
| Profile / version | [profile] |
| Type | [prop / floor / wall / prefab / character] |
| Reference role | [design / style / identity / approved game image] |
| Source image / source size | [ไฟล์, width×height source px] |
| Default display size / uniform scale | [world px หรือ scale] |
| Image bounds ใน tile | [displayWidth ÷ tileSize, displayHeight ÷ tileSize] |
| Blueprint footprint | [width×height world px และ tile; unresolved ได้] |
| Footprint offset / placement anchor | [ตำแหน่งฐาน/anchor จากมุมภาพ source px และวิธีแปลง] |
| Runtime origin | [มุมภาพ / เท้า / custom ตาม loader] |
| Facing | [up/down/left/right/variant] |
| Collision local | [rectangles x,y,w,h source px หรือ none] |
| Depth | [depthY source px หรือกติกาของ renderer] |
| Allowed scale / variants | [presets; ข้อห้ามการยืด; variant IDs] |
| Shadow mode | [none/baked/separate] |
| Repeat / connectors | [ด้านที่ต่อซ้ำได้, doorway size หรือ not applicable] |
| Prefab recipe | [part ID, local position, size หรือ not applicable] |
| Interaction capability | [type/handler ที่รองรับ; ข้อมูลเฉพาะ instance เก็บตอนวางแมป] |
| Visual QA | [draft / visual-approved + หลักฐาน] |
| Runtime QA | [not-tested / runtime-validated + หลักฐาน] |
| Source / revision / overrides | [ข้อมูลต้นทาง, version, override และผลกระทบ] |

## เพิ่มเมื่อเป็น character

| ข้อมูล | ค่า |
|---|---|
| Frame size / sheet layout | [source px; columns×rows] |
| Visible height | [source/world px แยกจาก frameHeight] |
| Feet anchor / padding | [source px] |
| Directions / frame ranges / idle | [รายการที่มีในภาพจริง] |
| Frame rate | [animation frames/second] |
| Physics body / offset | [หน่วยตาม runtime] |
| Movement speed | [world px/second] |

## ภาพกำกับที่ควรแนบ

1. ภาพ asset ที่อนุมัติ พร้อมภาพแสดงที่ขนาดจริงในโลก
2. กรอบภาพและฐาน แสดงแยกกันพร้อม origin/offset
3. Collision และแนว depth ใช้สีและสัญลักษณ์กำกับ
4. ภาพเทียบสัดส่วนกับ character/ประตู/โต๊ะมาตรฐาน
5. ตัวละครใช้ sheet ที่ใส่เลขเฟรมและทิศ รวมถึงหลักฐาน loop

Catalog เป็นเอกสารอ้างอิง ไม่ใช่แมปอีกฉบับ เมื่อมี tool ให้สร้าง card จาก metadata ชุดเดียวกับ TSJ/config เพื่อลดการแก้ข้อมูลซ้ำด้วยมือ
'''
(OUT / 'AssetCardTemplate.md').write_text(template, encoding='utf-8')

scale_items = []
for a in objects:
    dw,dh = a['display']
    scale_items.append(f'<div class="scale-item"><img src="images/{a["image"]}" alt="{a["key"]}" style="width:{dw}px;height:{dh}px"><span>{a["key"]}<br>{pair(dw,dh)} px</span></div>')
scale_items.append(f'<div class="scale-item"><div class="scale-character" style="width:{fw*char_scale}px;height:{fh*char_scale}px;background-image:url(images/kaguya-walk.png);background-size:{sw*char_scale}px {sh*char_scale}px;background-position:0 -{fh*char_scale}px"></div><span>kaguya / frame 6<br>กรอบ {pair(fw*char_scale,fh*char_scale)} px</span></div>')
css = '''*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#24344b;font:16px/1.65 "Segoe UI","Leelawadee UI",Tahoma,sans-serif}main{max-width:1200px;margin:auto;padding:38px 28px 70px}header{background:#162c46;color:white;border-radius:20px;padding:34px 38px;margin-bottom:24px}h1{font-size:36px;line-height:1.25;margin:8px 0 12px}h2{margin:7px 0 14px;font-size:26px}h3{margin:0 0 12px}a{color:#2865d5}header a{color:#c4deff}.eyebrow{font-size:13px;letter-spacing:1.6px;color:#a9cce9}.subtitle{max-width:780px;color:#dfebf5}.pill{display:inline-block;font-size:11px;letter-spacing:1px;background:#dceaf8;color:#234a70;border-radius:5px;padding:4px 8px}.links{display:flex;gap:20px;flex-wrap:wrap}.notice{background:#fff8e5;border:1px solid #edd6a0;border-radius:12px;padding:18px 22px;margin:20px 0}.legend{display:flex;gap:22px;flex-wrap:wrap;font-size:14px;margin:20px 0}.legend b{padding:3px 8px;border-left:4px solid}.asset{background:white;border:1px solid #dbe3ec;border-radius:16px;padding:26px;margin:24px 0}.asset-content{display:grid;grid-template-columns:minmax(280px,42%) 1fr;gap:30px;align-items:start}.diagram{width:100%;max-height:480px;object-fit:contain;border:1px solid #dce4ee;border-radius:10px;background:#f5f8fc}.detail{display:grid;grid-template-columns:38% 1fr;gap:16px;border-bottom:1px solid #e7edf4;padding:10px 0;font-size:14px}.detail span{color:#617188}.detail strong{font-weight:500;overflow-wrap:anywhere}.warning{background:#fff7e2;border-left:3px solid #bd801b;padding:10px 14px}.small{font-size:13px;color:#627087}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}th,td{text-align:left;border-bottom:1px solid #dce3ed;padding:8px;overflow-wrap:anywhere}summary{cursor:pointer;padding:12px 0;font-weight:600}details{margin-top:16px}.scale-panel{overflow:auto;background:linear-gradient(#eef3f8 1px,transparent 1px),linear-gradient(90deg,#eef3f8 1px,transparent 1px),#fff;background-size:32px 32px;border:1px solid #dce4ee;border-radius:10px;padding:24px}.scale-items{display:flex;align-items:flex-end;gap:52px;min-width:600px}.scale-item{display:flex;align-items:center;flex-direction:column;min-width:130px}.scale-item img{object-fit:fill}.scale-item span{font-size:12px;text-align:center;margin-top:10px;background:#fffffff0;padding:3px 6px}.scale-character,.frame-preview{background-repeat:no-repeat;image-rendering:pixelated}.frame-preview{width:144px;height:128px;background-image:url(images/kaguya-walk.png);background-size:864px 512px}.frame-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;padding:12px 0}.frame-cell{border:1px solid #dce4ee;background:#f5f8fc;border-radius:8px;display:flex;flex-direction:column;align-items:center;overflow:hidden}.frame-cell span{font-size:12px;padding:4px 0 8px}.animation-demo{display:flex;gap:20px;align-items:center;margin-top:20px;background:#f5f8fc;border-radius:10px;padding:16px}.animation-demo label{display:block}select,button{font:inherit;font-size:14px;border:1px solid #bac9da;border-radius:6px;padding:7px 10px;margin:5px 0;background:white;color:#24344b}button{cursor:pointer;background:#234d7c;color:white}#walk-preview{background-position:0 -128px}.footer{font-size:13px;color:#65748a;margin-top:24px}@media(max-width:760px){main{padding:18px 14px}header{padding:25px}h1{font-size:28px}.asset{padding:18px}.asset-content{grid-template-columns:1fr}.frame-grid{grid-template-columns:repeat(2,1fr)}.detail{grid-template-columns:36% 1fr}.animation-demo{flex-wrap:wrap}}@media print{body{background:white}main{padding:0}header{background:white;color:#24344b;border:1px solid #ccc}header .subtitle,.eyebrow{color:#24344b}.asset{break-inside:avoid}.frame-grid{grid-template-columns:repeat(6,1fr)}button,select{display:none}}'''
document = f'''<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asset Catalog ตัวอย่าง · Editor32-v1</title><style>{css}</style></head><body><main><header><div class="eyebrow">REFERENCE CATALOG · EDITOR32-V1 · 11 OCT 2026</div><h1>ภาพหนึ่งแบบ ข้อมูลใช้งานครบใน card เดียว</h1><p class="subtitle">ตัวอย่าง asset catalog จากภาพจริงของ Editor มีกรอบภาพ พื้นที่ชน แนว depth และตัวละครพร้อมเลขเฟรม ขนาดฐานบน blueprint ที่ยังไม่มีหลักฐานแสดงเป็น unresolved</p><div class="links"><a href="AssetCatalog.md">อ่านข้อมูลใน Markdown</a><a href="AssetCardTemplate.md">แม่แบบ card สำหรับ asset ใหม่</a><a href="../MapStandard.md">มาตรฐานกลาง</a></div></header><div class="notice"><b>ขอบเขตของตัวอย่าง</b><br>ภาพ PNG เป็นสำเนาจากโปรเจกต์เดิม ตรวจตัวเลขกับไฟล์ต้นทางแล้ว ยังไม่ได้รันเกมหรือรับรอง artwork ในรอบนี้ ค่าขนาดแสดงอ้าง seed TMJ ไม่ใช่แมปฉบับล่าสุดในฐานข้อมูล</div><div class="legend"><b style="border-color:#2865d5">ฟ้า = กรอบภาพ</b><b style="border-color:#ce6c00">ส้มเส้นประ = collision</b><b style="border-color:#12946c">เขียว = depth / แนวเท้า</b><b style="border-color:#bd2652">แดง = origin / anchor</b></div><section class="asset"><h2>เทียบสัดส่วนที่ขนาดแสดงเดียวกัน</h2><p>แสดงที่ 1 world px = 1 CSS px ก่อน browser zoom ช่องพื้นด้านหลังคือ 32 × 32 px ภาพตัวละครรวม padding จึงไม่ควรใช้กรอบเต็มแทนความสูงตัวคน</p><div class="scale-panel"><div class="scale-items">{''.join(scale_items)}</div></div></section>{''.join(cards)}<section class="asset"><h2>จาก catalog ไป blueprint</h2><p><b>round-table</b> คือแบบของสิ่งของ ส่วน <b>T01 / T02</b> คือโต๊ะคนละตัวที่อ้างแบบเดียวกัน พิกัดและจำนวนของแต่ละตัวเก็บในเอกสารแมป</p><p>ถ้า blueprint อ้างฐาน แต่ Editor อ้างมุมภาพ ต้องกำหนด footprint offset และแปลงก่อนวาง ห้ามใช้ขนาดกรอบภาพหรือ collider แทนฐานที่ยังไม่ได้กำหนด</p><p>Catalog ใช้ภาพเพื่ออ้างอิงหน้าตาและ metadata ส่วน TMJ เก็บการวางจริง เมื่อมี tool ควรสร้างหน้า catalog จากข้อมูลชุดเดียวกับ TSJ/config</p></section><p class="footer">Source: maps/tilesets/exhibition.tsj · maps/exhibition.tmj · assets/booth-parts.json · src/game/config.ts<br>HTML นี้เปิดแบบ offline ได้ ไม่มี CDN หรือการเรียก backend และไม่ใช่เครื่องมือแก้แมป</p></main><script>const preview=document.getElementById('walk-preview'),label=document.getElementById('frame-label'),direction=document.getElementById('direction'),play=document.getElementById('play');let start=6,index=6,timer=null;function draw(){{preview.style.backgroundPosition=`-${{(index%6)*144}}px -${{Math.floor(index/6)*128}}px`;label.textContent='frame '+index;}}direction.addEventListener('change',()=>{{start=Number(direction.value);index=start;draw();}});play.addEventListener('click',()=>{{if(timer){{clearInterval(timer);timer=null;play.textContent='เล่นตัวอย่าง';play.setAttribute('aria-pressed','false');index=start;draw();}}else{{play.textContent='หยุด';play.setAttribute('aria-pressed','true');timer=setInterval(()=>{{index=start+(index-start+1)%6;draw();}},1000/6);}}}});draw();</script></body></html>'''
(OUT / 'Catalog.html').write_text(document, encoding='utf-8')
(OUT / 'README.md').write_text('''# Asset Catalog Example

เริ่มที่ [Catalog.html](Catalog.html) สำหรับดูภาพกำกับและสัดส่วน หรือ [AssetCatalog.md](AssetCatalog.md) สำหรับอ่านข้อมูลที่นำไปทำ card ได้

- [AssetCardTemplate.md](AssetCardTemplate.md): แม่แบบสำหรับสิ่งของและ character ใหม่
- images/: สำเนา PNG เดิม ไม่มีแก้ artwork
- diagrams/: SVG เอกสารที่แสดงกรอบภาพ collision และ depth ด้วยข้อมูลจริง
- build_catalog.py: สร้างตัวอย่างจาก source ใน Editor เขียนเฉพาะโฟลเดอร์นี้ การรันใหม่เขียนทับเอกสารตัวอย่าง

Profile ใช้ Editor32-v1 จาก [MapStandard.md](../MapStandard.md) ค่าที่ขาดระบุ unresolved ชุดนี้ไม่เพิ่มหรือแก้ TMJ, TSJ, asset catalog หรือ config ที่เกมใช้

ตรวจขนาด PNG, geometry และ link ภายในก่อนส่งมอบ การทดสอบภาพ/physics ในเกมต้องทำอีกขั้นก่อนใช้สถานะ runtime-validated
''', encoding='utf-8')
print(json.dumps({'output':str(OUT),'objects':objects,'booth_scale':booth_scale,'image_count':len(list(IMAGES.glob('*.png'))),'diagram_count':len(list(DIAGRAMS.glob('*.svg')))},ensure_ascii=False))
