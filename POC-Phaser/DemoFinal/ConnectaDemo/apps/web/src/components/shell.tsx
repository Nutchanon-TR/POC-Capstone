"use client";
import { useApp } from "@/features/session/provider";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  FileText,
  Grid2X2,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo, Portrait } from "./ui";
import { PageMotion } from "./page-motion";
export function Header() {
  const path = usePathname();
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container row between">
        <Logo />
        <nav aria-label="Main navigation" className={open ? "open" : ""}>
          <Link
            href="/events"
            aria-current={path.startsWith("/events") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Discover events
          </Link>
          <Link
            href="/events/senior-showcase/schedule"
            onClick={() => setOpen(false)}
          >
            What’s on
          </Link>
          <Link href="/workspace" onClick={() => setOpen(false)}>
            My workspace
          </Link>
        </nav>
        <div className="row header-actions">
          {state.signedIn ? (
            <>
              <Link href="/profile" className="profile-link">
                <Portrait index={state.profile.avatar} size={36} />
                <span>{state.profile.name.split(" ")[0]}</span>
              </Link>
              <button
                className="icon-button"
                aria-label="Sign out"
                onClick={() => dispatch({ type: "session", signedIn: false })}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link href="/signin" className="button small-button">
              Get started
              <ArrowUpRight size={16} />
            </Link>
          )}
          <button
            className="icon-button mobile-only"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer container">
      <div>
        <Logo />
        <p>A little closer to the next big idea.</p>
      </div>
      <div className="row">
        <Link href="/events">Explore</Link>
        <Link href="/profile">Your profile</Link>
        <span>© 2026 Connecta</span>
      </div>
    </footer>
  );
}
export function Site({ children }: { children: ReactNode }) {
  return (
    <>
      <PageMotion />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice ${compact ? "compact" : ""}`}>
      <span className="status-dot" />
      Frontend preview · changes are saved on this device. Accounts, live
      participants and media connect in the backend phase.
    </div>
  );
}
const workspaceLinks = [
  { href: "/workspace", label: "Overview", Icon: LayoutDashboard },
  { href: "/workspace/projects", label: "Projects", Icon: FileText },
  { href: "/workspace/submissions", label: "Submissions", Icon: Users },
  { href: "/workspace/judging", label: "Judging", Icon: SlidersHorizontal },
  { href: "/workspace/presenter", label: "My booth", Icon: Monitor },
  { href: "/workspace/analytics", label: "Event report", Icon: BarChart3 },
  { href: "/workspace/moderation", label: "Moderation", Icon: ShieldCheck },
  {
    href: "/events/senior-showcase/schedule",
    label: "Schedule",
    Icon: CalendarDays,
  },
];
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { state } = useApp();
  return (
    <>
      <Header />
      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <Link className="event-switch" href="/events/senior-showcase">
            <span className="mini-mark">
              <Grid2X2 size={21} />
            </span>
            <span>
              Senior Design
              <br />
              <small>Showcase 2026</small>
            </span>
          </Link>
          <nav aria-label="Workspace">
            {workspaceLinks
              .filter(
                (l) => l.href !== "/workspace/judging" || state.modules.judging,
              )
              .map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={path === href ? "active" : ""}
                >
                  <Icon size={19} />
                  {label}
                </Link>
              ))}
          </nav>
          <Link className="sidebar-create" href="/workspace/create-event">
            <Plus size={18} />
            Create an event
          </Link>
          <Link href="/profile" className="sidebar-profile">
            <UserRound size={18} />
            Profile & contacts
          </Link>
          <span className="sidebar-caption">
            Local workspace preview
            <br />
            Role checks require the server.
          </span>
        </aside>
        <main id="main" className="workspace-main">
          <DemoNotice />
          {children}
        </main>
      </div>
    </>
  );
}
