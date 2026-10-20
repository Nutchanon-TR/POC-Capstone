import { Site } from "@/components/shell";
import { Gallery } from "@/features/events/event-detail";
export const metadata = { title: "Project gallery" };
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Site>
      <Gallery id={(await params).eventId} />
    </Site>
  );
}
