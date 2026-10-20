import { Site } from "@/components/shell";
import { ButtonLink, Portrait, SectionHeading } from "@/components/ui";
import { showcases } from "@/domain/catalog";
import { EventCard } from "@/features/events/event-card";
import { asset } from "@/lib/assets";
import {
  MessagesSquare,
  MousePointer2,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
export default function Home() {
  return (
    <Site>
      <section className="hero container">
        <div className="hero-copy">
          <span className="pill">
            <span className="status-dot" />A new way to show up.
          </span>
          <h1>
            Good ideas.
            <br />
            Great people.
            <br />
            <span>One shared space.</span>
          </h1>
          <p>
            Step into a showcase that feels a little more human. Explore student
            projects, meet their makers, and find your next spark.
          </p>
          <div className="row hero-actions">
            <ButtonLink href="/events">Find your next event</ButtonLink>
            <ButtonLink secondary href="/events/senior-showcase">
              Take a look around
            </ButtonLink>
          </div>
          <div className="hero-social">
            <div className="avatar-stack">
              {[0, 9, 8, 12].map((i) => (
                <Portrait key={i} index={i} size={38} />
              ))}
            </div>
            <span>
              Made for curious minds.
              <br />
              <strong>And the ideas that bring them together.</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-frame">
            <img
              src={asset("assets/images/lobby.png")}
              alt="A welcoming virtual university lobby with project booths and people"
              fetchPriority="high"
            />
            <div className="hero-image-label">
              <span className="status-dot" />
              Your next conversation starts here.
            </div>
          </div>
          <div className="float-note note-top">
            <span className="mini-mark lavender">
              <Sparkles size={20} />
            </span>
            <div>
              Big ideas. Small steps.<small>Everyone has a place here.</small>
            </div>
          </div>
          <div className="float-note note-bottom">
            <Portrait index={9} size={45} />
            <div>
              “Come see what we made!”<small>Prae · Student presenter</small>
            </div>
            <span className="cursor-label">
              <MousePointer2 size={15} />
              You
            </span>
          </div>
          <span className="orbit-star">✳</span>
        </div>
      </section>
      <div className="trust-strip">
        <span>BUILT FOR THE MOMENTS BETWEEN THE SLIDES</span>
        <span>Explore freely</span>
        <span>Meet the makers</span>
        <span>Start a conversation</span>
      </div>
      <section className="container section">
        <SectionHeading
          title="A little curiosity goes a long way."
          description="Find something that makes you stop, think, and say hello."
        >
          <ButtonLink secondary href="/events">
            All events
          </ButtonLink>
        </SectionHeading>
        <div className="grid three">
          {showcases.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <p className="eyebrow">LESS WATCHING. MORE CONNECTING.</p>
          <h2>
            Show up as yourself.
            <br />
            Leave with a new perspective.
          </h2>
          <div className="grid three how-grid">
            {[
              {
                n: "01",
                icon: <MousePointer2 />,
                title: "Find your way in",
                text: "Choose a character and step into a shared, walkable exhibition.",
              },
              {
                n: "02",
                icon: <Sparkles />,
                title: "Follow your curiosity",
                text: "Wander through projects, explore posters, and meet the people behind the work.",
              },
              {
                n: "03",
                icon: <MessagesSquare />,
                title: "Make a connection",
                text: "Ask a question, save an idea, and keep in touch after the event.",
              },
            ].map((s) => (
              <article key={s.n}>
                <div className="row between">
                  <span className="how-icon">{s.icon}</span>
                  <span className="step-number">{s.n}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="home-cta">
          <span className="eyebrow">BRING YOUR COMMUNITY TOGETHER</span>
          <h2>
            Your ideas deserve
            <br />a place to meet.
          </h2>
          <ButtonLink href="/workspace/create-event">
            Create a showcase
          </ButtonLink>
          <MoveUpRight className="cta-arrow" size={180} strokeWidth={0.8} />
          <div
            className="walking-character"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${asset("assets/characters/character-01-walk.png")})`,
            }}
          />
        </div>
      </section>
    </Site>
  );
}
