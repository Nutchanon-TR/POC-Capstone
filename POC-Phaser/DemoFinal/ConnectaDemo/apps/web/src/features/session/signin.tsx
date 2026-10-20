"use client";
import { Logo } from "@/components/ui";
import { asset } from "@/lib/assets";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useApp } from "./provider";
export function Signin() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const name = String(d.get("name")).trim();
    if (name.length < 2) {
      setError("Please use at least two characters for your name.");
      return;
    }
    dispatch({
      type: "profile",
      profile: { name, email: String(d.get("email")).trim() },
    });
    dispatch({ type: "session", signedIn: true });
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(
      next?.startsWith("/") && !next.startsWith("//") ? next : "/events",
    );
  }
  return (
    <main id="main" className="auth-layout">
      <div className="auth-art">
        <Logo />
        <div className="auth-art-copy">
          <span className="eyebrow">A SPACE FOR WHAT’S NEXT</span>
          <h1>
            Ideas are better
            <br />
            when they meet people.
          </h1>
          <p>
            A little curiosity. A real conversation.
            <br />A whole world of possibility.
          </p>
        </div>
        <img
          src={asset("assets/images/lobby.png")}
          alt="An inviting virtual university lobby"
        />
        <div className="auth-quote">
          <span>“Every project begins with a hello.”</span>
          <span>Connecta</span>
        </div>
      </div>
      <div className="auth-form">
        <div className="auth-inner">
          <span className="pill">
            <span className="status-dot" />
            Frontend preview
          </span>
          <h2>Make yourself at home.</h2>
          <p>Set up a local profile to try the complete visitor journey.</p>
          <div className="notice">
            <ShieldCheck size={20} />
            <span>
              This profile is saved only in your browser. Google, Microsoft, and
              magic-link sign-in will be connected through NestJS.
            </span>
          </div>
          <form onSubmit={submit} className="stack">
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                defaultValue={state.profile.name}
                placeholder="What should we call you?"
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                defaultValue={state.profile.email}
                placeholder="you@university.ac.th"
              />
              <small>Kept private in your local profile.</small>
            </label>
            <label className="check-label">
              <input type="checkbox" required />I understand this is a local
              preview and agree to save my profile on this device.
            </label>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <button className="button" type="submit">
              Continue with local profile
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="small muted row auth-note">
            <Check size={16} />
            Event registration is a separate step.
          </p>
        </div>
      </div>
    </main>
  );
}
