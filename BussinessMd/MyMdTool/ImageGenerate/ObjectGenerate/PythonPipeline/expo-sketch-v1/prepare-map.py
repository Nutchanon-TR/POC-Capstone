"""Build the sketch's Tiled map from existing sprites and two generated props.

Raw generation is preserved in source/. All runtime art uses one native pixel
unit, the sample pack's shared 24-color palette, and binary transparency.
Run with the bundled Python (Pillow + NumPy). No image API is called here.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse
import hashlib
import json
import shutil
import zipfile
import numpy as np

ROOT = Path(__file__).resolve().parent
SAMPLE = ROOT.parent / "sample-source"
PROJECT = ROOT.parents[5] / "POC-Phaser" / "Project"
parser = argparse.ArgumentParser()
parser.add_argument("--project", type=Path, default=PROJECT)
args = parser.parse_args()
PUBLIC = args.project / "public" / "assets" / "expo"
PACK = ROOT / "bundle"
PACK.mkdir(exist_ok=True)
DATA = json.loads((SAMPLE / "inventory.json").read_text(encoding="utf8"))
PALETTE = DATA["palette"]
COLORS = [tuple(bytes.fromhex(c)) for c in PALETTE]
lookup = {x["id"]: x for x in DATA["assets"] + DATA["map_components"]}
records = []
images = {}

def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf8")

def register(name, image, kind, anchor, footprint, source, generated=False):
    folder = "props" if kind == "prop" else "structure"
    location = f"{folder}/{name}.png"
    (PACK / folder).mkdir(exist_ok=True)
    image.save(PACK / location)
    images[name] = image
    record = {"id": name, "kind": kind, "image": location,
              "width": image.width, "height": image.height,
              "anchor": list(anchor), "footprint": list(footprint),
              "source": str(source), "generated": generated}
    records.append(record)
    return record

def reuse(name, kind):
    record = lookup[name]
    path = SAMPLE / record["image_path"]
    im = Image.open(path).convert("RGBA")
    anchor = record.get("anchor", record.get("ground_origin", [0, 0]))
    return register(name, im, kind, anchor, record.get("footprint", [32, 32]), path)

for name in ["table-long-v", "table-short-v", "chair-padded-left", "chair-padded-right",
             "sofa-down", "sofa-up", "plant-small", "plant-medium", "tree-rounded",
             "board-front", "bin-sort"]:
    reuse(name, "prop")
for name in ["floor-mint-center", "floor-wood-center", "wall-mint-n", "wall-mint-s",
             "wall-mint-e", "wall-mint-w", "wall-mint-corner-nw", "wall-mint-corner-ne",
             "wall-mint-corner-sw", "wall-mint-corner-se", "door-double-open"]:
    reuse(name, "floor" if name.startswith("floor") else "structure")

# A quiet structural floor, constructed on the same grid/material ramps as
# the reference modules. This does not replace generated prop artwork.
ivory = Image.new("RGBA", (32,32), "#eee5cc")
draw = ImageDraw.Draw(ivory)
draw.line((0,0,31,0), fill="#d2c1a5")
draw.line((0,31,31,31), fill="#d2c1a5")
draw.line((0,0,0,31), fill="#d2c1a5")
draw.line((31,0,31,31), fill="#d2c1a5")
register("floor-ivory-center",ivory,"floor",[0,0],[32,32],Path(__file__))

def clean_generated(name, width, footprint):
    path = ROOT / "source" / (name + ".png")
    raw = Image.open(path).convert("RGBA")
    alpha = raw.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"Empty generated image: {name}")
    raw.putalpha(alpha)
    cropped = raw.crop(bbox)
    height = round(cropped.height * width / cropped.width)
    native = cropped.resize((width, height), Image.Resampling.NEAREST)
    palette = Image.new("P", (1, 1))
    palette.putpalette([v for c in COLORS + [COLORS[-1]] * (256-len(COLORS)) for v in c])
    color = native.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE).convert("RGBA")
    color.putalpha(native.getchannel("A"))
    padded = Image.new("RGBA", (width + 4, height + 4))
    padded.alpha_composite(color, (2, 2))
    record = register(name, padded, "prop", [padded.width // 2, padded.height - 3], footprint, path, True)
    record["source_crop"] = list(bbox)
    record["uniform_scale"] = width / cropped.width
    return record

clean_generated("expo-booth-counter", 112, [112, 48])
clean_generated("expo-registration-desk", 192, [192, 48])
by_id = {r["id"]: r for r in records}
gid = {r["id"]: i + 1 for i, r in enumerate(records)}

def props(values):
    return [{"name": k, "type": "bool" if isinstance(v, bool) else "int" if isinstance(v, int) else "string", "value": v}
            for k, v in values.items()]

tiles = []
for i, r in enumerate(records):
    local = {"assetKey": r["id"], "kind": r["kind"], "depthY": r["anchor"][1],
             "anchorX": r["anchor"][0], "anchorY": r["anchor"][1]}
    tile = {"id": i, "image": r["image"], "imagewidth": r["width"], "imageheight": r["height"], "properties": props(local)}
    if r["kind"] == "prop":
        fw, fh = r["footprint"]
        fw = min(fw, r["width"] - 4)
        fh = min(fh // 2, r["height"] - 4)
        tile["objectgroup"] = {"type": "objectgroup", "objects": [{"id": 1, "x": (r["width"] - fw) // 2,
            "y": max(0, r["anchor"][1] - fh), "width": fw, "height": fh, "rotation": 0}]}
    tiles.append(tile)
tsj = {"type": "tileset", "name": "expo-sketch", "version": "1.10", "tiledversion": "1.11.2",
       "objectalignment": "topleft", "tilewidth": max(r["width"] for r in records),
       "tileheight": max(r["height"] for r in records), "tilecount": len(tiles), "columns": 0, "tiles": tiles}
save_json(PACK / "expo.tsj", tsj)

W, H, TILE = 42, 26, 32
layers = []
lid, oid = 1, 1
def layer(name, objects, visible=True, metadata=None):
    global lid
    l = {"id": lid, "name": name, "type": "objectgroup", "objects": objects,
         "visible": visible, "opacity": 1, "x": 0, "y": 0, "draworder": "topdown"}
    if metadata:
        l["properties"] = props(metadata)
    layers.append(l)
    lid += 1
    return objects

floor = [0] * (W * H)
for y in range(2, 25):
    for x in range(1, 41):
        floor[y * W + x] = gid["floor-ivory-center"]
layers.append({"id": lid, "name": "Floor", "type": "tilelayer", "width": W, "height": H,
               "data": floor, "x": 0, "y": 0, "opacity": 1, "visible": True})
lid += 1
fixtures = layer("Structures and furniture", [])
zones = layer("Areas", [], False)
colliders = layer("Collision", [], False)
spawn = layer("Spawn", [], False)

def object_(name, type_, x, y, w, h, extra=None):
    global oid
    value = {"id": oid, "name": name, "type": type_, "x": x, "y": y, "width": w, "height": h,
             "rotation": 0, "visible": True}
    if extra:
        value["properties"] = props(extra)
    oid += 1
    return value

def put(name, x, y, instance="", section="", surface_depth=None):
    """Position by ground anchor; persist top-left tile-object geometry in TMJ."""
    r = by_id[name]
    extra = {"areaId":section} if section else {}
    if surface_depth is not None: extra["renderDepth"] = surface_depth
    value = object_(instance or name, "Fixture", x-r["anchor"][0], y-r["anchor"][1], r["width"], r["height"],extra)
    value["gid"] = gid[name]
    fixtures.append(value)
    return value

def area(id_, title, code, kind, x, y, w, h, description):
    zones.append(object_(id_, "Area", x, y, w, h, {"title": title, "code": code, "kind": kind, "description": description}))

def floor_rect(x, y, w, h, material="wood"):
    for row in range(y // 32, (y+h)//32):
        for col in range(x // 32, (x+w)//32):
            floor[row*W + col] = gid[f"floor-{material}-center"]

# A 96px structural sprite is positioned by its shared ground origin. Do not
# treat its transparent top padding as an additional world tile.
for c in range(1, 41):
    if c in (4, 5):
        continue
    for row, direction in [(2, "n"), (24, "s")]:
        name = f"wall-mint-{direction}"
        if c in (1, 40):
            name = f"wall-mint-corner-{direction}{'w' if c==1 else 'e'}"
        put(name, c*32+16, row*32+16)
for row in range(3, 24):
    put("wall-mint-w", 48, row*32+16)
    put("wall-mint-e", 1296, row*32+16)
put("door-double-open", 160, 80, "north-door")
put("door-double-open", 160, 784, "south-door")
for x, y, w, h in [(32,64,96,16),(192,64,1120,16),(32,768,96,16),(192,768,1120,16),
                    (32,80,16,688),(1280,80,16,688)]:
    colliders.append(object_("room-wall", "Collider", x, y, w, h))

booths = [("booth-01", "บูธ 01", "01", 608, 128, 192, 160),
          ("booth-02", "บูธ 02", "02", 864, 128, 192, 160),
          ("booth-03", "บูธ 03", "03", 1120, 352, 160, 160),
          ("booth-04", "บูธ 04", "04", 608, 608, 192, 160),
          ("booth-05", "บูธ 05", "05", 864, 608, 224, 160)]
for id_, title, code, x, y, w, h in booths:
    floor_rect(x, y, w, h)
    # Open front and half-height side returns. Repeated native wall modules
    # retain their sockets; no flattened room image or stretched booth sprite.
    for c in range(w // 32):
        name = "wall-mint-n"
        if c == 0:
            name = "wall-mint-corner-nw"
        elif c == w//32-1:
            name = "wall-mint-corner-ne"
        put(name, x+c*32+16, y+16, section=id_)
    for row in range(1, 3):
        put("wall-mint-w", x+16, y+row*32+16, section=id_)
        put("wall-mint-e", x+w-16, y+row*32+16, section=id_)
    put("expo-booth-counter", x+w//2, y+128, id_+"-counter", id_)
    put("plant-small", x+w-40, y+56, section=id_)
    area(id_, title, code, "booth", x, y, w, h, "พื้นที่บูธแบบเปิดด้านหน้า มีเคาน์เตอร์แสดงงานและจุดวางอุปกรณ์")
    colliders.append(object_(id_+"-wall", "Collider", x, y, w, 16))
    colliders.append(object_(id_+"-side-left", "Collider", x, y+16, 16, 80))
    colliders.append(object_(id_+"-side-right", "Collider", x+w-16, y+16, 16, 80))

put("table-long-v", 304, 288, "decorative-table")
put("plant-small", 304, 214, "table-plant-1", surface_depth=289)
put("plant-small", 304, 260, "table-plant-2", surface_depth=290)
area("decor-table", "โต๊ะตกแต่ง", "", "decor", 272, 176, 64, 128, "โต๊ะไม้แนวตั้งพร้อมต้นไม้ อยู่ฝั่งซ้ายตามสเก็ตช์")
put("expo-registration-desk", 224, 448, "registration-desk")
area("registration", "ลงทะเบียน", "", "registration", 112, 352, 256, 128, "โต๊ะลงทะเบียนสองช่องบริการ อยู่ฝั่งซ้ายของห้อง")
floor_rect(576,352,320,192,"mint")
for i, (x, y, name) in enumerate([(656,416,"sofa-down"),(816,416,"sofa-down"),
                                 (656,512,"sofa-up"),(816,512,"sofa-up")]):
    put(name, x, y, f"lounge-sofa-{i+1}")
area("lounge", "มุมนั่งพัก", "", "lounge", 592, 352, 288, 192, "โซฟาสี่ตัววางเป็นสองแถว หันเข้าหาพื้นที่พักกลางห้อง")
put("table-short-v", 392, 736, "dining-table")
for i, (x, y, name) in enumerate([(340,674,"chair-padded-right"),(340,728,"chair-padded-right"),
                                 (444,674,"chair-padded-left"),(444,728,"chair-padded-left")]):
    put(name, x, y, f"dining-chair-{i+1}")
area("dining", "โต๊ะพูดคุย", "", "dining", 312, 640, 160, 112, "โต๊ะไม้หนึ่งตัวกับเก้าอี้สี่ตัว อยู่ด้านล่างซ้าย")
put("tree-rounded", 1200, 256, "northeast-tree")
area("tree", "ต้นไม้", "", "decor", 1152, 128, 96, 128, "ต้นไม้ในกระถางมุมขวาบน")
area("north-entrance", "ประตูด้านบน", "", "entrance", 128, 64, 64, 64, "ทางเข้าออกด้านบนซ้าย")
area("south-entrance", "ประตูด้านล่าง", "", "entrance", 128, 736, 64, 64, "ทางเข้าออกด้านล่างซ้าย")
spawn.append(object_("Spawn_Player", "Spawn", 160, 736, 0, 0))
spawn[-1]["point"] = True
tmj = {"type": "map", "orientation": "orthogonal", "renderorder": "right-down", "infinite": False,
       "width": W, "height": H, "tilewidth": TILE, "tileheight": TILE, "version": "1.10", "tiledversion": "1.11.2",
       "nextlayerid": lid, "nextobjectid": oid, "layers": layers, "tilesets": [{"firstgid": 1, "source": "expo.tsj"}],
       "properties": props({"profile": "ProjectExpo32-v1", "title": "Connecta Exhibition", "blueprint": "user-sketch",
                            "minimumWalkway": 64, "mode": "map-only"})}
save_json(PACK / "expo.tmj", tmj)
save_json(ROOT / "inventory.json", {"profile": "ProjectExpo32-v1", "tileSize":32, "nativePixelWorldSize":1,
                                  "palette": PALETTE, "assets": records, "requiredCounts": {"booths":5,"sofas":4,"diningChairs":4,"doors":2}})

# Pixel/file QA and an assembled preview use exactly the files served by Phaser.
report = {}
for r in records:
    im = images[r["id"]]
    a = np.array(im)
    visible = {tuple(c) for c in a[a[:,:,3]>0][:,:3]}
    assert set(np.unique(a[:,:,3])).issubset({0,255}), r["id"]
    assert visible.issubset(set(COLORS)), (r["id"], visible-set(COLORS))
    report[r["id"]] = {"size": list(im.size), "colors":len(visible), "binaryAlpha":True, "paletteSubset":True}
for name in ["floor-mint-center","floor-wood-center","floor-ivory-center"]:
    arr=np.array(images[name])
    assert np.array_equal(arr[:,0],arr[:,-1]) and np.array_equal(arr[0],arr[-1]), name
    repeat = Image.new("RGBA", (96,96))
    for y in range(3):
        for x in range(3): repeat.alpha_composite(images[name], (x*32,y*32))
    repeat.resize((384,384),Image.Resampling.NEAREST).save(ROOT/(name+"-repeat.png"))
canvas = Image.new("RGBA", (W*TILE,H*TILE), "#292936")
for i, v in enumerate(floor):
    if v: canvas.alpha_composite(images[records[v-1]["id"]], ((i%W)*32,(i//W)*32))
def render_depth(o):
    return next((p["value"] for p in o.get("properties",[]) if p["name"]=="renderDepth"),o["y"]+records[o["gid"]-1]["anchor"][1])
for fixture in sorted(fixtures, key=render_depth):
    canvas.alpha_composite(images[records[fixture["gid"]-1]["id"]], (int(fixture["x"]),int(fixture["y"])))
canvas.save(ROOT / "assembly-preview-native.png")
canvas.resize((W*TILE*2,H*TILE*2),Image.Resampling.NEAREST).save(ROOT/"assembly-preview-2x.png")
def board(kind):
    group=[r for r in records if (r["kind"]=="prop") == (kind=="props")]
    cell = 224 if kind == "props" else 128
    im=Image.new("RGBA", (cell*4,160*((len(group)+3)//4)))
    for i,r in enumerate(group):
        sprite=images[r["id"]]
        im.alpha_composite(sprite,((i%4)*cell+(cell-sprite.width)//2,(i//4)*160+144-sprite.height))
    im.save(ROOT/(kind+"-native.png"))
    im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST).save(ROOT/(kind+"-2x.png"))
board("props")
board("structure")
save_json(ROOT/"file-audit.json", {"files":report, "floorRepeat3x3":True,
         "sourceHashes":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/"source").glob("*.png")},
         "runtimeCollisionAndCharacterDepth":"pending: map-only, no character"})
PUBLIC.mkdir(parents=True,exist_ok=True)
shutil.copytree(PACK,PUBLIC,dirs_exist_ok=True)
save_json(args.project/"src/game/assets/expo-manifest.json", [{"key":"expo:"+r["id"],"path":"/assets/expo/"+r["image"]} for r in records])
with zipfile.ZipFile(ROOT/"expo-tiled.zip","w",zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(PACK.rglob("*")):
        if path.is_file(): bundle.write(path,path.relative_to(PACK).as_posix())
shutil.copy2(ROOT/"expo-tiled.zip",PUBLIC/"expo-tiled.zip")
print(json.dumps({"output":str(ROOT),"runtimeBundle":str(PUBLIC),"assets":len(records),"fixtures":len(fixtures),"zones":len(zones)}))
