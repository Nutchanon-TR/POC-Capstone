"use client";
import type { HallBridge } from "@/game/bridge";
import { createHall } from "@/game/renderer";
import { worldSchema } from "@/game/world";
import { asset } from "@/lib/assets";
import { useEffect, useRef } from "react";
export default function GameCanvas({
  bridge,
  name,
  avatar,
  motion,
}: {
  bridge: HallBridge;
  name: string;
  avatar: number;
  motion: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const initialMotion = useRef(motion);
  useEffect(() => {
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    let cancelled = false;
    async function start() {
      try {
        const response = await fetch(
          asset("assets/maps/exhibition/runtime.json"),
          { signal: abort.signal },
        );
        if (!response.ok) throw new Error("The hall map could not be loaded.");
        const world = worldSchema.parse(await response.json());
        if (cancelled || !host.current) return;
        dispose = createHall({
          host: host.current,
          world,
          bridge,
          player: { name, character: avatar },
          motion: initialMotion.current,
        });
      } catch (e) {
        if (!cancelled)
          bridge.emit({
            type: "error",
            message:
              e instanceof Error ? e.message : "Unable to open this hall.",
          });
      }
    }
    void start();
    return () => {
      cancelled = true;
      abort.abort();
      dispose?.();
    };
  }, [bridge, name, avatar]);
  useEffect(() => {
    bridge.send({ type: "motion", enabled: motion });
  }, [bridge, motion]);
  return <div className="phaser-host" ref={host} data-testid="phaser-host" />;
}
