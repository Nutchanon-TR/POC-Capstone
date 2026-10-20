"use client";
import { DemoNotice } from "@/components/shell";
import { ButtonLink, PageTitle, Portrait } from "@/components/ui";
import { characters } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { asset } from "@/lib/assets";
import { ArrowUpRight, Camera, Check, Mic, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
export function Lobby({ eventId }: { eventId: string }) {
  const { state, dispatch, ready } = useApp();
  const router = useRouter();
  const [camera, setCamera] = useState(false);
  const [pending, setPending] = useState(false);
  const requesting = useRef(false);
  const [error, setError] = useState("");
  const [meter, setMeter] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanupRef.current?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function preview() {
    if (requesting.current) return;
    if (camera) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamera(false);
      setMeter(0);
      return;
    }
    requesting.current = true;
    setPending(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 },
        audio: true,
      });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
      const ctx = new AudioContext();
      let frame = 0;
      cleanupRef.current = () => {
        cancelAnimationFrame(frame);
        if (ctx.state !== "closed") void ctx.close();
      };
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastSample = 0;
      const tick = (time: number) => {
        if (time - lastSample >= 100) {
          lastSample = time;
          analyser.getByteFrequencyData(data);
          setMeter(
            Math.min(100, (data.reduce((a, b) => a + b, 0) / data.length) * 2),
          );
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    } catch (e) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamera(false);
      setError(
        e instanceof Error
          ? e.message
          : "Unable to access the selected devices.",
      );
    } finally {
      requesting.current = false;
      if (mounted.current) setPending(false);
    }
  }
  if (!ready)
    return <div className="loading-screen">Loading your profile…</div>;
  if (!state.signedIn)
    return (
      <div className="container section">
        <PageTitle
          title="A quick hello before you enter."
          description="Create your local profile, then register for this event."
        />
        <ButtonLink
          href={`/signin?next=${encodeURIComponent(`/events/${eventId}`)}`}
        >
          Continue to sign in
        </ButtonLink>
      </div>
    );
  if (!state.registrations.includes(eventId))
    return (
      <div className="container section">
        <PageTitle
          title="Save your place first."
          description="Registration tells the event a little about who’s coming."
        />
        <ButtonLink href={`/events/${eventId}`}>
          Go to event registration
        </ButtonLink>
      </div>
    );
  return (
    <div className="container section">
      <PageTitle
        eyebrow="ONE LAST THING"
        title="A character that feels like you."
        description="Choose your look. Make yourself comfortable. The ideas are waiting."
      />
      <div className="lobby-grid">
        <section className="surface character-picker">
          <div className="row between">
            <h2>Meet your other self.</h2>
            <span className="small muted">14 characters</span>
          </div>
          <div className="character-stage">
            <div className="character-halo" />
            <div
              className={`idle-preview ${characters[state.profile.avatar].idle ? "has-idle" : ""}`}
              style={{
                backgroundImage: `url(${asset(characters[state.profile.avatar].idle || characters[state.profile.avatar].walk)})`,
              }}
            />
            <span className="name-bubble">
              {state.profile.name} <span>You</span>
            </span>
          </div>
          <div className="character-grid">
            {characters.map((c) => (
              <button
                className={`character-option ${state.profile.avatar === c.id ? "selected" : ""}`}
                key={c.id}
                title={c.name}
                aria-label={`Choose ${c.name}`}
                aria-pressed={state.profile.avatar === c.id}
                onClick={() =>
                  dispatch({ type: "profile", profile: { avatar: c.id } })
                }
              >
                <Portrait index={c.id} size={62} />
                {state.profile.avatar === c.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </section>
        <div className="stack">
          <section className="surface device-card">
            <h2>Check in, comfortably.</h2>
            <p className="muted">
              Device preview stays on this device. Nothing is broadcast.
            </p>
            <div className={`video-preview ${camera ? "active" : ""}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                hidden={!camera}
              />
              {!camera && (
                <>
                  <Camera size={30} />
                  <span>Your camera is off</span>
                </>
              )}
            </div>
            <div className="row between">
              <span className="small row">
                <Mic size={17} />
                Microphone level
              </span>
              <div className="audio-meter">
                <span style={{ width: `${meter}%` }} />
              </div>
            </div>
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => void preview()}
            >
              <Camera size={17} />
              {pending
                ? "Waiting for device access…"
                : camera
                  ? "Stop device preview"
                  : "Preview camera & microphone"}
            </button>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="small muted row">
              <ShieldCheck size={17} />
              You decide when to turn on your devices.
            </div>
          </section>
          <section className="surface enter-card">
            <div className="row between">
              <div>
                <h3>Ready, {state.profile.name.split(" ")[0]}?</h3>
                <p>Senior Design Showcase 2026</p>
              </div>
              <span className="tag live">Local hall</span>
            </div>
            <button
              className="button wide-button"
              onClick={() => router.push(`/events/${eventId}/hall`)}
            >
              Enter the showcase
              <ArrowUpRight size={18} />
            </button>
            <p className="small muted">
              Walk with WASD or arrows. Click the floor to move.
            </p>
          </section>
        </div>
      </div>
      <DemoNotice />
    </div>
  );
}
