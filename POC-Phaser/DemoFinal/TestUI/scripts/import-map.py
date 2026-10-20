from pathlib import Path
from PIL import Image
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = (ROOT / 'assets/maps/exhibition').resolve()
TARGET.mkdir(parents=True, exist_ok=True)
SOURCE = Path(r'D:\Downloads\map-tiled (2).zip')
with zipfile.ZipFile(SOURCE) as archive:
    for item in archive.infolist():
        destination = (TARGET / item.filename).resolve()
        if not destination.is_relative_to(TARGET):
            raise ValueError('Unsafe archive entry')
        if not item.is_dir():
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(item))

def props(value):
    return {p['name']:p['value'] for p in value.get('properties', [])}

m = json.loads((TARGET/'map.tmj').read_text(encoding='utf-8'))
t = json.loads((TARGET/'tilesets/map.tsj').read_text(encoding='utf-8'))
tiles = {tile['id']+m['tilesets'][0]['firstgid']:tile for tile in t['tiles']}
floor = next(layer for layer in m['layers'] if layer['type']=='tilelayer')
floor_gids = sorted(set(floor['data'])-{0})
atlas = Image.new('RGBA',(32*len(floor_gids),32))
for i, gid in enumerate(floor_gids):
    tile = tiles[gid]
    atlas.paste(Image.open(TARGET/'tilesets'/tile['image']),(i*32,0))
atlas.save(TARGET/'floor-atlas.png')
collisions=[]
sprites=[]
areas=[]
spawn={'x':160,'y':736}
for layer in m['layers']:
    ox,oy=layer.get('offsetx',0),layer.get('offsety',0)
    if layer['name']=='Collision':
        collisions += [{'x':o['x']+ox,'y':o['y']+oy,'width':o['width'],'height':o['height']} for o in layer['objects']]
    elif layer['name']=='Areas':
        areas=[{'id':o['name'],'x':o['x']+ox,'y':o['y']+oy,'width':o['width'],'height':o['height'],'kind':props(o).get('kind',''),'code':props(o).get('code','')} for o in layer['objects']]
    elif layer['name']=='Spawn':
        spawn={'x':layer['objects'][0]['x']+ox,'y':layer['objects'][0]['y']+oy}
    elif layer['type']=='objectgroup':
        for obj in layer['objects']:
            if 'gid' not in obj or not obj.get('visible',True): continue
            tile=tiles[obj['gid']]
            tp,op=props(tile),props(obj)
            sx,sy=obj['width']/tile['imagewidth'],obj['height']/tile['imageheight']
            x,y=obj['x']+ox,obj['y']+oy
            interactive=op.get('interactEnabled',tp.get('interactable',False))
            sprites.append({'id':obj['id'],'name':obj['name'],'gid':obj['gid'],'x':x,'y':y,'width':obj['width'],'height':obj['height'],'depth':op.get('renderDepth',y+tp.get('depthY',tile['imageheight'])*sy),'interactable':interactive,'kind':op.get('interactKind',tp.get('interactKind','')),'bounds':{'x':x+op.get('interactX',0)*sx,'y':y+op.get('interactY',0)*sy,'width':op.get('interactWidth',tile['imagewidth'])*sx,'height':op.get('interactHeight',tile['imageheight'])*sy}})
            for box in tile.get('objectgroup',{}).get('objects',[]):
                collisions.append({'x':x+box['x']*sx,'y':y+box['y']*sy,'width':box['width']*sx,'height':box['height']*sy})

data={'width':m['width']*m['tilewidth'],'height':m['height']*m['tileheight'],'tileWidth':m['tilewidth'],'columns':m['width'],'rows':m['height'],'floor':[-1 if gid==0 else floor_gids.index(gid) for gid in floor['data']],'tiles':[{'gid':gid,'image':'assets/maps/exhibition/images/'+Path(tile['image']).name} for gid,tile in tiles.items()],'sprites':sprites,'collisions':collisions,'areas':areas,'spawn':spawn}
(TARGET/'runtime.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
# Static minimap derived only from the supplied PNGs and original placement data.
preview=Image.new('RGBA',(data['width'],data['height']),(224,232,225,255))
for index,gid in enumerate(floor['data']):
    if gid:preview.alpha_composite(Image.open(TARGET/'tilesets'/tiles[gid]['image']).convert('RGBA'),((index%m['width'])*32,(index//m['width'])*32))
for obj in sorted(sprites,key=lambda s:s['depth']):
    im=Image.open(TARGET/'tilesets'/tiles[obj['gid']]['image']).convert('RGBA')
    if im.size!=(round(obj['width']),round(obj['height'])):im=im.resize((round(obj['width']),round(obj['height'])),Image.Resampling.NEAREST)
    preview.alpha_composite(im,(round(obj['x']),round(obj['y'])))
preview.save(TARGET/'minimap.png')
print(f"Imported {data['width']}x{data['height']} map, {len(sprites)} placed objects, {len(collisions)} collision rectangles, {len(areas)} areas.")
