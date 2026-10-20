"use client";
import { Empty, PageTitle, Tag } from "@/components/ui";
import { projects } from "@/domain/catalog";
import { Scorecard } from "@/features/judging/scorecard";
import { useApp } from "@/features/session/provider";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
export function Judging() {
  const { state, dispatch } = useApp();
  const [projectId, setProjectId] = useState(projects[0].id);
  const p = projects.find((p) => p.id === projectId) ?? projects[0];
  if (!state.modules.judging)
    return (
      <Empty title="Judging is turned off.">
        Enable project judging from the workspace overview to use this module.
      </Empty>
    );
  return (
    <>
      <PageTitle
        title="Give good work a fair hearing."
        description="A weighted rubric, clear criteria, and room for thoughtful feedback."
      />
      <div className="judging-layout">
        <div className="stack">
          <section className="surface">
            <h2>Your assignments.</h2>
            <p className="small muted">
              Six sample assignments · local judge interface
            </p>
            {projects.map((project) => (
              <button
                className={`assignment-row ${projectId === project.id ? "selected" : ""}`}
                onClick={() => setProjectId(project.id)}
                key={project.id}
              >
                <Tag>{project.code}</Tag>
                <span>
                  {project.name}
                  <small>
                    {state.submittedScores.includes(project.id)
                      ? "Complete"
                      : Object.keys(state.scores[project.id] ?? {}).length
                        ? "Draft saved"
                        : "Not started"}
                  </small>
                </span>
                {state.submittedScores.includes(project.id) ? (
                  <Check size={18} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            ))}
          </section>
          <section className="surface">
            <h3>Round controls</h3>
            <p className="small muted">
              Staff preview. Real access and round state will be controlled by
              the server.
            </p>
            <div className="setting-row">
              <span>Close judging round</span>
              <input
                aria-label="Close judging round"
                type="checkbox"
                role="switch"
                checked={state.judgingClosed}
                onChange={(e) =>
                  dispatch({
                    type: "setting",
                    key: "judgingClosed",
                    value: e.target.checked,
                  })
                }
              />
            </div>
            <div className="setting-row">
              <span>Publish local results</span>
              <input
                aria-label="Publish local results"
                type="checkbox"
                role="switch"
                checked={state.resultsPublished}
                onChange={(e) =>
                  dispatch({
                    type: "setting",
                    key: "resultsPublished",
                    value: e.target.checked,
                  })
                }
              />
            </div>
          </section>
        </div>
        <section className="surface">
          <Scorecard project={p} />
        </section>
      </div>
    </>
  );
}
