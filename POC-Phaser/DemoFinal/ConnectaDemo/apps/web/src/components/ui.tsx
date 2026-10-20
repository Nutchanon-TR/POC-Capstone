import type { Project } from "@/domain/catalog";
import { asset } from "@/lib/assets";
import { ArrowRight, ArrowUpRight, Compass, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Connecta home">
      <span className="logo-mark">
        <Compass size={24} />
      </span>
      connecta<span className="logo-dot">.</span>
    </Link>
  );
}
export function ButtonLink({
  href,
  children,
  secondary = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={`button ${secondary ? "secondary" : ""} ${className}`}
      href={href}
    >
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function Tag({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Compass size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Portrait({
  index = 0,
  size = 40,
}: {
  index?: number;
  size?: number;
}) {
  return (
    <img
      className="portrait"
      src={asset(
        `assets/characters/character-${String(index + 1).padStart(2, "0")}-portrait.png`,
      )}
      width={size}
      height={size}
      alt=""
    />
  );
}
export function Poster({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  return (
    <div className={`poster ${project.color} ${compact ? "compact" : ""}`}>
      <div className="poster-top">
        <span>{project.name}</span>
        <ArrowUpRight size={23} />
      </div>
      <div className="poster-symbol">
        <Sparkles size={compact ? 44 : 70} strokeWidth={1.2} />
        <span />
        <span />
      </div>
      <div>
        <small>{project.topic}</small>
        <h3>{project.title}</h3>
      </div>
      <span className="poster-foot">
        STUDENT IDEAS. REAL POSSIBILITIES. <span>↗</span>
      </span>
    </div>
  );
}
export function ProjectCard({
  project,
  href,
}: {
  project: Project;
  href: string;
}) {
  return (
    <Link className="project-card" href={href}>
      <Poster project={project} compact />
      <div className="project-card-body">
        <div className="row between">
          <Tag>{project.code}</Tag>
          <span className="muted small">{project.category}</span>
        </div>
        <h3>{project.title}</h3>
        <div className="row between">
          <span className="row">
            <Portrait index={project.character} size={30} />
            <span className="small">{project.presenter}</span>
          </span>
          <ArrowRight size={18} />
        </div>
      </div>
    </Link>
  );
}
export function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((v) => {
          const text = String(v);
          return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
