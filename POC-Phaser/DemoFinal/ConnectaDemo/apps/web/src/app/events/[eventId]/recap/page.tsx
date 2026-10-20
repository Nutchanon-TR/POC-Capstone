import { Site } from "@/components/shell";
import { Recap } from "@/features/session/profile";
export const metadata = { title: "Your event recap" };
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Site>
      <Recap eventId={(await params).eventId} />
    </Site>
  );
}
