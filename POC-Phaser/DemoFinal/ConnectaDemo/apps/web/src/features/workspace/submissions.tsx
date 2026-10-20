"use client";
import {
  ButtonLink,
  Empty,
  PageTitle,
  Tag,
  downloadCSV,
} from "@/components/ui";
import { parseSubmissionsCSV } from "@/domain/csv";
import { useApp } from "@/features/session/provider";
import { Download, Upload } from "lucide-react";
import { useState } from "react";
export function Submissions() {
  const { state, dispatch, notify } = useApp();
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const list = state.submissions.filter(
    (s) => filter === "all" || s.status === filter,
  );
  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 1024 * 1024) {
      setError("Choose a CSV smaller than 1 MB.");
      return;
    }
    try {
      const rows = parseSubmissionsCSV(await file.text());
      rows.forEach((row) =>
        dispatch({
          type: "submission",
          entry: { ...row, id: crypto.randomUUID(), status: "pending" },
        }),
      );
      notify(`${rows.length} submissions imported for review.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import this CSV.");
    }
  }
  return (
    <>
      <PageTitle
        title="The next ideas are arriving."
        description="Review submissions and help projects get ready for their audience."
        action={
          <ButtonLink href="/workspace/submit">Submit a project</ButtonLink>
        }
      />
      <div className="surface">
        <div className="row between wrap">
          <div className="chips">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="row wrap">
            <button
              className="button secondary small-button"
              onClick={() =>
                downloadCSV("submission-template.csv", [
                  ["title", "category", "description", "members"],
                  [
                    "A new idea",
                    "Computing",
                    "A short project description.",
                    "team@example.ac.th",
                  ],
                ])
              }
            >
              <Download size={16} />
              CSV template
            </button>
            <label className="button small-button upload-label">
              <Upload size={16} />
              Import CSV
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {!list.length ? (
          <Empty title="Room for the next big idea.">
            Submit a project or import a CSV to start your review queue.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.title}</strong>
                      <small>
                        {s.category} · {s.description}
                      </small>
                    </td>
                    <td>{s.members}</td>
                    <td>
                      <Tag tone={s.status === "approved" ? "live" : ""}>
                        {s.status}
                      </Tag>
                    </td>
                    <td>
                      <div className="row">
                        <button
                          className="button secondary small-button"
                          disabled={s.status === "approved"}
                          onClick={() =>
                            dispatch({
                              type: "review",
                              id: s.id,
                              status: "approved",
                            })
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="text-link"
                          disabled={s.status === "rejected"}
                          onClick={() =>
                            dispatch({
                              type: "review",
                              id: s.id,
                              status: "rejected",
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          Approval changes the local review status. Publishing projects and
          assigning booth slots require the backend.
        </p>
      </div>
    </>
  );
}
