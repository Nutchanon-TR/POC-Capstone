"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/features/session/provider";
/** Content remains readable without JavaScript; only off-screen blocks are revealed. */
export function PageMotion() {
  const path = usePathname();
  const { state } = useApp();
  useEffect(() => {
    if (
      !state.motion ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    const items = [
      ...document.querySelectorAll<HTMLElement>(
        "main .section-heading, main .event-card, main .project-card, main .how-grid article",
      ),
    ].filter((el) => el.getBoundingClientRect().top > innerHeight);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06 },
    );
    items.forEach((el) => {
      el.classList.add("reveal-ready");
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
      items.forEach((el) =>
        el.classList.remove("reveal-ready", "reveal-visible"),
      );
    };
  }, [path, state.motion]);
  return null;
}
