import { Site } from "@/components/shell";
import { Discovery } from "@/features/events/discovery";
export const metadata = { title: "Discover events" };
export default function Events() {
  return (
    <Site>
      <Discovery />
    </Site>
  );
}
