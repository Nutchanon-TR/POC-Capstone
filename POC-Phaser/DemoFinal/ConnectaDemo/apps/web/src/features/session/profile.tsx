"use client";
import {
  ButtonLink,
  Empty,
  PageTitle,
  Portrait,
  ProjectCard,
  Tag,
  downloadCSV,
} from "@/components/ui";
import { characters, projects } from "@/domain/catalog";
import { Check, Download, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "./provider";
export function Profile() {
  const { state, dispatch, notify } = useApp();
  const [tab, setTab] = useState("Profile");
  return (
    <div className="container section">
      <PageTitle
        eyebrow="YOUR CORNER OF CONNECTA"
        title="A little about you."
        description="Choose what you share, and keep the conversations going."
      />
      <div className="tabs" role="tablist" aria-label="Profile sections">
        {["Profile", "Saved projects", "Contacts"].map((t) => (
          <button
            id={`tab-${t.replaceAll(" ", "-")}`}
            aria-controls="profile-content"
            role="tab"
            aria-selected={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div
        id="profile-content"
        role="tabpanel"
        aria-labelledby={`tab-${tab.replaceAll(" ", "-")}`}
      >
        {tab === "Profile" && (
          <form
            className="profile-layout"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              dispatch({
                type: "profile",
                profile: {
                  name: String(d.get("name")).trim(),
                  organisation: String(d.get("organisation")).trim(),
                  position: String(d.get("position")).trim(),
                  interests: String(d.get("interests")).trim(),
                  email: String(d.get("email")).trim(),
                  publicContact: d.get("publicContact") === "on",
                },
              });
              notify("Your profile has been saved on this device.");
            }}
          >
            <section className="surface stack">
              <h2>Put a face to the name.</h2>
              <div className="profile-avatar">
                <Portrait index={state.profile.avatar} size={130} />
                <strong>{characters[state.profile.avatar].name}</strong>
                <span className="small muted">Your preset character</span>
              </div>
              <div className="profile-character-list">
                {characters.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-label={`Choose ${c.name}`}
                    aria-pressed={state.profile.avatar === c.id}
                    className={state.profile.avatar === c.id ? "selected" : ""}
                    onClick={() =>
                      dispatch({ type: "profile", profile: { avatar: c.id } })
                    }
                  >
                    <Portrait index={c.id} size={43} />
                  </button>
                ))}
              </div>
            </section>
            <div className="stack">
              <section className="surface stack">
                <div className="row between">
                  <h2>Your public profile.</h2>
                  <Tag>Visible in events</Tag>
                </div>
                <label>
                  Display name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={state.profile.name}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Organisation / faculty
                    <input
                      name="organisation"
                      maxLength={100}
                      defaultValue={state.profile.organisation}
                    />
                  </label>
                  <label>
                    Position / year
                    <input
                      name="position"
                      maxLength={80}
                      defaultValue={state.profile.position}
                    />
                  </label>
                </div>
                <label>
                  Interests
                  <input
                    name="interests"
                    maxLength={200}
                    defaultValue={state.profile.interests}
                  />
                </label>
              </section>
              <section className="surface stack">
                <div className="row between">
                  <h2>Keep some things private.</h2>
                  <LockKeyhole size={20} />
                </div>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={state.profile.email}
                  />
                </label>
                <p className="small muted">
                  Contact details remain private until you both agree to
                  exchange them.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    name="publicContact"
                    defaultChecked={state.profile.publicContact}
                  />
                  Allow everyone at an event to see my contact details.
                </label>
              </section>
              <button className="button align-end" type="submit">
                Save my profile
                <Check size={17} />
              </button>
            </div>
          </form>
        )}
        {tab === "Saved projects" && (
          <>
            {state.follows.length ? (
              <div className="grid three">
                {projects
                  .filter((p) => state.follows.includes(p.id))
                  .map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      href={`/events/senior-showcase/projects/${p.id}`}
                    />
                  ))}
              </div>
            ) : (
              <Empty title="A place for the ideas that stay with you.">
                Follow a project and find it here after the event.
              </Empty>
            )}
          </>
        )}
        {tab === "Contacts" && (
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>Connections worth keeping.</h2>
                <p>Private details appear only after a mutual exchange.</p>
              </div>
              <button
                className="button secondary small-button"
                disabled={!state.contacts.some((c) => c.status === "connected")}
                onClick={() =>
                  downloadCSV("connecta-contacts.csv", [
                    ["name"],
                    ...state.contacts
                      .filter((c) => c.status === "connected")
                      .map((c) => [c.name]),
                  ])
                }
              >
                <Download size={16} />
                Export contacts
              </button>
            </div>
            {state.contacts.length ? (
              state.contacts.map((c) => (
                <div className="contact-row" key={c.name}>
                  <span className="mini-mark">
                    <UserRound size={22} />
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <p className="small muted">
                      {c.status === "requested"
                        ? "Waiting for a mutual exchange. Contact details stay private."
                        : "Contact exchange accepted."}
                    </p>
                  </div>
                  <Tag>
                    {c.status === "requested" ? "Request sent" : "Connected"}
                  </Tag>
                </div>
              ))
            ) : (
              <Empty title="The best ideas often start with a person.">
                Visit a project and request a contact exchange with its
                presenter.
              </Empty>
            )}
            <div className="notice small">
              Requests are stored locally in this preview. Sending, accepting,
              and exporting private details require the backend.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
export function Recap({ eventId }: { eventId: string }) {
  const { state } = useApp();
  return (
    <div className="container section">
      <div className="recap-heading">
        <span className="eyebrow">THANKS FOR SHOWING UP</span>
        <h1>A few ideas to take with you.</h1>
        <p>
          Every visit is a chance to see something differently. Here’s a little
          of what you explored.
        </p>
        <div className="recap-stats">
          <div>
            <strong>{state.visited.length}</strong>
            <span>booths visited</span>
          </div>
          <div>
            <strong>{state.follows.length}</strong>
            <span>projects followed</span>
          </div>
          <div>
            <strong>{state.votes.length}</strong>
            <span>favourites chosen</span>
          </div>
        </div>
      </div>
      <h2>Keep the curiosity going.</h2>
      {state.follows.length ? (
        <div className="grid three">
          {projects
            .filter((p) => state.follows.includes(p.id))
            .map((p) => (
              <ProjectCard
                project={p}
                key={p.id}
                href={`/events/${eventId}/projects/${p.id}`}
              />
            ))}
        </div>
      ) : (
        <Empty title="You can always come back for another look.">
          The project gallery is here whenever you feel curious.
        </Empty>
      )}
      <div className="row recap-actions">
        <ButtonLink href={`/events/${eventId}/gallery`}>
          Explore the gallery
        </ButtonLink>
        <ButtonLink secondary href="/profile">
          Your connections
        </ButtonLink>
      </div>
    </div>
  );
}
