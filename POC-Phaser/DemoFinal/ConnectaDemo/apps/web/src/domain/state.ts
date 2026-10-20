import { z } from "zod";
import { rubric, validScores } from "./catalog";
export const moduleSchema = z.object({
  judging: z.boolean(),
  feedback: z.boolean(),
  voting: z.boolean(),
});
const profileSchema = z.object({
  name: z.string().max(80),
  email: z.email().or(z.literal("")),
  organisation: z.string().max(100),
  position: z.string().max(80),
  interests: z.string().max(200),
  province: z.string().max(80),
  audience: z.string().max(60),
  avatar: z.number().int().min(0).max(13),
  publicContact: z.boolean(),
});
const eventSchema = z.object({
  id: z.string(),
  title: z.string().min(3).max(100),
  host: z.string().min(2),
  date: z.string(),
  time: z.string(),
  description: z.string().max(2000),
  access: z.enum(["PUBLIC", "INVITE"]),
  domains: z.string(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  signedIn: z.boolean(),
  profile: profileSchema,
  registrations: z.array(z.string()),
  follows: z.array(z.string()),
  visited: z.array(z.string()),
  votes: z.array(z.string()).max(3),
  agenda: z.array(z.string()),
  modules: moduleSchema,
  scores: z.record(z.string(), z.record(z.string(), z.number().min(0).max(5))),
  notes: z.record(z.string(), z.string().max(2000)),
  submittedScores: z.array(z.string()),
  feedback: z.array(
    z.object({
      id: z.string(),
      project: z.string(),
      text: z.string().max(500),
      hidden: z.boolean(),
    }),
  ),
  reports: z.array(
    z.object({
      id: z.string(),
      target: z.string(),
      reason: z.string(),
      resolved: z.boolean(),
    }),
  ),
  contacts: z.array(
    z.object({ name: z.string(), status: z.enum(["requested", "connected"]) }),
  ),
  events: z.array(eventSchema),
  submissions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      description: z.string(),
      members: z.string(),
      status: z.enum(["pending", "approved", "rejected"]),
    }),
  ),
  judgingClosed: z.boolean(),
  resultsPublished: z.boolean(),
  motion: z.boolean(),
  tourSeen: z.boolean(),
});
export type AppState = z.infer<typeof stateSchema>;
export type LocalEvent = z.infer<typeof eventSchema>;
export const initialState: AppState = {
  version: 1,
  signedIn: false,
  profile: {
    name: "",
    email: "",
    organisation: "",
    position: "",
    interests: "",
    province: "",
    audience: "Student",
    avatar: 0,
    publicContact: false,
  },
  registrations: [],
  follows: [],
  visited: [],
  votes: [],
  agenda: [],
  modules: { judging: true, feedback: true, voting: true },
  scores: {},
  notes: {},
  submittedScores: [],
  feedback: [],
  reports: [],
  contacts: [],
  events: [],
  submissions: [],
  judgingClosed: false,
  resultsPublished: false,
  motion: true,
  tourSeen: false,
};
export type Action =
  | { type: "profile"; profile: Partial<AppState["profile"]> }
  | { type: "session"; signedIn: boolean }
  | { type: "register"; event: string }
  | { type: "toggle"; collection: "follows" | "agenda"; id: string }
  | { type: "visit"; id: string }
  | { type: "vote"; id: string }
  | { type: "modules"; modules: AppState["modules"] }
  | { type: "score"; project: string; criterion: string; value: number }
  | { type: "note"; project: string; value: string }
  | { type: "submit-score"; project: string }
  | { type: "feedback"; entry: AppState["feedback"][number] }
  | { type: "hide-feedback"; id: string }
  | { type: "report"; entry: AppState["reports"][number] }
  | { type: "resolve-report"; id: string }
  | { type: "contact"; name: string }
  | { type: "event"; event: LocalEvent }
  | { type: "submission"; entry: AppState["submissions"][number] }
  | { type: "review"; id: string; status: "approved" | "rejected" }
  | {
      type: "setting";
      key: "judgingClosed" | "resultsPublished" | "motion" | "tourSeen";
      value: boolean;
    }
  | { type: "reset" };
export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "profile":
      return { ...state, profile: { ...state.profile, ...action.profile } };
    case "session":
      return { ...state, signedIn: action.signedIn };
    case "register":
      return {
        ...state,
        registrations: [...new Set([...state.registrations, action.event])],
      };
    case "toggle":
      return {
        ...state,
        [action.collection]: state[action.collection].includes(action.id)
          ? state[action.collection].filter((id) => id !== action.id)
          : [...state[action.collection], action.id],
      };
    case "visit":
      return state.visited.includes(action.id)
        ? state
        : { ...state, visited: [...state.visited, action.id] };
    case "vote":
      return !state.modules.voting || !state.visited.includes(action.id)
        ? state
        : {
            ...state,
            votes: state.votes.includes(action.id)
              ? state.votes.filter((id) => id !== action.id)
              : state.votes.length < 3
                ? [...state.votes, action.id]
                : state.votes,
          };
    case "modules":
      return { ...state, modules: action.modules };
    case "score":
      return state.judgingClosed ||
        !state.modules.judging ||
        !rubric.some(
          (c) =>
            c.id === action.criterion &&
            Number.isInteger(action.value) &&
            action.value >= 1 &&
            action.value <= c.max,
        )
        ? state
        : {
            ...state,
            scores: {
              ...state.scores,
              [action.project]: {
                ...state.scores[action.project],
                [action.criterion]: action.value,
              },
            },
            submittedScores: state.submittedScores.filter(
              (id) => id !== action.project,
            ),
          };
    case "note":
      return state.judgingClosed
        ? state
        : {
            ...state,
            notes: { ...state.notes, [action.project]: action.value },
          };
    case "submit-score":
      return state.judgingClosed ||
        !validScores(state.scores[action.project] ?? {})
        ? state
        : {
            ...state,
            submittedScores: [
              ...new Set([...state.submittedScores, action.project]),
            ],
          };
    case "feedback":
      return state.modules.feedback
        ? { ...state, feedback: [...state.feedback, action.entry] }
        : state;
    case "hide-feedback":
      return {
        ...state,
        feedback: state.feedback.map((f) =>
          f.id === action.id ? { ...f, hidden: !f.hidden } : f,
        ),
      };
    case "report":
      return { ...state, reports: [...state.reports, action.entry] };
    case "resolve-report":
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.id ? { ...r, resolved: true } : r,
        ),
      };
    case "contact":
      return state.contacts.some((c) => c.name === action.name)
        ? state
        : {
            ...state,
            contacts: [
              ...state.contacts,
              { name: action.name, status: "requested" },
            ],
          };
    case "event":
      return { ...state, events: [...state.events, action.event] };
    case "submission":
      return { ...state, submissions: [...state.submissions, action.entry] };
    case "review":
      return {
        ...state,
        submissions: state.submissions.map((s) =>
          s.id === action.id ? { ...s, status: action.status } : s,
        ),
      };
    case "setting":
      return { ...state, [action.key]: action.value };
    case "reset":
      return initialState;
  }
}
