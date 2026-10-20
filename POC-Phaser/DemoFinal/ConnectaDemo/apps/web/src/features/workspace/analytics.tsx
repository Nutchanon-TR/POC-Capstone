"use client";
import { Empty, PageTitle, SectionHeading, downloadCSV } from "@/components/ui";
import { projects, weightedScore } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { Download } from "lucide-react";
import { Stats } from "./shared";
export function Analytics() {
  const { state } = useApp();
  const completed = state.submittedScores.length;
  return (
    <>
      <PageTitle
        eyebrow="AFTER THE CONVERSATIONS"
        title="See the difference your event made."
        description="A report of activity from this browser. Real audience and spatial analytics connect in the backend phase."
        action={
          <button
            className="button secondary"
            onClick={() =>
              downloadCSV("connecta-local-report.csv", [
                ["project", "visited", "followed", "voted", "evaluation"],
                ...projects.map((p) => [
                  p.name,
                  state.visited.includes(p.id) ? 1 : 0,
                  state.follows.includes(p.id) ? 1 : 0,
                  state.votes.includes(p.id) ? 1 : 0,
                  state.submittedScores.includes(p.id)
                    ? weightedScore(state.scores[p.id] ?? {}).toFixed(1)
                    : "not complete",
                ]),
              ])
            }
          >
            <Download size={17} />
            Export local report
          </button>
        }
      />
      <Stats
        items={[
          {
            label: "Booths visited",
            value: state.visited.length,
            note: "By this visitor",
          },
          {
            label: "Projects followed",
            value: state.follows.length,
            note: "Saved for later",
          },
          {
            label: "Feedback shared",
            value: state.feedback.length,
            note: "From this device",
          },
          {
            label: "Evaluations complete",
            value: completed,
            note: "Of 6 sample assignments",
          },
        ]}
      />
      <div className="analytics-grid">
        <section className="surface">
          <SectionHeading
            title="Every booth has a story."
            description="Your project interactions in this preview."
          />
          <div className="bar-chart">
            {projects.map((p) => (
              <div key={p.id}>
                <span>{p.name}</span>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${([state.visited, state.follows, state.votes].filter((list) => list.includes(p.id)).length / 3) * 100}%`,
                    }}
                  />
                </div>
                <strong>
                  {
                    [state.visited, state.follows, state.votes].filter((list) =>
                      list.includes(p.id),
                    ).length
                  }
                </strong>
              </div>
            ))}
          </div>
          <p className="small muted">
            One point for a visit, follow, and vote. This is not a popularity
            ranking.
          </p>
        </section>
        <section className="surface">
          <h2>Judging results.</h2>
          {state.resultsPublished ? (
            <div className="ranking-list">
              {projects
                .filter((p) => state.submittedScores.includes(p.id))
                .sort(
                  (a, b) =>
                    weightedScore(state.scores[b.id] ?? {}) -
                    weightedScore(state.scores[a.id] ?? {}),
                )
                .map((p, i) => (
                  <div className="row between" key={p.id}>
                    <span>
                      {i + 1}. {p.name}
                    </span>
                    <strong>
                      {weightedScore(state.scores[p.id] ?? {}).toFixed(1)} / 100
                    </strong>
                  </div>
                ))}
              {!completed && (
                <p className="muted">No completed evaluations yet.</p>
              )}
            </div>
          ) : (
            <Empty title="Results stay private for now.">
              Publish the local results in Judging when you are ready.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
