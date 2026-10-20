"use client";
import { PageTitle } from "@/components/ui";
import { useApp } from "@/features/session/provider";
import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";
export function CreateEvent() {
  const { dispatch, notify } = useApp();
  const router = useRouter();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const access = d.get("access") === "INVITE" ? "INVITE" : "PUBLIC";
    dispatch({
      type: "event",
      event: {
        id: `event-${crypto.randomUUID()}`,
        title: String(d.get("title")).trim(),
        host: String(d.get("host")).trim(),
        date: String(d.get("date")),
        time: String(d.get("time")),
        description: String(d.get("description")).trim(),
        access,
        domains: String(d.get("domains")),
      },
    });
    notify("Event saved in your local workspace.");
    router.push("/events");
  }
  return (
    <>
      <PageTitle
        eyebrow="MAKE SOMETHING HAPPEN"
        title="A place for your community."
        description="Start with the essentials. Give your event a name, a purpose, and a date."
      />
      <form onSubmit={submit} className="form-page">
        <section className="surface stack">
          <h2>The big picture.</h2>
          <label>
            Event name
            <input
              name="title"
              required
              minLength={3}
              maxLength={100}
              placeholder="An event people will remember"
            />
          </label>
          <label>
            Hosted by
            <input
              name="host"
              required
              minLength={2}
              maxLength={100}
              placeholder="University, faculty, or community"
            />
          </label>
          <label>
            About your event
            <textarea
              name="description"
              required
              maxLength={2000}
              rows={4}
              placeholder="What brings your community together?"
            />
          </label>
          <div className="form-grid">
            <label>
              Date
              <input name="date" type="date" required />
            </label>
            <label>
              Start time (ICT)
              <input name="time" type="time" required />
            </label>
          </div>
        </section>
        <section className="surface stack">
          <h2>Who’s invited?</h2>
          <label>
            Access mode
            <select name="access">
              <option value="PUBLIC">Public · anyone can register</option>
              <option value="INVITE">Invite · approved email or domain</option>
            </select>
          </label>
          <label>
            Allowed email domains
            <input name="domains" placeholder="kmutt.ac.th, example.org" />
            <small>
              Recorded for backend enforcement. This preview does not verify
              invitations.
            </small>
          </label>
          <label>
            Hall template
            <select name="template">
              <option>Campus exhibition · 5 booth slots</option>
            </select>
          </label>
          <div className="notice small">
            Creates a local event draft. Publishing, invitations, and automatic
            hall allocation require the backend.
          </div>
        </section>
        <div className="row between">
          <Link className="button secondary" href="/workspace">
            Cancel
          </Link>
          <button className="button" type="submit">
            Save event draft
            <Check size={17} />
          </button>
        </div>
      </form>
    </>
  );
}
