import { characterNames, characters, projects } from "@/domain/catalog";
import { asset } from "@/lib/assets";
import Phaser from "phaser";
import { HallBridge } from "./bridge";
import { HallSimulation, type Actor } from "./simulation";
import type { WorldData } from "./world";
interface Visual {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
}
class ExhibitionScene extends Phaser.Scene {
  private readonly simulation: HallSimulation;
  private readonly visuals = new Map<string, Visual>();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private zoom = 1;
  private lastReport = 0;
  private reduced = false;
  private loadFailed = false;
  private bubble: Phaser.GameObjects.Text | null = null;
  constructor(
    private world: WorldData,
    private bridge: HallBridge,
    player: { name: string; character: number },
    motion: boolean,
  ) {
    super("Exhibition");
    this.simulation = new HallSimulation(world, player, characterNames);
    this.simulation.motion = motion;
  }
  preload() {
    this.load.image("floor", asset("assets/maps/exhibition/floor-atlas.png"));
    for (const t of this.world.tiles)
      this.load.image(`tile-${t.gid}`, asset(t.image));
    for (const c of characters) {
      this.load.spritesheet(`walk-${c.id}`, asset(c.walk), {
        frameWidth: 80,
        frameHeight: 80,
      });
      if (c.idle)
        this.load.spritesheet(`idle-${c.id}`, asset(c.idle), {
          frameWidth: 80,
          frameHeight: 80,
        });
    }
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      this.loadFailed = true;
      this.bridge.emit({
        type: "error",
        message: `Unable to load ${file.key}. Reload the hall to try again.`,
      });
    });
  }
  create() {
    const rows = Array.from({ length: this.world.rows }, (_, r) =>
      this.world.floor.slice(
        r * this.world.columns,
        (r + 1) * this.world.columns,
      ),
    );
    const map = this.make.tilemap({
      data: rows,
      tileWidth: 32,
      tileHeight: 32,
    });
    const tileset = map.addTilesetImage("floor", "floor", 32, 32, 0, 0, 0);
    if (!tileset) throw new Error("Missing floor tileset");
    map.createLayer(0, tileset, 0, 0)?.setDepth(-1000);
    for (const object of this.world.sprites) {
      const image = this.add
        .image(object.x, object.y, `tile-${object.gid}`)
        .setOrigin(0)
        .setDisplaySize(object.width, object.height)
        .setDepth(object.depth);
      if (object.interactable) {
        image.setInteractive({ useHandCursor: true });
        image.on("pointerdown", (p: Phaser.Input.Pointer) => {
          if (p.event.target !== this.game.canvas || this.focused()) return;
          const area = this.world.areas.find(
            (a) =>
              a.kind === "booth" &&
              object.x >= a.x &&
              object.x < a.x + a.width &&
              object.y >= a.y &&
              object.y < a.y + a.height,
          );
          if (area) this.bridge.emit({ type: "open", slot: area.id });
        });
      }
    }
    for (const area of this.world.areas.filter((a) => a.kind === "booth")) {
      const project = projects.find((p) => p.slot === area.id);
      const label = this.add
        .text(
          area.x + area.width / 2,
          area.y + 9,
          `${project?.code ?? area.code} · ${project?.name ?? "Available booth"}`,
          {
            fontFamily: "Arial",
            fontSize: "11px",
            color: "#1d5cf5",
            backgroundColor: "#ffffff",
            padding: { x: 8, y: 5 },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(4000)
        .setInteractive({ useHandCursor: true });
      label.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (p.event.target === this.game.canvas && !this.focused())
          this.bridge.emit({ type: "open", slot: area.id });
      });
    }
    for (const actor of [...this.simulation.npcs, this.simulation.player]) {
      const sprite = this.add
        .sprite(actor.x, actor.y, `walk-${actor.character}`, 0)
        .setOrigin(0.5, 0.91)
        .setScale(0.75);
      const label = this.add
        .text(
          actor.x,
          actor.y + 6,
          actor.id === "you" ? `${actor.name} · you` : actor.name,
          {
            fontFamily: "Arial",
            fontSize: "9px",
            color: "#ffffff",
            backgroundColor: actor.id === "you" ? "#1d5cf5" : "#364154",
            padding: { x: 5, y: 3 },
          },
        )
        .setOrigin(0.5, 0);
      this.visuals.set(actor.id, { sprite, label });
    }
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      for (const key of ["W", "A", "S", "D", "E"])
        this.keys[key] = this.input.keyboard.addKey(key);
      this.input.keyboard.disableGlobalCapture();
    }
    this.input.on(
      "pointerup",
      (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
      ) => {
        if (
          pointer.event.target !== this.game.canvas ||
          objects.length ||
          pointer.getDistance() > 8 ||
          this.focused()
        )
          return;
        this.simulation.walkTo(
          this.cameras.main.getWorldPoint(pointer.x, pointer.y),
        );
      },
    );
    const unsubscribe = this.bridge.onCommand((c) => {
      switch (c.type) {
        case "warp":
          if (!this.simulation.warp(c.slot))
            this.bridge.emit({
              type: "error",
              message: "This booth has no accessible position.",
            });
          break;
        case "zoom":
          this.zoom = c.value;
          this.fit();
          break;
        case "motion":
          this.simulation.motion = c.enabled;
          break;
        case "blocked":
          this.simulation.blocked = c.value;
          break;
        case "move":
          this.simulation.manual = { x: c.x, y: c.y };
          break;
        case "say":
          this.say(c.text);
          break;
      }
    });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = reduced.matches;
    const onReduced = () => {
      this.reduced = reduced.matches;
    };
    reduced.addEventListener("change", onReduced);
    this.events.once("shutdown", () => {
      unsubscribe();
      reduced.removeEventListener("change", onReduced);
    });
    this.scale.on("resize", this.fit, this);
    this.cameras.main.setBounds(0, 0, this.world.width, this.world.height);
    this.fit();
    if (!this.loadFailed)
      this.bridge.emit({
        type: "ready",
        npcs: this.simulation.npcs.length,
        objects: this.world.sprites.length,
        collisions: this.world.collisions.length,
      });
    this.game.canvas.setAttribute(
      "aria-label",
      "Interactive exhibition hall. Use WASD or arrow keys to walk, E to open a nearby booth.",
    );
    this.game.canvas.tabIndex = 0;
  }
  private focused() {
    return (
      this.simulation.blocked ||
      !!document.activeElement?.closest("input,textarea,select,dialog[open]") ||
      !!document.querySelector("dialog[open]")
    );
  }
  private fit() {
    const camera = this.cameras.main;
    const fit = Math.min(
      this.scale.width / this.world.width,
      this.scale.height / this.world.height,
    );
    const zoom = (this.scale.width < 700 ? 1.1 : fit) * this.zoom;
    camera
      .setZoom(Math.max(0.25, zoom))
      .centerOn(this.world.width / 2, this.world.height / 2);
    if (this.scale.width < 700 || this.zoom > 1.3) {
      const visual = this.visuals.get("you");
      if (visual) camera.startFollow(visual.sprite, true, 0.08, 0.08);
    } else camera.stopFollow();
  }
  private say(text: string) {
    this.bubble?.destroy();
    this.bubble = this.add
      .text(
        this.simulation.player.x,
        this.simulation.player.y - 65,
        text.slice(0, 160),
        {
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#0f1a3a",
          backgroundColor: "#ffffff",
          padding: { x: 10, y: 7 },
          wordWrap: { width: 180 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(10000);
    const bubble = this.bubble;
    this.time.delayedCall(6500, () => {
      if (this.bubble === bubble) this.bubble = null;
      bubble.destroy();
    });
  }
  update(time: number, delta: number) {
    if (!this.visuals.size) return;
    const moving = { x: 0, y: 0 };
    if (!this.focused()) {
      moving.x =
        Number(this.cursors?.right.isDown || this.keys.D?.isDown) -
        Number(this.cursors?.left.isDown || this.keys.A?.isDown);
      moving.y =
        Number(this.cursors?.down.isDown || this.keys.S?.isDown) -
        Number(this.cursors?.up.isDown || this.keys.W?.isDown);
    }
    const motion = this.simulation.motion;
    this.simulation.motion = motion && !this.reduced && !document.hidden;
    const blocked = this.simulation.blocked;
    this.simulation.blocked = blocked || this.focused();
    this.simulation.update(Math.min(delta / 1000, 0.04), moving);
    this.simulation.blocked = blocked;
    this.simulation.motion = motion;
    for (const actor of [...this.simulation.npcs, this.simulation.player])
      this.renderActor(actor, time);
    if (this.bubble)
      this.bubble.setPosition(
        this.simulation.player.x,
        this.simulation.player.y - 65,
      );
    if (
      this.keys.E &&
      Phaser.Input.Keyboard.JustDown(this.keys.E) &&
      !this.focused()
    ) {
      const slot = this.simulation.zone();
      if (slot) this.bridge.emit({ type: "open", slot });
    }
    if (time - this.lastReport > 150) {
      this.lastReport = time;
      this.bridge.emit({
        type: "position",
        point: { x: this.simulation.player.x, y: this.simulation.player.y },
        zone: this.simulation.zone(),
      });
    }
  }
  private renderActor(actor: Actor, time: number) {
    const v = this.visuals.get(actor.id);
    if (!v) return;
    const idle = !actor.moving && characters[actor.character].idle;
    const texture = `${idle ? "idle" : "walk"}-${actor.character}`;
    if (v.sprite.texture.key !== texture) v.sprite.setTexture(texture);
    const animate = actor.moving || (this.simulation.motion && !this.reduced);
    const frame =
      actor.direction * 4 +
      (animate && (idle || actor.moving)
        ? Math.floor(time / (actor.moving ? 135 : 500)) % 4
        : 0);
    v.sprite
      .setFrame(frame)
      .setPosition(actor.x, actor.y)
      .setDepth(actor.y)
      .setScale(
        0.75,
        0.75 +
          (!actor.moving && !idle && animate
            ? Math.sin(time / 460) * 0.008
            : 0),
      );
    v.label.setPosition(actor.x, actor.y + 6).setDepth(actor.y + 1);
  }
}
export function createHall({
  host,
  world,
  bridge,
  player,
  motion,
}: {
  host: HTMLElement;
  world: WorldData;
  bridge: HallBridge;
  player: { name: string; character: number };
  motion: boolean;
}) {
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: host,
    width: host.clientWidth,
    height: host.clientHeight,
    backgroundColor: "#dfe6de",
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE },
    scene: [new ExhibitionScene(world, bridge, player, motion)],
  });
  const observer = new ResizeObserver(() => {
    if (game.isBooted && host.clientWidth > 0 && host.clientHeight > 0) {
      // RESIZE reads parentSize during refresh. Read the new DOM bounds first;
      // a single resize (reduced motion) must work without a following frame.
      game.scale.getParentBounds();
      game.scale.refresh();
    }
  });
  observer.observe(host);
  return () => {
    observer.disconnect();
    game.destroy(true);
  };
}
