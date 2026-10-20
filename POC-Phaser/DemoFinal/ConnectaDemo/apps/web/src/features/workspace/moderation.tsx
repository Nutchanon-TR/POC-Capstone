"use client";
import { Empty, PageTitle, Tag } from "@/components/ui";
import { useApp } from "@/features/session/provider";
import { Check } from "lucide-react";
import { Stats } from "./shared";
export function Moderation() {
  const { state, dispatch } = useApp();
  return (
    <>
      <PageTitle
        eyebrow="A WELCOMING SPACE, TOGETHER"
        title="Keep the conversations kind."
        description="Review local reports and record a resolution."
      />
      <Stats
        items={[
          {
            label: "Open reports",
            value: state.reports.filter((r) => !r.resolved).length,
            note: "Local preview queue",
          },
          {
            label: "Resolved",
            value: state.reports.filter((r) => r.resolved).length,
            note: "Recorded on this device",
          },
          {
            label: "Hidden feedback",
            value: state.feedback.filter((f) => f.hidden).length,
            note: "Hidden by the presenter",
          },
        ]}
      />
      <section className="surface">
        <h2>Report queue</h2>
        {!state.reports.length ? (
          <Empty title="A quiet queue is a good thing.">
            Reports from project pages will appear here for review.
          </Empty>
        ) : (
          state.reports.map((r) => (
            <article className="report-entry" key={r.id}>
              <div>
                <Tag tone={r.resolved ? "live" : ""}>
                  {r.resolved ? "Resolved" : "Needs review"}
                </Tag>
                <h3>{r.target}</h3>
                <p>{r.reason}</p>
              </div>
              <button
                className="button secondary small-button"
                disabled={r.resolved}
                onClick={() => dispatch({ type: "resolve-report", id: r.id })}
              >
                Mark resolved
                <Check size={16} />
              </button>
            </article>
          ))
        )}
        <div className="notice small">
          Live mute, kick, ban, emergency controls, and immutable audit logs
          require authenticated server enforcement.
        </div>
      </section>
    </>
  );
}
