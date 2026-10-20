from pathlib import Path
from PIL import Image
import json, hashlib, shutil
ROOT=Path(__file__).resolve().parent
BASE=Path(r"D:/A_SIT04/SIT4-TERM1/a_M_CapStone/POC-Phaser")
palette=json.loads((ROOT.parent/"sample-source/inventory.json").read_text(encoding="utf8"))["palette"]
pal=Image.new("P",(1,1)); colors=[v for c in palette for v in bytes.fromhex(c)]
pal.putpalette(colors+[0]*(768-len(colors)))
inventory=[]
images={}
for name,width in [("expo-cloth-table",112),("expo-computer",28),("expo-documents",16)]:
    raw=Image.open(ROOT/"source"/(name+".png")).convert("RGBA")
    alpha=raw.getchannel("A").point(lambda v:255 if v>=128 else 0)
    raw.putalpha(alpha); bbox=alpha.getbbox()
    if not bbox: raise ValueError(name)
    crop=raw.crop(bbox); height=round(crop.height*width/crop.width)
    native=crop.resize((width,height),Image.Resampling.NEAREST)
    result=native.convert("RGB").quantize(palette=pal,dither=Image.Dither.NONE).convert("RGBA")
    result.putalpha(native.getchannel("A"))
    im=Image.new("RGBA",(width+4,height+4)); im.alpha_composite(result,(2,2))
    out=ROOT/"bundle/props"/(name+".png"); out.parent.mkdir(parents=True,exist_ok=True); im.save(out)
    images[name]=im
    inventory.append(dict(id=name,width=im.width,height=im.height,source_crop=bbox,palette=palette,alpha_values=sorted(set(im.getchannel("A").getdata())),sha256=hashlib.sha256(out.read_bytes()).hexdigest()))
    for dest in [BASE/"Editor/public/starter/props",BASE/"Project/public/assets/expo/props"]:
        dest.mkdir(parents=True,exist_ok=True); shutil.copy2(out,dest/out.name)
preview=Image.new("RGBA",(128,100))
preview.alpha_composite(images["expo-cloth-table"],(6,44))
preview.alpha_composite(images["expo-computer"],(74,13))
preview.alpha_composite(images["expo-documents"],(30,36))
preview.save(ROOT/"assembly-native.png")
preview.resize((768,600),Image.Resampling.NEAREST).save(ROOT/"assembly-preview-6x.png")
(ROOT/"inventory.json").write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding="utf8")
print(json.dumps(inventory))

