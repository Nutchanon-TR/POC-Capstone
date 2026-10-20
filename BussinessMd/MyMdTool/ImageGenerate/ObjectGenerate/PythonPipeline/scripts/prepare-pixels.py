from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pathlib import Path
import json, math, argparse

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "source"
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare the event-starter pixel pack. Counts/layout are template-specific.")
    parser.add_argument("--output-dir", required=True, type=Path, help="New output directory for this run")
    parser.add_argument("--source-dir", type=Path, default=ROOT.parent / "sample-source", help="Directory containing furniture.png and decor.png")
    args = parser.parse_args()
    ROOT = args.output_dir.resolve()
    SOURCE = args.source_dir.resolve()
    if ROOT == SOURCE or SOURCE.is_relative_to(ROOT):
        parser.error("Output directory must be separate from and must not contain the source directory")
    for name in ["furniture.png", "decor.png"]:
        if not (SOURCE / name).is_file():
            parser.error("Missing source image: " + str(SOURCE / name))
    if (ROOT / "inventory.json").exists():
        parser.error("This output already contains a pack. Choose a new output directory to preserve it")
    ROOT.mkdir(parents=True, exist_ok=True)
HEX = ["292936","46364b","614854","855749","b17a54","d5a06b","eed2a0","594e55","84725e","b29b7c","d2c1a5","eee5cc","34494b","4b6656","74885d","a7b477","38435b","596881","909aa6","596d80","86a5ad","bed0ca","b75f65","d6ad57"]
PAL = [tuple(bytes.fromhex(c)) + (255,) for c in HEX]
RGB = np.array([p[:3] for p in PAL], dtype=np.int16)
O = PAL[0]
RAMPS = {"wood":[1,3,4,5,6], "darkwood":[0,7,8,9,10], "green":[0,12,13,14,15], "metal":[0,16,17,18,21], "stone":[1,7,10,11,6], "glass":[0,19,20,21,11], "coral":[1,2,22,22,23]}
manifest = {"profile":"Editor32-v1", "world_tile":32, "native_pixel_world_size":1, "palette":HEX, "character_visible_height_estimate":64, "character_scale_is_not_changed":True, "assets":[], "map_components":[]}
GROUND_Y = .75

def box(parts,x0,y0,z0,x1,y1,z1,mat="wood",mark=None):
    parts.append([x0,y0,z0,x1,y1,z1,mat,mark])

def turn(x,y, direction):
    return {"down":(x,y),"up":(-x,-y),"left":(y,-x),"right":(-y,x)}[direction]

def projection(x,y,z):
    return round(128+x), round(160+GROUND_Y*y-0.5*z)

def render(parts, direction="down", strokes=()):
    transformed=[]
    for x0,y0,z0,x1,y1,z1,mat,mark in parts:
        xy=[turn(x,y,direction) for x,y in [(x0,y0),(x0,y1),(x1,y0),(x1,y1)]]
        xs,ys=zip(*xy)
        transformed.append([min(xs),min(ys),z0,max(xs),max(ys),z1,mat,mark])
    im=Image.new("RGBA",(256,256))
    pixels=np.zeros((256,256,4),dtype=np.uint8)
    depthbuffer=np.full((256,256),-np.inf)
    rows=np.arange(256)-160
    def paint_face(vertices,ramp,plane,value,highlight=False):
        layer=Image.new("RGBA",(256,256));ld=ImageDraw.Draw(layer)
        ld.polygon(vertices,fill=PAL[ramp[3] if plane=="z" else ramp[2]],outline=PAL[ramp[0]])
        if plane=="y":
            ymin=min(pt[1] for pt in vertices);ymax=max(pt[1] for pt in vertices)
            xmin=min(pt[0] for pt in vertices);xmax=max(pt[0] for pt in vertices)
            if ymax-ymin>=5 and xmax-xmin>=3:
                ld.rectangle((xmin+1,ymax-max(2,(ymax-ymin)//3),xmax-1,ymax-1),fill=PAL[ramp[1]])
        elif highlight and len(vertices)>1:
            a,b=vertices[0],vertices[1]
            if b[0]-a[0]>3:ld.line((a[0]+1,a[1]+1,b[0]-1,b[1]+1),fill=PAL[ramp[4]])
        arr=np.array(layer)
        if plane=="z":
            y=(rows+.5*value)/GROUND_Y;dep=.5*y+GROUND_Y*value
        else:
            z=(GROUND_Y*value-rows)/.5;dep=.5*value+GROUND_Y*z
        depth=np.broadcast_to(dep[:,None],(256,256))
        visible=(arr[:,:,3]>0)&(depth>=depthbuffer-0.001)
        pixels[visible]=arr[visible];depthbuffer[visible]=depth[visible]
    for x0,y0,z0,x1,y1,z1,mat,mark in transformed:
        ramp=RAMPS[mat]
        # Cuboid ranges are half-open. Last occupied raster coordinate is x1/y1-1.
        xr=max(x0,x1-1); yr=max(y0,y1-1)
        front=[projection(x0,yr,z0),projection(xr,yr,z0),projection(xr,yr,z1),projection(x0,yr,z1)]
        top=[projection(x0,y0,z1),projection(xr,y0,z1),projection(xr,yr,z1),projection(x0,yr,z1)]
        paint_face(front,ramp,"y",yr)
        paint_face(top,ramp,"z",z1,True)
    im=Image.fromarray(pixels);d=ImageDraw.Draw(im)
    for a,b,c in strokes:
        a=(*turn(a[0],a[1],direction),a[2]); b=(*turn(b[0],b[1],direction),b[2])
        d.line([projection(*a),projection(*b)],fill=PAL[c])
    bounds=im.getbbox()
    assert bounds
    base=max((p[4]-1 for p in transformed if p[2]==0),default=0)
    foot=projection(0,base,0)
    return im.crop(bounds), (foot[0]-bounds[0],foot[1]-bounds[1])

def table(w,dep,kind="wood"):
    p=[]; mat="wood"
    for x in [-w/2+4,w/2-8]:
        for y in [-dep/2+4,dep/2-8]:
            box(p,x,y,0,x+4,y+4,28,"metal" if kind=="folding" else mat)
    box(p,-w/2,-dep/2,26,w/2,dep/2,30,mat)
    strokes=[]
    for y in range(round(-dep/2+8),round(dep/2),8):
        strokes.append(((-w/2+2,y,30),(w/2-2,y,30),4))
    strokes += [((-w/4,0,30),(-w/4+3,0,30),3),((w/5,5,30),(w/5+2,5,30),5)]
    if kind=="folding":
        box(p,-w/2+8,-dep/2+3,6,w/2-8,-dep/2+5,10,"metal")
    return p,strokes

def chair(kind):
    p=[]; size=32
    for x in [-14,10]:
        for y in [-14,10]:
            box(p,x,y,0,x+4,y+4,18)
    box(p,-16,-16,17,16,16,21)
    for x in [-16,12]:
        box(p,x,-16,18,x+4,-12,42)
    if kind=="wood":
        for z in [23,31,39]:
            box(p,-12,-16,z,12,-12,z+3)
    else:
        box(p,-12,-16,22,12,-12,40)
        box(p,-13,-11,24,13,-9,39,"green","seam")
        box(p,-13,-12,21,13,13,24,"green","seam")
    return p

def couch(w=96, dep=40, n=2):
    p=[]
    for x in [-w/2+3,w/2-8]:
        for y in [-dep/2+3,dep/2-8]:
            box(p,x,y,0,x+5,y+5,15)
    box(p,-w/2,-dep/2,14,w/2,dep/2,18)
    box(p,-w/2,-dep/2,18,w/2,-dep/2+6,46)
    for x in [-w/2,w/2-6]:
        box(p,x,-dep/2,17,x+6,dep/2,33)
    span=(w-14)/n
    for i in range(n):
        x=-w/2+7+i*span
        box(p,x,-dep/2+7,18,x+span-2,dep/2-3,24,"green","seam")
        box(p,x,-dep/2+7,26,x+span-2,-dep/2+10,43,"green","seam")
    return p

def bench():
    p=[]
    for x in [-44,40]:
        for y in [-14,10]:
            box(p,x,y,0,x+4,y+4,20,"darkwood")
    for y in [-16,-5,6]:
        box(p,-48,y,19,48,y+10,23,"darkwood")
    for x in [-46,42]:
        box(p,x,-16,19,x+4,-12,47,"darkwood")
        box(p,x,-16,25,x+4,16,31,"darkwood")
    for z in [26,35,44]:
        box(p,-42,-16,z,42,-12,z+3,"darkwood")
    return p

def bookshelf():
    p=[]
    box(p,-32,-16,0,32,16,5,"darkwood")
    box(p,-32,-16,5,-28,16,80,"darkwood")
    box(p,28,-16,5,32,16,80,"darkwood")
    box(p,-28,-16,5,28,-12,78,"darkwood")
    for z in [6,30,54,78]:
        box(p,-28,-12,z,28,16,z+3,"darkwood")
    for level in [9,33,57]:
        for i,c in enumerate([13,17,23,19,22,9,14,16]):
            x=-25+i*6
            box(p,x,-8,level,x+4,12,level+14+((i%3)-1)*2,"metal")
            p[-1][6]="green" if c in [13,14] else "wood" if c in [23,9,22] else "metal"
    return p

def cabinet():
    p=[]
    box(p,-32,-16,0,32,16,5,"darkwood")
    box(p,-32,-16,5,32,16,44,"darkwood")
    box(p,-32,-16,44,32,16,48,"darkwood")
    for x0,x1 in [(-28,-1),(1,28)]:
        box(p,x0,16,9,x1,16.5,39,"wood")
    for x in [-4,3]:
        box(p,x,16.5,22,x+2,18,29,"metal")
    return p

def round_piece(diameter,kind):
    im=Image.new("RGBA",(256,256)); d=ImageDraw.Draw(im)
    x=128
    if kind=="table":
        dep=diameter*.75; top=145; ht=4; ramp=RAMPS["wood"]
        d.ellipse((x-16,156,x+16,180),fill=PAL[4],outline=PAL[1])
        d.rectangle((x-5,145,x+5,171),fill=PAL[17],outline=PAL[0])
        d.line((x-3,146,x-3,169),fill=PAL[18])
    elif kind=="pouf":
        dep=diameter*.75; top=151; ht=10; ramp=RAMPS["green"]
    else:
        dep=diameter*.75; top=149; ht=3; ramp=RAMPS["wood"]
        for dx in [-8,5]:
            d.rectangle((x+dx,154,x+dx+3,169),fill=PAL[4],outline=PAL[1])
    a=(x-diameter/2,top-dep/2,x+diameter/2,top+dep/2+ht)
    d.ellipse(a,fill=PAL[ramp[1]],outline=PAL[ramp[0]])
    d.rectangle((x-diameter/2,top,x+diameter/2,top+ht),fill=PAL[ramp[2]])
    d.ellipse((x-diameter/2,top-dep/2,x+diameter/2,top+dep/2),fill=PAL[ramp[3]],outline=PAL[ramp[0]])
    if kind=="table":
        for yy in [-5,4]:
            half=math.sqrt(max(0,(diameter/2-3)**2-(yy/.75)**2))
            d.line((x-half,top+yy,x+half,top+yy),fill=PAL[4])
    bounds=im.getbbox()
    return im.crop(bounds),(x-bounds[0],bounds[3]-bounds[1]-1)

def mesh_item(name,parts,footprint,direction="down",strokes=()):
    im,anchor=render(parts,direction,strokes)
    fw,fd=footprint if direction in ["down","up"] else footprint[::-1]
    return {"id":name,"image":im,"anchor":anchor,"footprint":[fw,fd],"direction":direction,"canonical_parts":parts}

def furniture():
    items=[]
    for name,w,dep,kind,direction in [
        ("table-short-h",64,48,"wood","down"),("table-short-v",64,48,"wood","right"),
        ("table-long-h",128,48,"wood","down"),("table-long-v",128,48,"wood","right")]:
        p,s=table(w,dep,kind);items.append(mesh_item(name,p,(w,dep),direction,s))
    for name,dia in [("table-round-small",48),("table-round-large",64)]:
        im,a=round_piece(dia,"table");items.append({"id":name,"image":im,"anchor":a,"footprint":[dia,dia],"direction":"symmetric"})
    for direction in ["down","right"]:
        p,s=table(96,40,"folding");items.append(mesh_item("table-folding-"+direction,p,(96,40),direction,s))
    for kind in ["wood","padded"]:
        p=chair(kind)
        for direction in ["down","up","left","right"]:
            items.append(mesh_item("chair-"+kind+"-"+direction,p,(32,32),direction))
    for name,p,fp in [("sofa",couch(),(96,40)),("bench",bench(),(96,32))]:
        for direction in ["down","up","left","right"]:
            items.append(mesh_item(name+"-"+direction,p,fp,direction))
    p=couch(40,40,1)
    for direction in ["down","up","left","right"]:
        items.append(mesh_item("armchair-"+direction,p,(40,40),direction))
    im,a=round_piece(24,"pouf");items.append({"id":"pouf-round","image":im,"anchor":a,"footprint":[24,24],"direction":"symmetric"})
    p=[];box(p,-12,-12,0,12,12,20,"green","seam");items.append(mesh_item("pouf-square",p,(24,24)))
    im,a=round_piece(24,"stool");items.append({"id":"stool-round","image":im,"anchor":a,"footprint":[24,24],"direction":"symmetric"})
    p,s=table(24,24);items.append(mesh_item("stool-square",p,(24,24)))
    p=bookshelf()
    for direction in ["down","up","left","right"]:
        items.append(mesh_item("bookcase-"+direction,p,(64,32),direction))
    p,s=table(32,32);items.append(mesh_item("side-table-square",p,(32,32),strokes=s))
    im,a=round_piece(32,"table");items.append({"id":"side-table-round","image":im,"anchor":a,"footprint":[32,32],"direction":"symmetric"})
    p=cabinet()
    for direction in ["down","up"]:
        items.append(mesh_item("cabinet-"+direction,p,(64,32),direction))
    assert len(items)==40
    return items

def export_assets(items,name,cols,cell):
    cw,ch=cell;atlas=Image.new("RGBA",(cols*cw,math.ceil(len(items)/cols)*ch))
    folder=ROOT/"assets"/"individual";folder.mkdir(parents=True,exist_ok=True)
    for i,item in enumerate(items):
        im=item["image"]; ax,ay=item["anchor"]
        px=(i%cols)*cw+cw//2-ax;py=(i//cols)*ch+ch-16-ay
        assert px >= (i%cols)*cw and py >= (i//cols)*ch,(item["id"],im.size,px,py)
        assert px+im.width <= (i%cols+1)*cw and py+im.height <= (i//cols+1)*ch,(item["id"],im.size)
        atlas.alpha_composite(im,(px,py));im.save(folder/(item["id"]+".png"))
        manifest["assets"].append({k:v for k,v in item.items() if k not in ["image","canonical_parts"]} | {"atlas":name,"crop":[px,py,im.width,im.height],"world_anchor":[(i%cols)*cw+cw//2,(i//cols)*ch+ch-16],"canonical_part_count":len(item.get("canonical_parts",[]))})
    atlas.save(ROOT/"assets"/(name+"-native.png"))
    atlas.resize((atlas.width*2,atlas.height*2),Image.Resampling.NEAREST).save(ROOT/"assets"/(name+".png"))
    return atlas

def components(im):
    small=im.resize((im.width//4,im.height//4),Image.Resampling.NEAREST)
    mask=Image.fromarray(np.where(np.array(small)[:,:,3]>220,255,0).astype("uint8")).filter(ImageFilter.MaxFilter(3))
    m=np.array(mask)>0;boxes=[]
    for yy,xx in np.argwhere(m):
        if not m[yy,xx]:continue
        stack=[(int(xx),int(yy))];m[yy,xx]=False;xs=[];ys=[]
        while stack:
            x,y=stack.pop();xs.append(x);ys.append(y)
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)]:
                nx,ny=x+dx,y+dy
                if 0<=nx<m.shape[1] and 0<=ny<m.shape[0] and m[ny,nx]:
                    m[ny,nx]=False;stack.append((nx,ny))
        if len(xs)>=30:boxes.append((max(0,min(xs)*4-4),max(0,min(ys)*4-4),min(im.width,(max(xs)+1)*4+4),min(im.height,(max(ys)+1)*4+4)))
    return boxes

def clean_crop(im,height):
    scale=height/im.height
    im=im.resize((max(1,round(im.width*scale)),height),Image.Resampling.BOX)
    arr=np.array(im);mask=arr[:,:,3]>=160
    colors=arr[:,:,:3].astype(np.int16)
    # Palette selection on the native canvas; no dithering or interpolated final colors.
    distances=((colors[:,:,None,:].astype(np.int32)-RGB[None,None,:,:])**2 * np.array([2,3,2])[None,None,None,:]).sum(axis=3)
    idx=distances.argmin(axis=2); out=np.array(PAL,dtype="uint8")[idx]
    out[~mask]=(0,0,0,0)
    return Image.fromarray(out)

def planter(direction):
    p=[];box(p,-40,-12,0,40,12,22,"darkwood")
    for x in [-40,36]:
        box(p,x,-12,0,x+4,12,27,"darkwood")
    im,a=render(p,direction)
    # Work on the same projection with a shared canonical arrangement of four leaf masses.
    canvas=Image.new("RGBA",(256,256));d=ImageDraw.Draw(canvas)
    ground=11 if direction=="down" else 39
    canvas.alpha_composite(im,(128-a[0],projection(0,ground,0)[1]-a[1]))
    for j,x in enumerate([-28,-10,10,28]):
        cx,cy=projection(*turn(x,0,direction),30)
        vertices=[(-11,-3),(-8,-7),(-3,-9),(2,-8),(6,-10),(11,-5),(9,0),(12,4),(6,8),(0,6),(-5,8),(-11,4),(-9,0)]
        d.polygon([(cx+dx+((k*3+j*5)%3)-1,cy+dy+((k+j)%3)-1) for k,(dx,dy) in enumerate(vertices)],fill=PAL[13],outline=PAL[12])
        d.polygon([(cx-7,cy-3),(cx-2,cy-6),(cx+4,cy-4),(cx+6,cy),(cx,cy+2),(cx-5,cy)],fill=PAL[14])
        if j in [0,2,3]:
            for dx,dy in [(0,-2),(2,0),(0,2),(-2,0)]:d.rectangle((cx+dx,cy+dy,cx+dx+1,cy+dy+1),fill=PAL[11])
            d.point((cx,cy),fill=PAL[23])
    bounds=canvas.getbbox();return canvas.crop(bounds),(128-bounds[0],projection(0,ground,0)[1]-bounds[1])

def barrier(direction):
    p=[]
    for x in [-32,28]:
        box(p,x,-4,0,x+4,4,46,"metal")
        box(p,x-2,-6,0,x+6,6,3,"metal")
        box(p,x-1,-5,43,x+5,5,48,"metal")
    box(p,-28,-1,32,28,1,38,"metal")
    return mesh_item("barrier-"+direction,p,(68,12),direction)

def decor():
    source=Image.open(SOURCE/"decor.png").convert("RGBA")
    boxes=components(source)
    assert len(boxes)==18,("Expected18 isolated decor",boxes)
    boxes.sort(key=lambda b:b[3])
    ordered=[]
    for i in range(0,18,6):ordered+=sorted(boxes[i:i+6],key=lambda b:b[0])
    names=["plant-small","succulent","plant-medium","plant-tall","tree-rounded","tree-tall","planter-h","planter-v","lantern-standing","lantern-wall","bin-round","bin-sort","sign-left","sign-right","board-front","board-back","barrier-h","barrier-v"]
    heights=[28,28,48,56,96,112,40,68,88,28,28,28,56,56,64,64,44,64]
    fps=[(16,16),(16,16),(24,24),(24,24),(40,40),(40,40),(80,24),(24,80),(16,16),(16,8),(20,20),(24,20),(24,16),(24,16),(64,16),(64,16),(68,12),(12,68)]
    items=[]
    for i,(name,b,h,fp) in enumerate(zip(names,ordered,heights,fps)):
        im=clean_crop(source.crop(b),h)
        items.append({"id":name,"image":im,"anchor":(im.width//2,im.height-1),"footprint":list(fp),"direction":"source","source_crop":list(b)})
    for i,di in [(6,"down"),(7,"right")]:
        im,a=planter(di);items[i].update(image=im,anchor=a,direction=di)
    for i,di in [(16,"down"),(17,"right")]:
        obj=barrier(di);obj["id"]=names[i];items[i]=obj
    return items

def floor_tile(material,edge="center",variant=0):
    base={"wood":4,"mint":21,"carpet":22}[material];im=Image.new("RGBA",(32,32),PAL[base]);d=ImageDraw.Draw(im)
    if material=="wood":
        for y in [4,12,20,28]:
            d.line((0,y,31,y),fill=PAL[3])
            x=8 if (y//8)%2==0 else 24
            d.line((x,y-3,x,y-1),fill=PAL[3])
        d.line((12,8,15,8),fill=PAL[5]);d.line((20,24,22,24),fill=PAL[3])
    elif material=="mint":
        for xy in [8,24]:
            d.line((xy,0,xy,31),fill=PAL[20]);d.line((0,xy,31,xy),fill=PAL[20])
        for x,y in [(16,16),(4,4),(28,28)]:
            d.polygon([(x,y-2),(x+2,y),(x,y+2),(x-2,y)],fill=PAL[10])
    else:
        for x,y in [(8,8),(24,8),(8,24),(24,24)]:
            d.rectangle((x-2,y-2,x+2,y+2),outline=PAL[2]);d.point((x,y),fill=PAL[3])
    for side in edge.split("-"):
        if side=="center":continue
        rect={"n":(0,0,31,3),"s":(0,28,31,31),"w":(0,0,3,31),"e":(28,0,31,31)}[side]
        d.rectangle(rect,fill=PAL[10],outline=PAL[1])
        if side=="n":d.line((1,1,30,1),fill=PAL[11])
    return im

def architectural(parts,w=32,h=96,direction="down",strokes=()):
    global GROUND_Y
    previous=GROUND_Y;GROUND_Y=1
    try:im,a=render(parts,direction,strokes)
    finally:GROUND_Y=previous
    # Structures have their sockets on fixed source grid, unlike independent asset baselines.
    canvas=Image.new("RGBA",(w,h))
    ground=max(max(turn(x,y,direction)[1] for x,y in [(p[0],p[1]),(p[0],p[4]),(p[3],p[1]),(p[3],p[4])])-1 for p in parts if p[2]==0)
    origin_y=56 if h==96 else 72
    px=w//2-a[0];py=origin_y-(a[1]-round(ground))
    if px<0 or py<0 or px+im.width>w or py+im.height>h:raise ValueError(("Structural extent exceeds grid macro",w,h,im.size,px,py))
    canvas.alpha_composite(im,(px,py))
    canvas.info["ground_origin"]=[w//2,origin_y]
    return canvas

def wall_parts(material,kind):
    p=[]; mat={"wood":"wood","mint":"glass","carpet":"coral"}[material]
    def strip(x0,y0,x1,y1):
        box(p,x0,y0,0,x1,y1,72,mat)
        box(p,x0,y0,72,x1,y1,80,"stone")
        box(p,x0,y0,0,x1,y1,8,"darkwood")
    if kind=="n":strip(-16,-16,16,-8)
    elif kind=="s":strip(-16,8,16,16)
    elif kind=="w":strip(-16,-16,-8,16)
    elif kind=="e":strip(8,-16,16,16)
    elif kind.startswith("corner"):
        sides=kind.split("-")[1]
        if "n" in sides:strip(-16,-16,16,-8)
        if "s" in sides:strip(-16,8,16,16)
        if "w" in sides:strip(-16,-16,-8,16)
        if "e" in sides:strip(8,-16,16,16)
    else:
        strip(-4,-16,4,16)
    return p

def glass_parts(kind):
    p=[]
    def panel(x0,y0,x1,y1):
        box(p,x0,y0,0,x1,y1,6,"darkwood")
        box(p,x0,y0,6,x1,y1,72,"glass")
        box(p,x0,y0,72,x1,y1,80,"stone")
        box(p,x0,y0,5,x1,y1,10,"stone")
    if kind=="h":panel(-16,-16,16,-8)
    elif kind=="v":panel(-16,-16,-8,16)
    else:
        sides=kind.split("-")[1]
        if "n" in sides:panel(-16,-16,16,-8)
        if "s" in sides:panel(-16,8,16,16)
        if "w" in sides:panel(-16,-16,-8,16)
        if "e" in sides:panel(8,-16,16,16)
    return p

def door_parts(double=False,opened=False):
    width=64 if double else 32;p=[];half=width/2;mat="glass" if double else "wood"
    for x in [-half,half-4]:
        box(p,x,-4,0,x+4,4,80,"darkwood")
        box(p,x,-4,72,x+4,4,80,"stone")
    box(p,-half,-4,72,half,4,80,"stone")
    leaves=[(-half+4,-1),(1,half-4)] if double else[(-half+4,half-4)]
    for x0,x1 in leaves:
        if opened:
            hinge=x0 if x0<0 else x1
            # An open leaf turns on the ground plane while the camera stays fixed.
            box(p,hinge-1,4,2,hinge+1,4+(x1-x0),74,mat)
        else:
            box(p,x0,-2,2,x1,2,74,mat)
            box(p,x1-3,2,34,x1-1,3,44,"metal")
    for part in p:
        part[1]-=12;part[4]-=12
    return p

def map_components():
    atlas=Image.new("RGBA",(512,832)); folder=ROOT/"map-components"/"individual";folder.mkdir(parents=True,exist_ok=True)
    def put(name,im,x,y,extra=None):
        assert x%32==0 and y%32==0 and im.width%32==0 and im.height%32==0
        assert x+im.width<=atlas.width and y+im.height<=atlas.height
        atlas.alpha_composite(im,(x,y));im.save(folder/(name+".png"))
        manifest["map_components"].append({"id":name,"crop":[x,y,im.width,im.height],"world_grid":32,"connection_target":"grid-aligned structural module","height_socket":80,"ground_origin":im.info.get("ground_origin",[0,0]),**(extra or {})})
    for band,material in enumerate(["wood","mint","carpet"]):
        yy=band*192
        for row,cols in enumerate([["n-w","n","n-e"],["w","center","e"],["s-w","s","s-e"]]):
            for col,edge in enumerate(cols):
                put("floor-"+material+"-"+edge,floor_tile(material,edge),col*32,yy+row*32,{"family":material,"kind":"floor"})
        for col,edge in enumerate(["center","n","s"]):
            put("floor-"+material+"-extra-"+edge,floor_tile(material,edge),col*32,yy+128,{"family":material,"kind":"floor-extra"})
        kinds=["n","s","w","e","corner-nw","corner-ne","corner-sw","corner-se"]
        for j,kind in enumerate(kinds):
            im=architectural(wall_parts(material,kind))
            put("wall-"+material+"-"+kind,im,192+(j%8)*32,yy+(j//8)*64,{"family":material,"kind":"wall","direction":kind})
        for j,kind in enumerate(["corner-nw","corner-ne","corner-sw","corner-se","post"]):
            im=architectural(wall_parts(material,kind))
            put("wall-"+material+"-junction-"+kind,im,192+j*32,yy+96,{"family":material,"kind":"wall-junction"})
    # Bottom band deliberately reserves additional rows for hinged doors instead of squeezing them.
    modules=[]
    for kind in ["h","v","corner-nw","corner-ne","corner-sw","corner-se"]:
        modules.append(("glass-"+kind,architectural(glass_parts(kind)),{"kind":"glass","direction":kind}))
    for double in [False,True]:
        for direction in ["down","up","left","right"]:
            p=door_parts(double)
            w=64 if double and direction in ["down","up"] else 32
            im=architectural(p,w,128 if double and direction in ["left","right"] else 96,direction)
            modules.append(("door-"+("double" if double else "single")+"-"+direction,im,{"kind":"door","direction":direction,"opening_world_width":56 if double else 24}))
        im=architectural(door_parts(double,True),64 if double else 32,96)
        modules.append(("door-"+("double" if double else"single")+"-open",im,{"kind":"door","state":"open"}))
    for mat in ["stone","darkwood"]:
        p=[];box(p,-12,-12,0,12,12,6,mat);box(p,-8,-8,6,8,8,74,mat);box(p,-12,-12,74,12,12,80,mat)
        modules.append(("pillar-"+mat,architectural(p),{"kind":"building-pillar"}))
    # Shelf pack aligned modules, measure height in32px cells.
    x,y,rowheight=0,576,0
    for name,im,data in modules:
        if x+im.width>512:x=0;y+=rowheight;rowheight=0
        put(name,im,x,y,data);x+=im.width;rowheight=max(rowheight,im.height)
    atlas=atlas.crop((0,0,512,max(768,y+rowheight)))
    atlas.save(ROOT/"map-components"/"structural-tileset-native.png")
    atlas.resize((atlas.width*2,atlas.height*2),Image.Resampling.NEAREST).save(ROOT/"map-components"/"structural-tileset.png")
    return atlas


def reference_furniture():
    """Keep the approved drawing; normalize uniformly, and mirror symmetric side views."""
    originals=furniture()
    source=Image.open(SOURCE/"furniture.png").convert("RGBA")
    boxes=components(source);assert len(boxes)==40
    boxes.sort(key=lambda b:b[3])
    ordered=[]
    for i in range(0,40,8):ordered+=sorted(boxes[i:i+8],key=lambda b:b[0])
    widths=[64,48,128,48,48,64,96,40,
            36,36,32,32,36,36,32,32,
            96,96,40,40,96,96,32,32,
            40,40,40,40,24,24,24,24,
            64,64,32,32,32,32,64,64]
    for obj,b,w in zip(originals,ordered,widths):
        raw=source.crop(b)
        # Visible bounds, excluding the reference's alpha=1 red contamination.
        mask=raw.getchannel("A").point(lambda x:255 if x>=160 else 0)
        raw=raw.crop(mask.getbbox())
        height=max(1,round(raw.height*w/raw.width))
        im=clean_crop(raw,height)
        if obj["id"].startswith(("bench-","bookcase-","cabinet-")):
            a=np.array(im)
            for src,dst in [(3,7),(4,8),(5,9),(6,10),(22,7)]:
                selected=np.all(a==PAL[src],axis=2);a[selected]=PAL[dst]
            im=Image.fromarray(a)
        if not obj["id"].startswith("bookcase-"):
            a=np.array(im);a[np.all(a==PAL[22],axis=2)]=PAL[3];im=Image.fromarray(a)
        obj.update(image=im,anchor=(im.width//2,im.height-1),drawing_method="reference_cleanup_uniform_scale")
    by_id={o["id"]:o for o in originals}
    for family in ["chair-wood","chair-padded","sofa","bench","armchair","bookcase"]:
        left=by_id[family+"-left"];right=by_id[family+"-right"]
        right.update(image=left["image"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),anchor=(left["image"].width//2,left["image"].height-1),drawing_method="symmetric_side_mirror")
    return originals
def validate(paths):
    report={}
    for p in paths:
        im=Image.open(p).convert("RGBA");a=np.array(im)
        visible={tuple(v) for v in a.reshape(-1,4) if v[3]}
        assert {c[3] for c in visible} <= {255},p
        assert {c[:3] for c in visible} <= {p[:3] for p in PAL},p
        assert all(v==0 for v in np.unique(a[:,:,3]) if v!=255),p
        if not p.stem.endswith("-native"):
            native=np.array(Image.open(p.with_name(p.stem+"-native.png")).convert("RGBA"))
            assert np.array_equal(a,np.repeat(np.repeat(native,2,axis=0),2,axis=1)),p
        report[str(p.relative_to(ROOT))]={"size":list(im.size),"visible_colors":len(visible),"binary_alpha":True,"palette_subset_24":True,"uniform_2x_native_grid":not p.stem.endswith("-native")}
    assert len(manifest["assets"])==58
    # Canonical assemblies, rather than separately redrawn sprites, enforce direction identity.
    for family,count in [("chair-wood-",4),("chair-padded-",4),("sofa-",4),("bench-",4),("armchair-",4),("bookcase-",4)]:
        group=[a for a in manifest["assets"] if a["id"].startswith(family)]
        assert len(group)==count
        assert len({a["canonical_part_count"] for a in group})==1
    for material in ["wood","mint","carpet"]:
        arr=np.array(floor_tile(material))
        assert np.array_equal(arr[:,0],arr[:,-1]),("horizontal floor seam",material)
        assert np.array_equal(arr[0],arr[-1]),("vertical floor seam",material)
    for family in ["chair-wood","chair-padded","sofa","bench","armchair","bookcase"]:
        left=Image.open(ROOT/"assets"/"individual"/(family+"-left.png"))
        right=Image.open(ROOT/"assets"/"individual"/(family+"-right.png"))
        assert np.array_equal(np.array(left.transpose(Image.Transpose.FLIP_LEFT_RIGHT)),np.array(right))
    for material in ["wood","mint","carpet"]:
        n=Image.open(ROOT/"map-components"/"individual"/("wall-"+material+"-n.png"))
        corner=Image.open(ROOT/"map-components"/"individual"/("wall-"+material+"-corner-nw.png"))
        assert np.array_equal(np.array(n)[:,16:24],np.array(corner)[:,16:24]),("north wall trim socket",material)
    report["checks"]={"asset_count":58,"component_count":len(manifest["map_components"]),"floor_repeat_edges_all_three":True,"symmetric_left_right_pixel_mirrors":True,"direction_geometry_blueprint_parts_equal":True,"front_back_pixel_geometry_identical":False,"north_wall_corner_trim_matches":True,"asset_foot_baselines_on_16px_grid":all(a["world_anchor"][1]%16==0 for a in manifest["assets"]),"component_crops_on_32px_grid":True,"runtime_collision_depth_validated":False}
    (ROOT/"file-audit.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    (ROOT/"inventory.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print(json.dumps(report,indent=2))

if __name__=="__main__":
    for path in ["assets","map-components"]:(ROOT/path).mkdir(exist_ok=True)
    export_assets(reference_furniture(),"furniture",8,(160,144))
    export_assets(decor(),"plants-decor",6,(128,144))
    map_components()
    validate([ROOT/g/f for g,f in [("assets","furniture.png"),("assets","plants-decor.png"),("map-components","structural-tileset.png")]])

