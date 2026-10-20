"use client";
import { ButtonLink, Empty, PageTitle } from "@/components/ui";
export function Platform() {
  return (
    <>
      <PageTitle
        title="A clear view of the platform."
        description="The administration interface will connect to authenticated platform services."
      />
      <section className="surface">
        <Empty title="Platform services are not connected.">
          Concurrent users, LiveKit health, storage usage, event suspension, and
          audited admin entry will appear after the backend is implemented. No
          fabricated health metrics are shown.
        </Empty>
        <ButtonLink secondary href="/workspace">
          Back to workspace
        </ButtonLink>
      </section>
    </>
  );
}
