"use client";
import { Empty, PageTitle } from "@/components/ui";
import { showcases, type Showcase } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EventCard } from "./event-card";
export function Discovery() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All events");
  const { state } = useApp();
  const local: Showcase[] = state.events.map((e) => ({
    ...e,
    status: "upcoming",
    category: "Community",
    color: "purple",
  }));
  const all = [...showcases, ...local];
  const filtered = all.filter(
    (e) =>
      `${e.title} ${e.host} ${e.category}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All events" ||
        (filter === "Live now"
          ? e.status === "live"
          : e.status === "upcoming")),
  );
  return (
    <div className="container section">
      <PageTitle
        eyebrow="FIND YOUR PEOPLE"
        title="Follow a little curiosity."
        description="Student ideas, fresh perspectives, and a place for your next conversation."
        action={
          <Link className="text-link" href="/workspace/create-event">
            Hosting something?
            <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="discovery-tools">
        <label className="search-box">
          <Search size={20} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, topics, or communities"
            aria-label="Search events"
          />
        </label>
        <div className="chips">
          {["All events", "Live now", "Coming up"].map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? "active" : ""}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small results-count">
        {filtered.length} events to explore
      </p>
      <div className="grid three">
        {filtered.map((e) => (
          <EventCard event={e} key={e.id} />
        ))}
      </div>
      {!filtered.length && (
        <Empty title="A different search might do it.">
          Try a topic, university, or a shorter phrase.
        </Empty>
      )}
    </div>
  );
}
