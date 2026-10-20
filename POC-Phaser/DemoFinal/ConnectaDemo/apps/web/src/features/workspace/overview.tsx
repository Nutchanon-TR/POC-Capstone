"use client";
import { ButtonLink, PageTitle, SectionHeading, Tag } from "@/components/ui";
import { useApp } from "@/features/session/provider";
import { asset } from "@/lib/assets";
import { ProjectTable, Stats } from "./shared";
export function Overview() {
  const { state, dispatch, notify } = useApp();
  return (
    <>
      <PageTitle
        eyebrow="YOUR EVENT, AT A GLANCE"
        title="Good things are coming together."
        description="A shared space for your projects and the people behind them."
        action={
          <ButtonLink href="/events/senior-showcase">View event</ButtonLink>
        }
      />
      <Stats
        items={[
          {
            label: "Sample projects",
            value: 6,
            note: "5 booth slots in this template",
          },
          {
            label: "Local registrations",
            value: state.registrations.length,
            note: "Saved on this device",
          },
          {
            label: "Submissions",
            value: state.submissions.length,
            note: "Received through this preview",
          },
          {
            label: "Evaluations complete",
            value: state.submittedScores.length,
            note: "Of 6 sample assignments",
          },
        ]}
      />
      <div className="workspace-overview-grid">
        <section className="surface event-overview">
          <div className="row between">
            <span className="eyebrow">CURRENT SHOWCASE</span>
            <Tag tone="live">Frontend preview</Tag>
          </div>
          <h2>
            Senior Design
            <br />
            Showcase 2026
          </h2>
          <p>17 October · 10:00 – 16:00 ICT</p>
          <img
            src={asset("assets/maps/exhibition/minimap.png")}
            alt="The exhibition hall template"
          />
          <div className="row between">
            <span className="small muted">42 × 26 tiles · 5 booths</span>
            <ButtonLink secondary href="/events/senior-showcase/lobby">
              Explore the hall
            </ButtonLink>
          </div>
        </section>
        <section className="surface">
          <h2>Make it your kind of event.</h2>
          <p className="muted">
            Enable the modules you need. Disabled modules disappear from the
            visitor interface.
          </p>
          {(
            [
              {
                key: "judging",
                name: "Project judging",
                text: "Weighted rubrics and private evaluations.",
              },
              {
                key: "feedback",
                name: "Visitor feedback",
                text: "Thoughtful feedback for every project.",
              },
              {
                key: "voting",
                name: "Popular vote",
                text: "Up to three favourites per visitor.",
              },
            ] as const
          ).map((m) => (
            <div className="setting-row" key={m.key}>
              <div>
                <strong>{m.name}</strong>
                <p>{m.text}</p>
              </div>
              <input
                type="checkbox"
                role="switch"
                aria-label={m.name}
                checked={state.modules[m.key]}
                onChange={(e) => {
                  dispatch({
                    type: "modules",
                    modules: { ...state.modules, [m.key]: e.target.checked },
                  });
                  notify("Event modules updated on this device.");
                }}
              />
            </div>
          ))}
          <div className="notice small">
            AI, 3D, billing, account roles, and multi-user delivery will be
            added with their backend services.
          </div>
        </section>
      </div>
      <section className="surface">
        <SectionHeading
          title="The ideas on show."
          description="Sample projects for exploring the complete interface."
        >
          <ButtonLink secondary href="/workspace/projects">
            Manage projects
          </ButtonLink>
        </SectionHeading>
        <ProjectTable />
      </section>
    </>
  );
}
