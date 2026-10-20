"use client";
import { Dialog } from "@/components/dialog";
import { ButtonLink, Empty, Portrait, Poster, Tag } from "@/components/ui";
import { projects, type Project } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { Bookmark, Flag, Heart, Maximize2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
export function ProjectActions({ project: p }: { project: Project }) {
  const { state, dispatch, notify } = useApp();
  return (
    <div className="row wrap">
      <button
        className={`button small-button ${state.follows.includes(p.id) ? "" : "secondary"}`}
        onClick={() =>
          dispatch({ type: "toggle", collection: "follows", id: p.id })
        }
      >
        <Bookmark size={16} />
        {state.follows.includes(p.id) ? "Following" : "Follow project"}
      </button>
      {state.modules.voting && (
        <button
          className={`button small-button ${state.votes.includes(p.id) ? "" : "secondary"}`}
          disabled={
            !state.visited.includes(p.id) ||
            (!state.votes.includes(p.id) && state.votes.length >= 3)
          }
          onClick={() => {
            dispatch({ type: "vote", id: p.id });
            notify(
              state.votes.includes(p.id)
                ? "Vote removed."
                : "Your vote is saved on this device.",
            );
          }}
          title={
            !state.visited.includes(p.id)
              ? "Visit this booth before voting."
              : "Up to three projects."
          }
        >
          <Heart size={16} />
          {state.votes.includes(p.id) ? "Voted" : "Vote"}
        </button>
      )}
    </div>
  );
}
export function Feedback({ project }: { project: string }) {
  const { state, dispatch, notify } = useApp();
  const [text, setText] = useState("");
  if (!state.modules.feedback) return null;
  const list = state.feedback.filter((f) => f.project === project && !f.hidden);
  return (
    <section className="feedback-section">
      <h3>A thought worth sharing?</h3>
      <p className="small muted">
        Feedback appears anonymously in the preview. In the full app, staff can
        identify authors for moderation.
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          dispatch({
            type: "feedback",
            entry: {
              id: crypto.randomUUID(),
              project,
              text: text.trim(),
              hidden: false,
            },
          });
          setText("");
          notify("Your feedback is saved. Thank you.");
        }}
      >
        <label className="sr-only" htmlFor={`feedback-${project}`}>
          Your feedback
        </label>
        <textarea
          id={`feedback-${project}`}
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What stood out? What could be even better?"
          rows={3}
        />
        <div className="row between">
          <span className="small muted">{text.length}/500</span>
          <button className="button small-button" type="submit">
            Share feedback
            <MessageSquare size={15} />
          </button>
        </div>
      </form>
      {list.map((f) => (
        <article key={f.id} className="feedback-entry">
          <Tag>Anonymous visitor</Tag>
          <p>{f.text}</p>
        </article>
      ))}
    </section>
  );
}
export function ProjectDetail({
  eventId,
  projectId,
}: {
  eventId: string;
  projectId: string;
}) {
  const p = projects.find((p) => p.id === projectId);
  const { state, dispatch, notify } = useApp();
  const [poster, setPoster] = useState(false);
  const [report, setReport] = useState(false);
  if (!p)
    return (
      <Empty title="Project not found.">
        <Link href={`/events/${eventId}`}>Back to the showcase</Link>
      </Empty>
    );
  return (
    <div className="container section">
      <Link href={`/events/${eventId}`} className="breadcrumb">
        Showcase <span>/</span> {p.code}
      </Link>
      <div className="project-detail-grid">
        <div className="project-poster-column">
          <button
            className="poster-zoom"
            aria-label="Open project poster"
            onClick={() => setPoster(true)}
          >
            <Poster project={p} />
            <span>
              <Maximize2 size={18} />
              Expand poster
            </span>
          </button>
          <div className="notice small">
            Illustrative project poster · sample project content
          </div>
        </div>
        <div className="project-detail-copy">
          <div className="row wrap">
            <Tag>{p.code}</Tag>
            <Tag>{p.category}</Tag>
          </div>
          <h1>{p.title}</h1>
          <p className="lead">{p.description}</p>
          <ProjectActions project={p} />
          <div className="divider" />
          <h3>Meet the makers</h3>
          <div className="maker-card">
            <Portrait index={p.character} size={56} />
            <div>
              <strong>{p.presenter}</strong>
              <p>{p.name} · KMUTT</p>
            </div>
            <button
              className="button secondary small-button"
              disabled={state.contacts.some((c) => c.name === p.presenter)}
              onClick={() => {
                dispatch({ type: "contact", name: p.presenter });
                notify(
                  "Contact request saved. Private details stay hidden until both people accept.",
                );
              }}
            >
              {state.contacts.some((c) => c.name === p.presenter)
                ? "Requested"
                : "Exchange contact"}
            </button>
          </div>
          {p.slot ? (
            <ButtonLink href={`/events/${eventId}/hall?project=${p.id}`}>
              Visit the booth
            </ButtonLink>
          ) : (
            <div className="notice">
              This project has no booth assigned in this hall. Explore its
              poster here.
            </div>
          )}
          <Feedback project={p.id} />
          <button className="text-link muted" onClick={() => setReport(true)}>
            <Flag size={15} />
            Report this project
          </button>
        </div>
      </div>
      {poster && (
        <Dialog
          title={`${p.name} · project poster`}
          wide
          onClose={() => setPoster(false)}
        >
          <div className="expanded-poster">
            <Poster project={p} />
          </div>
        </Dialog>
      )}
      {report && (
        <Dialog
          title="Help keep this space welcoming."
          onClose={() => setReport(false)}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              dispatch({
                type: "report",
                entry: {
                  id: crypto.randomUUID(),
                  target: p.name,
                  reason: String(d.get("reason")),
                  resolved: false,
                },
              });
              setReport(false);
              notify("Report saved in the local moderation queue.");
            }}
          >
            <label>
              Reason
              <textarea
                name="reason"
                required
                minLength={5}
                maxLength={500}
                rows={4}
                placeholder="Tell staff what happened."
              />
            </label>
            <p className="small muted">
              This preview records reports locally. Staff delivery requires the
              backend.
            </p>
            <button className="button">Save report</button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
