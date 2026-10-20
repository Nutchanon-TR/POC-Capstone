"use client";
import { ButtonLink, PageTitle } from "@/components/ui";
import { ProjectTable } from "./shared";
export function ProjectsWorkspace() {
  return (
    <>
      <PageTitle
        title="Give every idea a place."
        description="Review the project catalogue and its booth assignments."
        action={
          <ButtonLink href="/workspace/submissions">
            Review submissions
          </ButtonLink>
        }
      />
      <section className="surface">
        <div className="notice">
          This Tiled template contains five booth slots. Open Notes remains
          unassigned; opening additional halls requires the backend allocation
          workflow.
        </div>
        <ProjectTable />
      </section>
    </>
  );
}
