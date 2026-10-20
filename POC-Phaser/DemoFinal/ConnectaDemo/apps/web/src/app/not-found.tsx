import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="loading-screen">
      <span className="eyebrow">404 · A SMALL DETOUR</span>
      <h1>Let’s get you back to the ideas.</h1>
      <p>This page or event couldn’t be found.</p>
      <Link href="/events" className="button">
        Discover events
      </Link>
    </main>
  );
}
