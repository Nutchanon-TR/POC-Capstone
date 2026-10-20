from pathlib import Path
from PIL import Image,ImageDraw
import json, argparse
parser=argparse.ArgumentParser(description="Assemble an event-starter room from existing native sprites and anchors.")
parser.add_argument("--output-dir",required=True,type=Path,help="Pack directory containing inventory.json")
R=parser.parse_args().output_dir.resolve()
if not (R/"inventory.json").is_file():parser.error("Missing inventory.json in output directory")
M=json.loads((R/"inventory.json").read_text())
modules={m["id"]:m for m in M["map_components"]}
assets={m["id"]:m for m in M["assets"]}
scene=Image.new("RGBA",(384,352),(58,58,70,255))
def load_sprite(name,group):
    record=assets[name] if group=="assets" else modules[name]
    location=record.get("image_path")
    if location:
        path=Path(location)
        if not path.is_absolute():path=R/path
    else:
        path=R/group/"individual"/(name+".png")
    return Image.open(path)
def comp(name,c,r):
    im=load_sprite(name,"map-components")
    ax,ay=modules[name]["ground_origin"]
    scene.alpha_composite(im,(64+c*32+16-ax,96+r*32+16-ay))
for r in range(5):
    for c in range(6):
        scene.alpha_composite(load_sprite("floor-wood-center","map-components"),(64+c*32,96+r*32))
for c in range(6):
    name="wall-wood-n"
    if c==0:name="wall-wood-corner-nw"
    elif c==5:name="wall-wood-corner-ne"
    elif c==2:name="door-single-down"
    elif c==3:name="glass-h"
    comp(name,c,0)
for r in range(1,4):
    comp("wall-wood-w",0,r);comp("wall-wood-e",5,r)
def asset(name,x,y):
    im=load_sprite(name,"assets")
    ax,ay=assets[name]["anchor"]
    scene.alpha_composite(im,(x-ax,y-ay))
asset("plant-medium",112,154)
asset("bookcase-down",220,163)
asset("chair-wood-up",148,180)
asset("table-short-h",148,204)
asset("chair-wood-down",148,220)
asset("armchair-down",224,228)
for c in range(6):
    name="wall-wood-s"
    if c==0:name="wall-wood-corner-sw"
    elif c==5:name="wall-wood-corner-se"
    comp(name,c,4)
scene.resize((768,704),Image.Resampling.NEAREST).save(R/"assembly-preview.png")
repeat_dir=R/("structure" if (R/"structure").is_dir() else "map-components")
repeat_dir.mkdir(exist_ok=True)
for material in ["wood","mint","carpet"]:
    tile=load_sprite("floor-"+material+"-center","map-components")
    repeat=Image.new("RGBA",(96,96))
    for r in range(3):
        for c in range(3):repeat.alpha_composite(tile,(c*32,r*32))
    repeat.resize((384,384),Image.Resampling.NEAREST).save(repeat_dir/("repeat-check-"+material+".png"))
print("Assembly and 3x3 repeat previews saved.")
