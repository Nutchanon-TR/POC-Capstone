"use client";
import { Dialog } from "@/components/dialog";
import { ButtonLink, Empty, Portrait, Poster, Tag } from "@/components/ui";
import {
  categories,
  projects,
  searchProjects,
  type Project,
} from "@/domain/catalog";
import { Scorecard } from "@/features/judging/scorecard";
import { Feedback, ProjectActions } from "@/features/projects/project-detail";
import { useApp } from "@/features/session/provider";
import { HallBridge } from "@/game/bridge";
import { asset } from "@/lib/assets";
import {
  ArrowUpRight,
  BookOpen,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Map,
  MessageCircle,
  MicOff,
  Minus,
  MonitorUp,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smile,
  Trophy,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
const GameCanvas = dynamic(() => import("./game-canvas"), { ssr: false });
type Panel =
  "search" | "project" | "chat" | "map" | "settings" | "judge" | null;
function Tool({
  label,
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`hall-tool ${active ? "active" : ""}`}
      title={disabled ? `${label} requires the realtime backend.` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
export function Hall({ eventId }: { eventId: string }) {
  const { state, dispatch, ready: hydrated, notify } = useApp();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [project, setProject] = useState<Project>(projects[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 160, y: 736 });
  const [zone, setZone] = useState<string | null>(null);
  const [dnd, setDnd] = useState(false);
  const [tour, setTour] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const bridge = useMemo(() => new HallBridge(), []);
  const pending = useRef<string | null>(null);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  useEffect(() => {
    pending.current = new URLSearchParams(window.location.search).get(
      "project",
    );
    return bridge.subscribe((event) => {
      if (event.type === "ready") {
        setReady(true);
        setError("");
        const p = projects.find((p) => p.id === pending.current);
        if (p?.slot) {
          bridge.send({ type: "warp", slot: p.slot });
          setProject(p);
          setPanel("project");
          pending.current = null;
        }
      } else if (event.type === "error") {
        setError(event.message);
      } else if (event.type === "open") {
        const p = projects.find((p) => p.slot === event.slot);
        if (p) {
          setProject(p);
          setPanel("project");
        }
      } else {
        setPosition(event.point);
        setZone(event.zone);
        const p = projects.find((p) => p.slot === event.zone);
        if (p) dispatchRef.current({ type: "visit", id: p.id });
      }
    });
  }, [bridge]);
  useEffect(() => {
    if (
      hydrated &&
      !state.tourSeen &&
      state.signedIn &&
      state.registrations.includes(eventId)
    )
      setShowTour(true);
  }, [hydrated, state.tourSeen, state.signedIn, state.registrations, eventId]);
  useEffect(() => {
    bridge.send({ type: "blocked", value: showTour });
  }, [bridge, showTour]);
  function warp(p: Project) {
    if (!p.slot) {
      notify("This project has no booth assigned in this hall.");
      return;
    }
    bridge.send({ type: "warp", slot: p.slot });
    setProject(p);
    setPanel("project");
  }
  function toggle(p: Panel) {
    setPanel((current) => (current === p ? null : p));
  }
  function finishTour() {
    dispatch({ type: "setting", key: "tourSeen", value: true });
    setShowTour(false);
  }
  if (!hydrated)
    return (
      <main id="main" className="loading-screen">
        Loading your visit…
      </main>
    );
  if (!state.signedIn || !state.registrations.includes(eventId))
    return (
      <main id="main" className="loading-screen">
        <h1>Start with a quick hello.</h1>
        <p>Choose a local profile and register before entering the hall.</p>
        <ButtonLink href={`/events/${eventId}`}>Back to event</ButtonLink>
      </main>
    );
  return (
    <main id="main" className="hall-root">
      <header className="hall-header">
        <div className="row">
          <Link
            className="icon-button"
            aria-label="Leave hall"
            href={`/events/${eventId}`}
          >
            <ChevronLeft size={21} />
          </Link>
          <div>
            <strong>Senior Design Showcase 2026</strong>
            <span className="hall-subtitle">
              <span className="status-dot" />
              Local hall · 1 visitor · 14 decorative NPCs
            </span>
          </div>
        </div>
        <div className="row hall-header-right">
          <span className="hall-person">
            <Portrait index={state.profile.avatar} size={34} />
            {state.profile.name}
          </span>
          <button
            className="icon-button"
            aria-label="Hall settings"
            onClick={() => toggle("settings")}
          >
            <Settings size={19} />
          </button>
        </div>
      </header>
      <div
        className={`hall-stage ${panel ? "with-panel" : ""}`}
        data-ready={ready}
        data-player-x={position.x.toFixed(1)}
        data-player-y={position.y.toFixed(1)}
        data-zone={zone ?? ""}
      >
        <GameCanvas
          bridge={bridge}
          name={state.profile.name}
          avatar={state.profile.avatar}
          motion={state.motion}
        />
        {(!ready || error) && (
          <div className="hall-loading">
            {error ? (
              <>
                <h2>The hall needs a moment.</h2>
                <p role="alert">{error}</p>
                <button
                  className="button"
                  onClick={() => window.location.reload()}
                >
                  Reload hall
                </button>
                <Link href={`/events/${eventId}`}>Back to event</Link>
              </>
            ) : (
              <>
                <span className="spinner" />
                <p>Opening the doors…</p>
              </>
            )}
          </div>
        )}
        <div className="hall-top-tools">
          <button className="hall-search" onClick={() => toggle("search")}>
            <Search size={18} />
            Find a project<span>/</span>
          </button>
          <div className="hall-location">
            <span className="status-dot" />
            {zone
              ? projects.find((p) => p.slot === zone)?.name
              : "Welcome to the showcase"}
            {dnd && <Tag>DND</Tag>}
          </div>
        </div>
        <div className="hall-zoom">
          <button
            aria-label="Zoom in"
            onClick={() => {
              const z = Math.min(2, zoom + 0.25);
              setZoom(z);
              bridge.send({ type: "zoom", value: z });
            }}
          >
            <Plus size={18} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom out"
            onClick={() => {
              const z = Math.max(0.75, zoom - 0.25);
              setZoom(z);
              bridge.send({ type: "zoom", value: z });
            }}
          >
            <Minus size={18} />
          </button>
          <button
            aria-label={
              state.motion ? "Pause NPC animation" : "Resume NPC animation"
            }
            onClick={() =>
              dispatch({ type: "setting", key: "motion", value: !state.motion })
            }
          >
            {state.motion ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
        <div className="hall-instructions">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> to walk <span>·</span> <kbd>E</kbd> to explore{" "}
          <span>·</span> click to move
        </div>
        <div className="hall-toolbar">
          <div className="hall-tools-group">
            <Tool label="Mic" disabled>
              <MicOff size={20} />
            </Tool>
            <Tool label="Camera" disabled>
              <CameraOff size={20} />
            </Tool>
            <Tool label="Share" disabled>
              <MonitorUp size={20} />
            </Tool>
          </div>
          <span className="toolbar-divider" />
          <div className="hall-tools-group">
            <Tool
              label="Projects"
              active={panel === "search"}
              onClick={() => toggle("search")}
            >
              <Search size={20} />
            </Tool>
            <Tool
              label="Map"
              active={panel === "map"}
              onClick={() => toggle("map")}
            >
              <Map size={20} />
            </Tool>
            <Tool
              label="Chat"
              active={panel === "chat"}
              onClick={() => toggle("chat")}
            >
              <MessageCircle size={20} />
            </Tool>
            <Tool
              label="React"
              onClick={() =>
                bridge.send({ type: "say", text: "💛 Great idea!" })
              }
            >
              <Smile size={20} />
            </Tool>
            {state.modules.judging && (
              <Tool
                label="Judge"
                active={panel === "judge"}
                onClick={() => toggle("judge")}
              >
                <Trophy size={20} />
              </Tool>
            )}
          </div>
          <span className="toolbar-divider" />
          <Link className="hall-tool leave" href={`/events/${eventId}/recap`}>
            <LogOut size={20} />
            <span>Leave</span>
          </Link>
        </div>
        <div className="mobile-dpad" aria-label="Movement controls">
          {[
            { x: 0, y: -1, label: "Move up", text: "↑" },
            { x: -1, y: 0, label: "Move left", text: "←" },
            { x: 0, y: 1, label: "Move down", text: "↓" },
            { x: 1, y: 0, label: "Move right", text: "→" },
          ].map((d) => (
            <button
              key={d.label}
              aria-label={d.label}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                bridge.send({ type: "move", x: d.x, y: d.y });
              }}
              onPointerUp={() => bridge.send({ type: "move", x: 0, y: 0 })}
              onPointerCancel={() => bridge.send({ type: "move", x: 0, y: 0 })}
              onLostPointerCapture={() =>
                bridge.send({ type: "move", x: 0, y: 0 })
              }
            >
              {d.text}
            </button>
          ))}
        </div>
      </div>
      {panel && (
        <aside className="hall-panel" aria-label={`${panel} panel`}>
          <div className="hall-panel-heading">
            <h2>
              {
                {
                  search: "Find your next idea",
                  project: project.name,
                  chat: "A little conversation",
                  map: "Your way around",
                  settings: "Make yourself comfortable",
                  judge: "Judge workspace",
                }[panel]
              }
            </h2>
            <button
              className="icon-button"
              aria-label="Close panel"
              onClick={() => setPanel(null)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="hall-panel-body">
            {panel === "search" && (
              <>
                <label className="search-box">
                  <Search size={17} />
                  <input
                    aria-label="Search hall projects"
                    placeholder="Project, team, keyword…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="chips compact-chips">
                  {["All", ...categories].map((c) => (
                    <button
                      key={c}
                      className={`chip ${category === c ? "active" : ""}`}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {searchProjects(query, category).map((p) => (
                  <article className="hall-project-result" key={p.id}>
                    <div className="row between">
                      <Tag>{p.code}</Tag>
                      <span className="small muted">{p.category}</span>
                    </div>
                    <h3>{p.title}</h3>
                    <p className="small muted">
                      {p.presenter} · {p.name}
                    </p>
                    <button
                      className="button secondary small-button"
                      disabled={!p.slot}
                      onClick={() => warp(p)}
                    >
                      {p.slot ? "Go to booth" : "No slot in this hall"}
                      <ArrowUpRight size={15} />
                    </button>
                  </article>
                ))}
              </>
            )}
            {panel === "project" && (
              <>
                <div className="row between">
                  <Tag>
                    {project.code} · {project.category}
                  </Tag>
                  <span className="small muted">Project preview</span>
                </div>
                <h3 className="hall-project-title">{project.title}</h3>
                <Poster project={project} compact />
                <p>{project.description}</p>
                <ProjectActions project={project} />
                <div className="maker-card">
                  <Portrait index={project.character} size={42} />
                  <div>
                    <strong>{project.presenter}</strong>
                    <p>{project.name} · KMUTT</p>
                  </div>
                </div>
                <ButtonLink
                  secondary
                  href={`/events/${eventId}/projects/${project.id}`}
                >
                  Open full project
                </ButtonLink>
                <Feedback project={project.id} />
              </>
            )}
            {panel === "map" && (
              <>
                <p className="muted">
                  Five booths. Plenty to discover. Pick a project to go there.
                </p>
                <div className="minimap">
                  <img
                    src={asset("assets/maps/exhibition/minimap.png")}
                    alt="Exhibition hall overview"
                  />
                  <span
                    className="minimap-you"
                    style={{
                      left: `${(position.x / 1344) * 100}%`,
                      top: `${(position.y / 832) * 100}%`,
                    }}
                  />
                </div>
                {projects
                  .filter((p) => p.slot)
                  .map((p) => (
                    <button
                      key={p.id}
                      className="map-booth-row"
                      onClick={() => warp(p)}
                    >
                      <Tag>{p.code}</Tag>
                      <span>{p.name}</span>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
              </>
            )}
            {panel === "chat" && (
              <>
                <div className="notice small">
                  Local chat preview. Messages and speech bubbles are not sent
                  to other visitors.
                </div>
                <div className="chat-log" role="log">
                  {!messages.length && (
                    <Empty title="Start with a hello.">
                      Write a message to try the chat and speech bubble.
                    </Empty>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className="chat-message">
                      <strong>
                        {state.profile.name}
                        <small>You · just now</small>
                      </strong>
                      <p>{m}</p>
                    </div>
                  ))}
                </div>
                <form
                  className="chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chat.trim()) return;
                    setMessages((m) => [...m.slice(-49), chat.trim()]);
                    bridge.send({ type: "say", text: chat.trim() });
                    setChat("");
                  }}
                >
                  <label className="sr-only" htmlFor="chat-input">
                    Your message
                  </label>
                  <input
                    id="chat-input"
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                    maxLength={160}
                    placeholder="Say something kind…"
                    required
                  />
                  <button className="icon-button" aria-label="Send message">
                    <Send size={19} />
                  </button>
                </form>
              </>
            )}
            {panel === "settings" && (
              <>
                <div className="setting-row">
                  <div>
                    <strong>Do not disturb</strong>
                    <p>
                      Local status preview. Live audio requires the backend.
                    </p>
                  </div>
                  <input
                    aria-label="Do not disturb"
                    type="checkbox"
                    role="switch"
                    checked={dnd}
                    onChange={(e) => setDnd(e.target.checked)}
                  />
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Ambient character motion</strong>
                    <p>Pause NPC movement and idle animations.</p>
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Ambient character motion"
                    checked={state.motion}
                    onChange={(e) =>
                      dispatch({
                        type: "setting",
                        key: "motion",
                        value: e.target.checked,
                      })
                    }
                  />
                </div>
                <div className="notice">
                  <ShieldCheck size={20} />
                  <span>
                    Camera, screen sharing, and proximity voice will use LiveKit
                    with permissions issued by NestJS. They stay off in this
                    frontend build.
                  </span>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTour(0);
                    setShowTour(true);
                  }}
                >
                  <BookOpen size={17} />
                  Show me around
                </button>
                <ButtonLink secondary href={`/events/${eventId}/lobby`}>
                  Change character
                </ButtonLink>
                <Link className="text-link" href={`/events/${eventId}/gallery`}>
                  Prefer browsing a list?
                  <ArrowUpRight size={16} />
                </Link>
              </>
            )}
            {panel === "judge" && state.modules.judging && (
              <>
                <div className="notice small">
                  Preview of the judge interface. Assignment and access checks
                  belong to the backend.
                </div>
                <label className="judge-project-label">
                  Assigned project
                  <select
                    aria-label="Assigned project"
                    value={project.id}
                    onChange={(e) => {
                      const p = projects.find((p) => p.id === e.target.value);
                      if (p) setProject(p);
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Scorecard project={project} />
              </>
            )}
          </div>
        </aside>
      )}
      {showTour && (
        <Dialog
          title={
            [
              "A hall full of possibilities.",
              "Follow your curiosity.",
              "A little closer to the idea.",
            ][tour]
          }
          onClose={finishTour}
        >
          <div className="tour-illustration">
            <img
              src={asset(
                tour === 0
                  ? "assets/maps/exhibition/minimap.png"
                  : `assets/images/step-${tour + 1}.png`,
              )}
              alt=""
            />
          </div>
          <p>
            {
              [
                "Walk with WASD or the arrow keys. You can also click an open spot on the floor.",
                "Use Projects to search by title, team, or keyword. Go to booth takes you straight to the project.",
                "Press E near a booth to explore it. Follow projects, leave feedback, and vote for up to three you have visited.",
              ][tour]
            }
          </p>
          <div className="row between">
            <button className="text-link muted" onClick={finishTour}>
              Skip intro
            </button>
            <button
              className="button"
              onClick={() => (tour < 2 ? setTour(tour + 1) : finishTour())}
            >
              {tour < 2 ? "Next" : "Let’s explore"}
              <ChevronRight size={17} />
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
