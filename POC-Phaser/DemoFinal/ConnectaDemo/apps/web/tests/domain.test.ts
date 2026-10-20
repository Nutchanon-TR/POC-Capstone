import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, reduce, stateSchema } from "../src/domain/state";
import {
  rubric,
  weightedScore,
  validScores,
  searchProjects,
} from "../src/domain/catalog";
import { parseSubmissionsCSV } from "../src/domain/csv";
test("rubric weights total 100 and evaluation uses weighted normalised scores", () => {
  assert.equal(
    rubric.reduce((s, c) => s + c.weight, 0),
    100,
  );
  assert.equal(
    weightedScore({
      problem: 5,
      innovation: 5,
      execution: 5,
      communication: 5,
    }),
    100,
  );
  assert.equal(
    weightedScore({
      problem: 5,
      innovation: 1,
      execution: 3,
      communication: 2,
    }),
    56,
  );
  assert.equal(validScores({ problem: 5 }), false);
});
test("round closure prevents score and note edits; incomplete evaluations cannot complete", () => {
  assert.deepEqual(
    reduce(initialState, { type: "submit-score", project: "aurora" })
      .submittedScores,
    [],
  );
  const draft = reduce(initialState, {
    type: "score",
    project: "aurora",
    criterion: "execution",
    value: 4,
  });
  const closed = reduce(draft, {
    type: "setting",
    key: "judgingClosed",
    value: true,
  });
  assert.equal(
    reduce(closed, {
      type: "score",
      project: "aurora",
      criterion: "execution",
      value: 1,
    }),
    closed,
  );
  assert.equal(
    reduce(closed, { type: "note", project: "aurora", value: "changed" }),
    closed,
  );
  assert.equal(
    reduce(initialState, {
      type: "score",
      project: "aurora",
      criterion: "execution",
      value: 8,
    }),
    initialState,
  );
});
test("votes require a visit, enforce three choices, and can be withdrawn", () => {
  assert.equal(reduce(initialState, { type: "vote", id: "a" }), initialState);
  let state = initialState;
  for (const id of ["a", "b", "c", "d"]) {
    state = reduce(state, { type: "visit", id });
    state = reduce(state, { type: "vote", id });
  }
  assert.deepEqual(state.votes, ["a", "b", "c"]);
  state = reduce(state, { type: "vote", id: "b" });
  state = reduce(state, { type: "vote", id: "d" });
  assert.deepEqual(state.votes, ["a", "c", "d"]);
  assert.equal(reduce(state, { type: "visit", id: "a" }), state);
});
test("search matches presenter, project code, and category together", () => {
  assert.equal(searchProjects("prae", "Computing")[0]?.id, "pixel-path");
  assert.equal(searchProjects("A01", "Health").length, 0);
});
test("CSV handles quoted commas, newlines, BOM and rejects malformed input", () => {
  assert.deepEqual(
    parseSubmissionsCSV(
      '\uFEFFtitle,category,description,members\r\n"A, B",Design,"Line one\nLine two",a@example.org',
    ),
    [
      {
        title: "A, B",
        category: "Design",
        description: "Line one\nLine two",
        members: "a@example.org",
      },
    ],
  );
  assert.throws(() => parseSubmissionsCSV("title,category\na,b"), /columns/);
  assert.throws(
    () => parseSubmissionsCSV('title,category,description,members\n"oops'),
    /not closed/,
  );
});
test("local storage schema rejects corrupt or obsolete snapshots", () => {
  assert.equal(
    stateSchema.safeParse({ ...initialState, version: 0 }).success,
    false,
  );
  assert.equal(
    stateSchema.safeParse({
      ...initialState,
      profile: { ...initialState.profile, avatar: 99 },
    }).success,
    false,
  );
  assert.equal(
    stateSchema.safeParse(JSON.parse(JSON.stringify(initialState))).success,
    true,
  );
});
