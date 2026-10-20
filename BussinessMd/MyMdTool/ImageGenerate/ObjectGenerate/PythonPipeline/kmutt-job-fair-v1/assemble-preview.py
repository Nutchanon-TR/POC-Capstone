from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, shutil

ROOT=Path(__file__).resolve().parent
PUBLIC=Path(r'D:/A_SIT04/SIT4-TERM1/a_M_CapStone/POC-Phaser/Editor/public/maps/kmutt')
doc=json.loads((PUBLIC/'map.tmj').read_text(encoding='utf8'))
tileset=json.loads((PUBLIC/'expo.tsj').read_text(encoding='utf8'))
tiles={t['id']+1:t for t in tileset['tiles']}
images={gid:Image.open(PUBLIC/t['image']).convert('RGBA') for gid,t in tiles.items()}
def properties(obj): return {p['name']:p['value'] for p in obj.get('properties',[])}
native=Image.new('RGBA',(doc['width']*32,doc['height']*32),'#eee5cc')
objects=[]
def walk(layers,ox=0,oy=0):
    for layer in layers:
        x=ox+layer.get('offsetx',0);y=oy+layer.get('offsety',0)
        if layer['type']=='group':walk(layer['layers'],x,y)
        elif layer['type']=='tilelayer':
            for index,gid in enumerate(layer['data']):
                if gid:native.alpha_composite(images[gid],(int(x+index%layer['width']*32),int(y+index//layer['width']*32)))
        else:
            for obj in layer.get('objects',[]):
                if not obj.get('gid'):continue
                tile=tiles[obj['gid']];meta=properties(tile);p=properties(obj)
                depth=-1000 if meta.get('ground') else p.get('renderDepth',y+obj['y']+p.get('depthY',meta.get('depthY',tile['imageheight']))*obj['height']/tile['imageheight'])
                objects.append((depth,x+obj['x'],y+obj['y'],obj))
walk(doc['layers'])
for depth,x,y,obj in sorted(objects,key=lambda o:o[0]):
    image=images[obj['gid']]
    assert (obj['width'],obj['height'])==image.size, obj['name']
    native.alpha_composite(image,(round(x),round(y)))
native.save(ROOT/'assembly-native.png')
native.resize((native.width*2,native.height*2),Image.Resampling.NEAREST).save(ROOT/'assembly-preview-2x.png')
native.save(PUBLIC/'preview-native.png')
preview=Image.new('RGB',(1392,1104),'#f6f0df')
preview.paste(native.resize((1280,896),Image.Resampling.NEAREST).convert('RGB'),(56,112))
draw=ImageDraw.Draw(preview)
font=lambda size,bold=False: ImageFont.truetype('C:/Windows/Fonts/'+('consolab.ttf' if bold else 'consola.ttf'),size)
draw.text((56,24),'KMUTT  /  JOB FAIR',font=font(35,True),fill='#34494b')
draw.text((56,68),'12 company booths   ·   6 interview pods   ·   6 workshop tables   ·   70 stage seats',font=font(17),fill='#84725e')
labels=[('1  REGISTRATION',96,1336),('2  JOBSEEKER ZONE',608,752),('3  FOOD & BEVERAGE',96,80),('4  INTERVIEW AREA',736,80),('5  WORKSHOP AREA',1536,1264),('6  MAIN STAGE',1728,16)]
for text,x,y in labels:
    px=56+x//2;py=112+y//2
    box=draw.textbbox((px+10,py+5),text,font=font(15,True))
    draw.rounded_rectangle((px,py,box[2]+10,py+29),radius=5,fill='#34494b')
    draw.text((px+10,py+5),text,font=font(15,True),fill='#eee5cc')
draw.text((56,1030),'Entrance → Registration → Company booths → Interview / Workshop → Main stage',font=font(17),fill='#34494b')
draw.text((56,1064),'Shared cream, muted green and warm wood materials.  Clear circulation between all six event areas.',font=font(16),fill='#84725e')
preview.save(ROOT/'overview.png');preview.save(PUBLIC/'overview.png')
print(f'Assembled {len(objects)} real sprites at native scale; overview: {PUBLIC / "overview.png"}')
