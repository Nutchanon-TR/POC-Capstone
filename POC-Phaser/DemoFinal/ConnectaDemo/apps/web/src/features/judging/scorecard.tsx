"use client";
import {
  rubric,
  validScores,
  weightedScore,
  type Project,
} from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { Check, LockKeyhole } from "lucide-react";
export function Scorecard({ project }: { project: Project }) {
  const { state, dispatch, notify } = useApp();
  const scores = state.scores[project.id] ?? {};
  if (!state.modules.judging) return null;
  return (
    <section className="scorecard">
      <div className="row between">
        <span className="eyebrow">PRIVATE JUDGE WORKSPACE</span>
        <span className="small muted row">
          {state.judgingClosed ? (
            <>
              <LockKeyhole size={14} />
              Round closed
            </>
          ) : (
            <>
              <Check size={14} />
              Saved on this device
            </>
          )}
        </span>
      </div>
      <h3>{project.title}</h3>
      <p className="small muted">
        Score each criterion from 1 to 5. You can edit until the judging round
        closes.
      </p>
      {rubric.map((c) => (
        <fieldset key={c.id} disabled={state.judgingClosed}>
          <legend>
            {c.name}
            <span>{c.weight}%</span>
          </legend>
          <p>{c.description}</p>
          <div className="score-options">
            {[1, 2, 3, 4, 5].map((n) => (
              <label className={scores[c.id] === n ? "selected" : ""} key={n}>
                <input
                  type="radio"
                  name={`${project.id}-${c.id}`}
                  value={n}
                  checked={scores[c.id] === n}
                  onChange={() =>
                    dispatch({
                      type: "score",
                      project: project.id,
                      criterion: c.id,
                      value: n,
                    })
                  }
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label>
        Private notes
        <textarea
          maxLength={2000}
          rows={3}
          value={state.notes[project.id] ?? ""}
          disabled={state.judgingClosed}
          onChange={(e) =>
            dispatch({
              type: "note",
              project: project.id,
              value: e.target.value,
            })
          }
          placeholder="Only you can see these notes in the preview."
        />
      </label>
      <div className="score-total">
        <span>Weighted total</span>
        <strong>
          {weightedScore(scores).toFixed(1)}
          <small> / 100</small>
        </strong>
      </div>
      <button
        className="button wide-button"
        disabled={
          !validScores(scores) ||
          state.judgingClosed ||
          state.submittedScores.includes(project.id)
        }
        onClick={() => {
          dispatch({ type: "submit-score", project: project.id });
          notify("Evaluation marked complete on this device.");
        }}
      >
        {state.submittedScores.includes(project.id)
          ? "Evaluation complete"
          : "Complete evaluation"}
        <Check size={17} />
      </button>
    </section>
  );
}
