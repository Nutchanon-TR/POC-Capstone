import { Site } from "@/components/shell";
import { EventDetail } from "@/features/events/event-detail";
export default async function Event({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return (
    <Site>
      <EventDetail id={eventId} />
    </Site>
  );
}
