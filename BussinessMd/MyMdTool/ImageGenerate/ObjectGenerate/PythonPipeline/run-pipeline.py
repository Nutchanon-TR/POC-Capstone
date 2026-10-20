"""Run pixel cleanup and room assembly using existing sources; does not call image generation."""
from pathlib import Path
import argparse, subprocess, sys, shutil, hashlib, json
from datetime import datetime, timezone

BASE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output-dir", required=True, type=Path)
parser.add_argument("--source-dir", type=Path, default=BASE / "sample-source")
args = parser.parse_args()
out = args.output_dir.resolve()
src = args.source_dir.resolve()
if out == BASE or out in BASE.parents or out.is_relative_to(BASE / "scripts"):
    parser.error("Choose an output directory separate from the pipeline scripts")
if out == src or src.is_relative_to(out):
    parser.error("Output must not contain or replace the source directory")
if (out / "inventory.json").exists():
    parser.error("Existing pack found. Choose a new output directory")
for name in ["furniture.png", "decor.png"]:
    if not (src / name).is_file():
        parser.error("Missing source image: " + str(src / name))
out.mkdir(parents=True, exist_ok=True)
backup = out / "source"
backup.mkdir(exist_ok=True)
sources = {}
for name in ["furniture.png", "decor.png", "structure.png"]:
    source = src / name
    if source.exists():
        shutil.copy2(source, backup / name)
        sources[name] = {"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest()}
subprocess.run([sys.executable, str(BASE / "scripts" / "prepare-pixels.py"),
                "--output-dir", str(out), "--source-dir", str(src)], check=True)
subprocess.run([sys.executable, str(BASE / "scripts" / "build-preview.py"),
                "--output-dir", str(out)], check=True)
(out / "pipeline-run.json").write_text(json.dumps({
    "flow": "event-starter-v1", "created_at_utc": datetime.now(timezone.utc).isoformat(),
    "sources": sources, "generated_new_images": False,
    "steps": ["backup_sources", "prepare_pixels_and_atlases", "validate_files", "assemble_room_preview"],
    "layout_counts_are_template_specific": True,
    "runtime_collision_depth_validated": False
}, ensure_ascii=False, indent=2), encoding="utf-8")
print("Completed pixel cleanup + Python room assembly: " + str(out))
