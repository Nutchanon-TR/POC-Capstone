import { WorkspaceShell } from "@/components/shell";
import { Overview } from "@/features/workspace/workspace";
export const metadata = { title: "My workspace" };
export default function Page() {
  return (
    <WorkspaceShell>
      <Overview />
    </WorkspaceShell>
  );
}
