import { Site } from "@/components/shell";
import { ProjectDetail } from "@/features/projects/project-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string; projectId: string }>;
}) {
  const p = await params;
  return (
    <Site>
      <ProjectDetail {...p} />
    </Site>
  );
}
