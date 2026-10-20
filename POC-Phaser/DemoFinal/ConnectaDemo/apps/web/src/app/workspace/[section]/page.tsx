import { WorkspaceShell } from "@/components/shell";
import {
  Analytics,
  CreateEvent,
  Judging,
  Moderation,
  Platform,
  Presenter,
  ProjectsWorkspace,
  SubmissionForm,
  Submissions,
} from "@/features/workspace/workspace";
import { notFound } from "next/navigation";
const sections: Record<string, React.ComponentType> = {
  projects: ProjectsWorkspace,
  "create-event": CreateEvent,
  submit: SubmissionForm,
  submissions: Submissions,
  judging: Judging,
  presenter: Presenter,
  moderation: Moderation,
  analytics: Analytics,
  platform: Platform,
};
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const Section = Object.hasOwn(sections, section)
    ? sections[section]
    : undefined;
  if (!Section) notFound();
  return (
    <WorkspaceShell>
      <Section />
    </WorkspaceShell>
  );
}
