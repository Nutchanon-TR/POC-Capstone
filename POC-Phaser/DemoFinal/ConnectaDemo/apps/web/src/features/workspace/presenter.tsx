"use client";
import { ButtonLink, Empty, PageTitle, Poster, Tag } from "@/components/ui";
import { projects } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { Check, Clock3, Eye, EyeOff } from "lucide-react";
export function Presenter() {
  const { state, dispatch } = useApp();
  const p = projects[0];
  const feedback = state.feedback.filter((f) => f.project === p.id);
  return (
    <>
      <PageTitle
        eyebrow="PRESENTER WORKSPACE"
        title="Your idea. Your place to shine."
        description="Prepare your booth and see what your visitors have to say."
        action={
          <ButtonLink href="/events/senior-showcase/projects/aurora">
            Preview my booth
          </ButtonLink>
        }
      />
      <div className="presenter-grid">
        <section className="surface">
          <Tag>{p.code} · Sample presenter booth</Tag>
          <h2>{p.title}</h2>
          <Poster project={p} compact />
          <p>{p.description}</p>
          <div className="notice small">
            Poster and media uploads will use MinIO signed URLs. The local
            preview uses the supplied sample assets.
          </div>
        </section>
        <div className="stack">
          <section className="surface">
            <h2>Ready to meet your visitors?</h2>
            <p className="muted">
              Start with your project story, then make space for questions.
            </p>
            <div className="checklist">
              <span>
                <Check size={17} />
                Project summary
              </span>
              <span>
                <Check size={17} />
                Poster preview
              </span>
              <span>
                <Check size={17} />
                Team profile
              </span>
              <span>
                <Clock3 size={17} />
                Connect live media in backend phase
              </span>
            </div>
            <ButtonLink href="/events/senior-showcase/lobby">
              Enter the showcase
            </ButtonLink>
          </section>
          <section className="surface">
            <h2>From your visitors.</h2>
            {!feedback.length && (
              <Empty title="The conversation starts here.">
                Feedback left at your booth will appear here.
              </Empty>
            )}
            {feedback.map((f) => (
              <article className="feedback-entry" key={f.id}>
                <div className="row between">
                  <Tag>{f.hidden ? "Hidden" : "Anonymous visitor"}</Tag>
                  <button
                    className="icon-button"
                    aria-label={f.hidden ? "Show feedback" : "Hide feedback"}
                    onClick={() =>
                      dispatch({ type: "hide-feedback", id: f.id })
                    }
                  >
                    {f.hidden ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                </div>
                <p>{f.text}</p>
              </article>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
