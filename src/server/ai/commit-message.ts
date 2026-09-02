import { generateText } from "ai";
import { ai } from "@/src/config/constants";
import { findOwnedProject, latestCommitHtml } from "@/src/server/actions/projects";
import { anthropic } from "@/src/server/ai/provider";
import { assertWithinAiRateLimit } from "@/src/server/ai/rate-limit";
import { BadRequestError, UpstreamError } from "@/src/server/errors";

// Budgets for what reaches the model. Drafts can be a megabyte (and minified
// pages can be one enormous line), so every block sent is clipped.
const MAX_LINE_CHARS = 300;
const MAX_BLOCK_CHARS = 6000;
const MAX_FIRST_COMMIT_CHARS = 8000;

// Unordered line diff via occurrence counts. Deliberately not an LCS diff:
// O(n) on megabyte drafts, and a commit message needs to know *what*
// changed, not where.
const lineCounts = (text: string): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
};

const changedLines = (
  before: string,
  after: string,
): { removed: string[]; added: string[] } => {
  const beforeCounts = lineCounts(before);
  const afterCounts = lineCounts(after);
  const removed: string[] = [];
  const added: string[] = [];
  for (const [line, count] of beforeCounts) {
    if (count > (afterCounts.get(line) ?? 0)) removed.push(line);
  }
  for (const [line, count] of afterCounts) {
    if (count > (beforeCounts.get(line) ?? 0)) added.push(line);
  }
  return { removed, added };
};

// Joins lines until the character budget runs out; notes what was dropped.
const clipBlock = (lines: string[]): string => {
  const parts: string[] = [];
  let used = 0;
  for (const [index, line] of lines.entries()) {
    const clipped =
      line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line;
    if (used + clipped.length > MAX_BLOCK_CHARS) {
      parts.push(`… (+${lines.length - index} more lines)`);
      break;
    }
    parts.push(clipped);
    used += clipped.length + 1;
  }
  return parts.join("\n");
};

const SYSTEM_PROMPT =
  "You write commit messages for changes to a single-file HTML page. " +
  "Respond with only the message: one line, imperative mood, at most 72 " +
  "characters, no surrounding quotes. Start with the type prefix that fits " +
  "the change — feat: add: update: fix: docs: style: chore: — e.g. " +
  '"feat: add contact form" or "fix: correct nav links".';

const buildPrompt = ({
  title,
  previousHtml,
  draftHtml,
}: {
  title: string;
  previousHtml: string | null;
  draftHtml: string;
}): string => {
  if (previousHtml === null) {
    const clipped = draftHtml.slice(0, MAX_FIRST_COMMIT_CHARS);
    const truncated = draftHtml.length > clipped.length;
    return [
      `First commit for this page. Page title: ${title}`,
      "",
      `Page HTML${truncated ? " (truncated)" : ""}:`,
      clipped,
    ].join("\n");
  }

  const { removed, added } = changedLines(previousHtml, draftHtml);
  const noLineChanges = removed.length === 0 && added.length === 0;
  return [
    `Page title: ${title}`,
    "",
    "Lines removed:",
    noLineChanges
      ? "(none — only formatting or line-order changes)"
      : clipBlock(removed) || "(none)",
    "",
    "Lines added:",
    noLineChanges ? "(none)" : clipBlock(added) || "(none)",
  ].join("\n");
};

// Model output is advisory input for the commit box, but still clamp it to
// what commitMessageSchema accepts.
const cleanMessage = (raw: string): string => {
  return raw
    .trim()
    .split("\n")[0]
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 200);
};

// Suggests a commit message for the project's current (server-side) draft.
// Same precondition as createCommit: identical draft and latest commit means
// there is nothing to describe.
const suggestCommitMessage = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<{ message: string }> => {
  assertWithinAiRateLimit({ userId, action: "commit-message" });

  const owned = await findOwnedProject({ userId, projectId });
  const latest = await latestCommitHtml(projectId);
  if (latest !== null && latest === owned.draftHtml) {
    throw new BadRequestError("No changes to describe");
  }
  if (latest === null && owned.draftHtml === "") {
    throw new BadRequestError("Draft is empty");
  }

  let text: string;
  try {
    ({ text } = await generateText({
      model: anthropic(ai.models.commitMessage),
      reasoning: "low",
      system: SYSTEM_PROMPT,
      prompt: buildPrompt({
        title: owned.title,
        previousHtml: latest,
        draftHtml: owned.draftHtml,
      }),
    }));
  } catch (error) {
    console.error("suggestCommitMessage: AI request failed", error);
    throw new UpstreamError("AI request failed — try again");
  }

  const message = cleanMessage(text);
  if (message === "") {
    throw new UpstreamError("AI returned no message — try again");
  }
  return { message };
};

export { suggestCommitMessage };
