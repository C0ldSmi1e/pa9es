import { and, desc, eq, sql } from "drizzle-orm";
import { credits } from "@/src/config/constants";
import type {
  CommitDetail,
  CommitSummary,
  ProjectDetail,
} from "@/src/schemas/project";
import { spendCredits } from "@/src/server/actions/credits";
import {
  findOwnedProject,
  latestCommitHtml,
  toDetail,
} from "@/src/server/actions/projects";
import { maybeRewardReferrer } from "@/src/server/actions/referrals";
import { db } from "@/src/server/db";
import { commit, project, type Commit } from "@/src/server/db/schema";
import { BadRequestError, NotFoundError } from "@/src/server/errors";

const toSummary = (
  row: Pick<Commit, "id" | "v" | "message" | "createdAt">,
): CommitSummary => ({
  id: row.id,
  v: row.v,
  message: row.message,
  createdAt: row.createdAt.toISOString(),
});

// Snapshots the current draft as the next version. Rejects a no-op commit
// (draft identical to the latest commit) — mirrors the disabled Commit
// button, and keeps the timeline meaningful.
const createCommit = async ({
  userId,
  projectId,
  message,
}: {
  userId: string;
  projectId: string;
  message: string;
}): Promise<CommitSummary> => {
  const owned = await findOwnedProject({ userId, projectId });
  const latest = await latestCommitHtml(projectId);
  if (latest !== null && latest === owned.draftHtml) {
    throw new BadRequestError("No changes to commit");
  }

  const [row] = await db
    .insert(commit)
    .values({
      projectId,
      message,
      html: owned.draftHtml,
      v: sql`(select coalesce(max(v), 0) + 1 from ${commit} where ${commit.projectId} = ${projectId})`,
    })
    .returning();
  return toSummary(row);
};

const listCommits = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<{ commits: CommitSummary[]; liveCommitId: string | null }> => {
  const owned = await findOwnedProject({ userId, projectId });
  const rows = await db
    .select({
      id: commit.id,
      v: commit.v,
      message: commit.message,
      createdAt: commit.createdAt,
    })
    .from(commit)
    .where(eq(commit.projectId, projectId))
    .orderBy(desc(commit.v));
  return { commits: rows.map(toSummary), liveCommitId: owned.liveCommitId };
};

const findOwnedCommit = async ({
  userId,
  projectId,
  commitId,
}: {
  userId: string;
  projectId: string;
  commitId: string;
}): Promise<Commit> => {
  await findOwnedProject({ userId, projectId });
  const [row] = await db
    .select()
    .from(commit)
    .where(and(eq(commit.id, commitId), eq(commit.projectId, projectId)))
    .limit(1);
  if (!row) {
    throw new NotFoundError("Commit not found");
  }
  return row;
};

const getCommit = async (args: {
  userId: string;
  projectId: string;
  commitId: string;
}): Promise<CommitDetail> => {
  const row = await findOwnedCommit(args);
  return { ...toSummary(row), html: row.html };
};

// Points production at a commit and refreshes the denormalized serving copy.
// The first-ever go-live of a project charges credits.publishCost, atomically
// with the pointer update (insufficient balance rolls the whole thing back).
// The charge is ledger-keyed on the project id, so republish after unpublish
// and rollbacks are free by idempotency — no extra logic.
const makeLive = async (args: {
  userId: string;
  projectId: string;
  commitId: string;
}): Promise<ProjectDetail> => {
  const target = await findOwnedCommit(args);
  const row = db.transaction((tx) => {
    if (credits.publishCost > 0) {
      spendCredits(
        {
          userId: args.userId,
          amount: credits.publishCost,
          kind: "publish_charge",
          refId: args.projectId,
          projectId: args.projectId,
        },
        tx,
      );
    }
    // A publish is the referral qualifying event; idempotent per referee.
    // After the spend, so an insufficient-balance abort never rewards.
    maybeRewardReferrer(args.userId, tx);
    return tx
      .update(project)
      .set({
        liveCommitId: target.id,
        publishedHtml: target.html,
        publishedAt: new Date(),
      })
      .where(eq(project.id, args.projectId))
      .returning()
      .get();
  });
  return toDetail(row);
};

// Clears the live pointer; the timeline and serving cache are untouched.
const unpublish = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ProjectDetail> => {
  await findOwnedProject({ userId, projectId });
  const [row] = await db
    .update(project)
    .set({ liveCommitId: null })
    .where(eq(project.id, projectId))
    .returning();
  return toDetail(row);
};

// Replaces the draft with a commit's html. The overwrite confirmation is the
// client's job; the server just does what it's told.
const restoreDraft = async (args: {
  userId: string;
  projectId: string;
  commitId: string;
}): Promise<ProjectDetail> => {
  const target = await findOwnedCommit(args);
  const [row] = await db
    .update(project)
    .set({ draftHtml: target.html })
    .where(eq(project.id, args.projectId))
    .returning();
  return toDetail(row);
};

export { createCommit, listCommits, getCommit, makeLive, unpublish, restoreDraft };
