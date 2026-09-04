import { expect, it } from "vitest";
import { createInlineMediaSegments, serializeInlineMedia } from "./InlineMediaComposer";

it("round trips only strict v1 Skill and Agent markers as durable atoms", () => {
  const value = [
    "before ",
    "[$Manage Taskboard](taskboard://composer-reference/v1/skill/bWFuYWdlLXRhc2tib2FyZA)",
    " and ",
    "[@任务总管](taskboard://composer-reference/v1/agent/bWFzdGVy)",
    " after",
  ].join("");
  const segments = createInlineMediaSegments(value);

  expect(segments.some((segment) => segment.type === "skill-reference")).toBe(true);
  expect(segments.some((segment) => segment.type === "agent-reference")).toBe(true);
  expect(serializeInlineMedia(segments)).toBe(value);

  for (const legacy of ["$Manage Taskboard", "@任务总管", "[任务总管](subagent://master)"]) {
    expect(createInlineMediaSegments(legacy).every((segment) => segment.type === "text")).toBe(true);
  }
  const unsupported = createInlineMediaSegments(
    "[$Future](taskboard://composer-reference/v2/skill/bWFuYWdlLXRhc2tib2FyZA)",
  );
  expect(unsupported.some((segment) => segment.type === "unsupported-reference")).toBe(true);
  expect(serializeInlineMedia(unsupported)).toBe(
    "[$Future](taskboard://composer-reference/v2/skill/bWFuYWdlLXRhc2tib2FyZA)",
  );
});
