import { Site } from "@/components/shell";
import { Profile } from "@/features/session/profile";
export const metadata = { title: "My profile" };
export default function Page() {
  return (
    <Site>
      <Profile />
    </Site>
  );
}
