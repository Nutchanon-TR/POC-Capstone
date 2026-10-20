"use client";
import { Dialog } from "@/components/dialog";
import {
  ButtonLink,
  Empty,
  ProjectCard,
  SectionHeading,
  Tag,
} from "@/components/ui";
import {
  categories,
  projects,
  searchProjects,
  sessions,
  showcases,
  type Showcase,
} from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { asset } from "@/lib/assets";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
export function EventDetail({ id }: { id: string }) {
  const { state } = useApp();
  const local = state.events.find((e) => e.id === id);
  const event: Showcase | undefined =
    showcases.find((e) => e.id === id) ||
    (local
      ? { ...local, status: "upcoming", category: "Community", color: "purple" }
      : undefined);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [register, setRegister] = useState(false);
  if (!event)
    return (
      <Empty title="This event couldn’t be found.">
        <Link href="/events">Discover another event</Link>
      </Empty>
    );
  const isSample = showcases.some((e) => e.id === id);
  const list = isSample ? searchProjects(query, category) : [];
  return (
    <>
      <div className="event-hero">
        <div className="container">
          <Link className="breadcrumb" href="/events">
            Discover events <span>/</span> {event.title}
          </Link>
          <div className="event-hero-grid">
            <div>
              <Tag tone={event.status === "live" ? "live" : ""}>
                {event.status === "live" ? "● Live today" : "Coming up"}
              </Tag>
              <h1>{event.title}</h1>
              <p>{event.description}</p>
              <div className="row event-meta">
                <span>
                  <CalendarDays size={17} />
                  {event.date}
                </span>
                <span>
                  <Clock3 size={17} />
                  {event.time}
                </span>
                <span>
                  <MapPin size={17} />
                  Online · Virtual hall
                </span>
              </div>
              <p className="small">
                Hosted by <strong>{event.host}</strong>
              </p>
              <div className="row wrap">
                {state.registrations.includes(id) ? (
                  <ButtonLink href={`/events/${id}/lobby`}>
                    Enter the showcase
                  </ButtonLink>
                ) : (
                  <button className="button" onClick={() => setRegister(true)}>
                    Register for this event
                    <ArrowUpRight size={18} />
                  </button>
                )}
                <ButtonLink secondary href={`/events/${id}/schedule`}>
                  View the schedule
                </ButtonLink>
              </div>
            </div>
            <div className="event-map-preview">
              <img
                src={asset("assets/maps/exhibition/minimap.png")}
                alt="Exhibition hall with five project booths"
              />
              <span>
                <span className="status-dot" />
                Wander. Discover. Say hello.
              </span>
            </div>
          </div>
        </div>
      </div>
      <section className="container section">
        <SectionHeading
          title="Meet the ideas."
          description={
            isSample
              ? "Six student projects. Plenty of reasons to stop by."
              : "Projects will appear here once submissions are approved."
          }
        >
          <Link href={`/events/${id}/gallery`} className="text-link">
            Project gallery
            <ArrowUpRight size={17} />
          </Link>
        </SectionHeading>
        <div className="discovery-tools">
          <label className="search-box">
            <Search size={18} />
            <input
              aria-label="Search projects"
              type="search"
              placeholder="Find a project, team, or keyword"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="chips">
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
        </div>
        <div className="grid three">
          {list.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              href={`/events/${id}/projects/${p.id}`}
            />
          ))}
        </div>
        {!list.length && (
          <Empty title="No projects here yet.">
            Try another category or check back when projects are published.
          </Empty>
        )}
      </section>
      {register && (
        <Registration eventId={id} onClose={() => setRegister(false)} />
      )}
    </>
  );
}
export function Registration({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    dispatch({
      type: "profile",
      profile: {
        organisation: String(d.get("organisation")),
        position: String(d.get("position")),
        interests: String(d.get("interests")),
        province: String(d.get("province")),
        audience: String(d.get("audience")),
      },
    });
    dispatch({ type: "register", event: eventId });
    onClose();
    router.push(`/events/${eventId}/lobby`);
  }
  return (
    <Dialog title="Your place at the showcase." onClose={onClose}>
      {!state.signedIn ? (
        <>
          <p>
            First, create your local preview profile. Event registration is a
            separate step.
          </p>
          <ButtonLink
            href={`/signin?next=${encodeURIComponent(`/events/${eventId}`)}`}
          >
            Continue to sign in
          </ButtonLink>
        </>
      ) : (
        <form onSubmit={submit} className="stack">
          <p className="muted">
            Help people get to know you. Your contact details stay private.
          </p>
          <div className="form-grid">
            <label>
              Organisation / faculty
              <input
                name="organisation"
                required
                maxLength={100}
                defaultValue={state.profile.organisation}
              />
              <small>Shown on your public profile.</small>
            </label>
            <label>
              Position / year
              <input
                name="position"
                required
                maxLength={80}
                defaultValue={state.profile.position}
              />
              <small>Shown alongside your organisation.</small>
            </label>
          </div>
          <label>
            Interests
            <input
              name="interests"
              required
              maxLength={200}
              defaultValue={state.profile.interests}
              placeholder="Accessibility, climate, design…"
            />
            <small>Used to help you discover relevant projects.</small>
          </label>
          <div className="form-grid">
            <label>
              Audience type
              <select name="audience" defaultValue={state.profile.audience}>
                {[
                  "Student",
                  "Lecturer",
                  "Company",
                  "Alumni",
                  "Family",
                  "School student",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <small>Used in the audience summary.</small>
            </label>
            <label>
              Province
              <input
                name="province"
                required
                maxLength={80}
                defaultValue={state.profile.province}
              />
              <small>Used to understand geographic reach.</small>
            </label>
          </div>
          <label className="check-label">
            <input type="checkbox" required />I agree to show my name, avatar,
            organisation, position, and interests to people in this event.
          </label>
          <button className="button" type="submit">
            Register & choose a character
            <ArrowUpRight size={18} />
          </button>
        </form>
      )}
    </Dialog>
  );
}
export function Schedule({ id }: { id: string }) {
  const { state, dispatch } = useApp();
  return (
    <div className="container section narrow">
      <p className="eyebrow">SENIOR DESIGN SHOWCASE 2026</p>
      <h1>A day worth showing up for.</h1>
      <p className="muted">17 October 2026 · All times in ICT (UTC+7)</p>
      <div className="agenda-list">
        {sessions.map((s) => (
          <article className="agenda-item" key={s.id}>
            <div className="agenda-time">
              <strong>{s.time}</strong>
              <small>{s.end}</small>
            </div>
            <div className="agenda-content">
              <Tag>{s.type}</Tag>
              <h3>{s.title}</h3>
              <p>{s.speaker}</p>
              <div className="row wrap">
                {s.project && (
                  <Link
                    className="text-link"
                    href={`/events/${id}/projects/${s.project}`}
                  >
                    Explore project
                    <ArrowUpRight size={16} />
                  </Link>
                )}
                <button
                  className={`button small-button ${state.agenda.includes(s.id) ? "" : "secondary"}`}
                  onClick={() =>
                    dispatch({ type: "toggle", collection: "agenda", id: s.id })
                  }
                >
                  {state.agenda.includes(s.id) ? (
                    <Check size={15} />
                  ) : (
                    <Bookmark size={15} />
                  )}{" "}
                  {state.agenda.includes(s.id)
                    ? "On my agenda"
                    : "Add to my agenda"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
export function Gallery({ id }: { id: string }) {
  return (
    <div className="container section">
      <SectionHeading
        title="Good ideas stay with you."
        description="Explore the work beyond the event. Revisit a project or discover one you missed."
      />
      <div className="grid three">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            href={`/events/${id}/projects/${p.id}`}
          />
        ))}
      </div>
    </div>
  );
}
