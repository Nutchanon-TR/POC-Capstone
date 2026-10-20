"use client";
import { Portrait, Tag } from "@/components/ui";
import { projects } from "@/domain/catalog";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
export function Stats({
  items,
}: {
  items: { label: string; value: string | number; note: string }[];
}) {
  return (
    <div className="stats-grid">
      {items.map((item) => (
        <article className="surface stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </article>
      ))}
    </div>
  );
}
export function ProjectTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Category</th>
            <th>Presenter</th>
            <th>Booth</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
                <small>{p.title}</small>
              </td>
              <td>{p.category}</td>
              <td>
                <span className="row">
                  <Portrait index={p.character} size={32} />
                  {p.presenter}
                </span>
              </td>
              <td>
                <Tag>{p.slot ? p.code : "Unassigned"}</Tag>
              </td>
              <td>
                <Link
                  className="icon-button"
                  aria-label={`View ${p.name}`}
                  href={`/events/senior-showcase/projects/${p.id}`}
                >
                  <ArrowUpRight size={19} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
