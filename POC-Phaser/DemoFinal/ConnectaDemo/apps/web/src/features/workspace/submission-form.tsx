"use client";
import { PageTitle } from "@/components/ui";
import { categories } from "@/domain/catalog";
import { useApp } from "@/features/session/provider";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function SubmissionForm() {
  const { dispatch, notify } = useApp();
  const router = useRouter();
  return (
    <>
      <PageTitle
        eyebrow="LET’S SEE WHAT YOU’VE BEEN BUILDING"
        title="Every idea starts somewhere."
        description="Submit your project for the showcase. Staff will review it before it is published."
      />
      <form
        className="form-page"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          dispatch({
            type: "submission",
            entry: {
              id: crypto.randomUUID(),
              title: String(d.get("title")).trim(),
              category: String(d.get("category")),
              description: String(d.get("description")).trim(),
              members: String(d.get("members")),
              status: "pending",
            },
          });
          notify("Project submitted to the local review queue.");
          router.push("/workspace/submissions");
        }}
      >
        <section className="surface stack">
          <h2>Your project.</h2>
          <label>
            Project title
            <input
              required
              minLength={3}
              maxLength={150}
              name="title"
              placeholder="A clear name for your big idea"
            />
          </label>
          <label>
            Category
            <select name="category">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Short description
            <textarea
              name="description"
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              placeholder="What problem does it solve, and how?"
            />
          </label>
          <label>
            Team member emails
            <textarea
              name="members"
              required
              maxLength={1000}
              rows={2}
              placeholder="One email per line"
            />
            <small>
              Presenter roles will be assigned by the backend after approval.
            </small>
          </label>
          <label className="check-label">
            <input type="checkbox" required />I have permission to share this
            project and the team’s details.
          </label>
        </section>
        <div className="row between">
          <Link href="/workspace" className="button secondary">
            Cancel
          </Link>
          <button className="button">
            Submit for review
            <ArrowUpRight size={18} />
          </button>
        </div>
      </form>
    </>
  );
}
