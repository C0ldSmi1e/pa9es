import { count, desc, eq } from "drizzle-orm";
import { pagination as paginationConfig } from "@/src/config/constants";
import type { CommitSummary, ProjectSummary } from "@/src/schemas/project";
import { toSummary } from "@/src/server/actions/projects";
import { db } from "@/src/server/db";
import { commit, project, user } from "@/src/server/db/schema";
import { AuthorizationError, NotFoundError } from "@/src/server/errors";

type ActorRole = string | null | undefined;

const assertAdmin = (actorRole: ActorRole): void => {
  if (actorRole !== "admin") {
    throw new AuthorizationError("Admin access required");
  }
};

type AdminProjectStats = { userId: string; total: number; published: number };

type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string | null;
  banned: boolean;
  createdAt: string;
};

type AdminProjectDetail = {
  id: string;
  slug: string;
  title: string;
  draftHtml: string;
  publishedHtml: string | null;
  liveCommitId: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; username: string | null; email: string };
};

// Per-user project counts for the admin user list. count(liveCommitId)
// counts non-null rows, i.e. published projects.
const adminProjectStats = async ({
  actorRole,
}: {
  actorRole: ActorRole;
}): Promise<AdminProjectStats[]> => {
  assertAdmin(actorRole);
  return db
    .select({
      userId: project.userId,
      total: count(),
      published: count(project.liveCommitId),
    })
    .from(project)
    .groupBy(project.userId);
};

const adminGetUser = async ({
  actorRole,
  userId,
}: {
  actorRole: ActorRole;
  userId: string;
}): Promise<AdminUserDetail> => {
  assertAdmin(actorRole);
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) {
    throw new NotFoundError("User not found");
  }
  return {
    ...row,
    banned: Boolean(row.banned),
    createdAt: row.createdAt.toISOString(),
  };
};

// One user's projects, newest activity first. Unpaginated by design (the
// admin views are small); capped like any unpaginated list.
const adminListProjectsForUser = async ({
  actorRole,
  userId,
}: {
  actorRole: ActorRole;
  userId: string;
}): Promise<ProjectSummary[]> => {
  assertAdmin(actorRole);
  const rows = await db
    .select({
      id: project.id,
      slug: project.slug,
      title: project.title,
      liveCommitId: project.liveCommitId,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))
    .limit(paginationConfig.maxLimit);
  return rows.map(toSummary);
};

const adminGetProject = async ({
  actorRole,
  projectId,
}: {
  actorRole: ActorRole;
  projectId: string;
}): Promise<AdminProjectDetail> => {
  assertAdmin(actorRole);
  const [row] = await db
    .select({
      id: project.id,
      slug: project.slug,
      title: project.title,
      draftHtml: project.draftHtml,
      publishedHtml: project.publishedHtml,
      liveCommitId: project.liveCommitId,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ownerId: user.id,
      ownerUsername: user.username,
      ownerEmail: user.email,
    })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(eq(project.id, projectId))
    .limit(1);
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    draftHtml: row.draftHtml,
    publishedHtml: row.publishedHtml,
    liveCommitId: row.liveCommitId,
    isPublished: row.liveCommitId !== null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    owner: { id: row.ownerId, username: row.ownerUsername, email: row.ownerEmail },
  };
};

// Callers fetch the project first (adminGetProject 404s on a bad id), so a
// missing project here just yields an empty timeline.
const adminListCommitsForProject = async ({
  actorRole,
  projectId,
}: {
  actorRole: ActorRole;
  projectId: string;
}): Promise<CommitSummary[]> => {
  assertAdmin(actorRole);
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
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
};

export {
  adminProjectStats,
  adminGetUser,
  adminListProjectsForUser,
  adminGetProject,
  adminListCommitsForProject,
};
export type { AdminProjectDetail, AdminProjectStats, AdminUserDetail };
