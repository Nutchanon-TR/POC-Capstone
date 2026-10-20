import { Site } from "@/components/shell";
import { Lobby } from "@/features/hall/lobby";
export const metadata = { title: "Choose your character" };
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Site>
      <Lobby eventId={(await params).eventId} />
    </Site>
  );
}
