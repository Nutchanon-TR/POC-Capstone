"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";

export default function GameHost() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = hostRef.current;

    // ดูว่าโหลดหน้าแล้วหรือยัง ถ้าไม่โหลดก็ไม่ต้องทำอะไร
    if (!parent) return;

    let game: Game | undefined;
    let cancelled = false;

    async function startGame() {
      const Phaser = (await import("phaser")).default;

      if (cancelled) return;

      class PracticeScene extends Phaser.Scene {
        preload() {
          this.load.image(
            "table",
            "/assets/expo/props/table-long-v.png"
          );

          this.load.json("expo-map", "/assets/expo/expo.tmj");
          this.load.json("expo-tileset", "/assets/expo/expo.tsj");
        }

        create() {
          const mapData: unknown = this.cache.json.get("expo-map");

          console.log("ข้อมูลแผนที่:", mapData);

          if (
            typeof mapData !== "object" ||
            mapData === null ||
            !("width" in mapData) ||
            !("height" in mapData) ||
            typeof mapData.width !== "number" ||
            typeof mapData.height !== "number"
          ) {
            throw new Error("ข้อมูลแผนที่ไม่มีขนาดที่ถูกต้อง");
          }

          this.add.text(50, 40, "My first scene", {
            fontSize: "28px",
            color: "#ffffff",
          });

          this.add
            .rectangle(100, 160, 120, 80, 0x22c55e)
            .setOrigin(0, 0);

          this.add
            .image(300, 160, "table")
            .setOrigin(0, 0);

          this.add.text(
            40,
            420,
            `Map: ${mapData.width} x ${mapData.height} tiles`,
            { fontSize: "22px", color: "#ffffff" }
          );

          //====================-หาจุดเกิดจาก TMJ: หา layer Spawn → หา Spawn_Player → อ่าน x, y มาแสดงเป็นข้อความ ยังไม่ได้สร้างตัวละคร========================================

          if (!("layers" in mapData) || !Array.isArray(mapData.layers)) {
            throw new Error("ไม่พบรายการ layers ในแผนที่");
          }

          const spawnLayer: unknown = mapData.layers.find(
            (layer: unknown) =>
              typeof layer === "object" &&
              layer !== null &&
              "name" in layer &&
              layer.name === "Spawn"
          );

          if (
            typeof spawnLayer !== "object" ||
            spawnLayer === null ||
            !("objects" in spawnLayer) ||
            !Array.isArray(spawnLayer.objects)
          ) {
            throw new Error("ไม่พบ layer จุดเกิด");
          }

          const spawn: unknown = spawnLayer.objects.find(
            (object: unknown) =>
              typeof object === "object" &&
              object !== null &&
              "name" in object &&
              object.name === "Spawn_Player"
          );

          if (
            typeof spawn !== "object" ||
            spawn === null ||
            !("x" in spawn) ||
            !("y" in spawn) ||
            typeof spawn.x !== "number" ||
            typeof spawn.y !== "number"
          ) {
            throw new Error("ไม่พบตำแหน่ง Spawn_Player");
          }

          this.add.text(
            40,
            460,
            `Spawn: x=${spawn.x}, y=${spawn.y}`,
            { fontSize: "22px", color: "#ffffff" }
          );

          //==============================================================================================
          function isRecord(value: unknown): value is Record<string, unknown> {
            return typeof value === "object" &&
              value !== null &&
              !Array.isArray(value);
          }

          const tilesetData: unknown = this.cache.json.get("expo-tileset");

          if (!isRecord(tilesetData) || !Array.isArray(tilesetData.tiles)) {
            throw new Error("ไม่พบรายการรูปใน tileset");
          }

          if (
            !("tilesets" in mapData) ||
            !Array.isArray(mapData.tilesets) ||
            !("layers" in mapData) ||
            !Array.isArray(mapData.layers)
          ) {
            throw new Error("ข้อมูลแผนที่ไม่ครบ");
          }

          const tilesetReference: unknown = mapData.tilesets.find(
            (item: unknown) => isRecord(item) && item.source === "expo.tsj"
          );

          if (
            !isRecord(tilesetReference) ||
            typeof tilesetReference.firstgid !== "number"
          ) {
            throw new Error("ไม่พบ firstgid");
          }

          const firstgid = tilesetReference.firstgid;

          const furnitureLayer: unknown = mapData.layers.find(
            (item: unknown) =>
              isRecord(item) && item.name === "Structures and furniture"
          );

          if (!isRecord(furnitureLayer) || !Array.isArray(furnitureLayer.objects)) {
            throw new Error("ไม่พบ layer เฟอร์นิเจอร์");
          }

          const tiles: unknown[] = tilesetData.tiles;
          const fixtures: unknown[] = furnitureLayer.objects;

          for (const tile of tiles) {
            if (
              !isRecord(tile) ||
              typeof tile.id !== "number" ||
              typeof tile.image !== "string"
            ) {
              throw new Error("ข้อมูลรูปไม่ถูกต้อง");
            }

            const key = `map-tile-${tile.id}`;

            this.load.image(key, `/assets/expo/${tile.image}`);
          }

          this.load.once("complete", () => {
            for (const fixture of fixtures) {
              if (
                !isRecord(fixture) ||
                typeof fixture.gid !== "number" ||
                typeof fixture.x !== "number" ||
                typeof fixture.y !== "number"
              ) {
                throw new Error("ข้อมูลวัตถุไม่ถูกต้อง");
              }

              const localId = fixture.gid - firstgid;
              const key = `map-tile-${localId}`;

              if (!this.textures.exists(key)) {
                throw new Error(`โหลดรูปไม่สำเร็จ: ${key}`);
              }

              this.add
                .image(fixture.x, fixture.y, key)
                .setOrigin(0, 0);
            }
          });

          this.load.start();

          this.add.text(500, 40, `Objects: ${fixtures.length}`, {
            fontSize: "20px",
            color: "#ffffff",
          });


        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: 960,
        height: 540,
        backgroundColor: "#1e293b",
        scene: [PracticeScene],
        // เพิ่ม scale ให้เกมปรับขนาดตามหน้าจอ
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });
    }

    startGame();

    //รันตอนที่เราไม่ได้ใช้หน้านี้แล้ว หรือเปลี่ยนหน้าไปแล้ว ให้ทำลายเกมทิ้ง
    return () => {
      //มีกรณีที่ game?.destroy(true); แล้วแต่ข้อมูลหลัง awiat ดันรันต่อ ทำให้เราต้องดักตรงนี้เพื่อไม่ให้สร้างเกมใหม่หลังจากที่เรายกเลิกการสร้างเกมไปแล้ว
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="game-host" />;
}