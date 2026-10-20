import { Site } from "@/components/shell";
import { Schedule } from "@/features/events/event-detail";
export const metadata = { title: "Schedule" };
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Site>
      <Schedule id={(await params).eventId} />
    </Site>
  );
}
