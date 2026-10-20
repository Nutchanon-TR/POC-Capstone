import { Hall } from "@/features/hall/hall";
export const metadata = { title: "Exhibition hall" };
export default async function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return <Hall eventId={(await params).eventId} />;
}
