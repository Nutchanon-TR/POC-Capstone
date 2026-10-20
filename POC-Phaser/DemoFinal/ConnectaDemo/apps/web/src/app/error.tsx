"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="loading-screen">
      <h1>Something interrupted the visit.</h1>
      <p>Your saved changes are still on this device.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
