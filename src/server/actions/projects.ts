import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { pagination as paginationConfig } from "@/src/config/constants";
import type { ProjectDetail, ProjectSummary } from "@/src/schemas/project";
import type { ListResult, Pagination } from "@/src/schemas/standard-response";
import { db } from "@/src/server/db";
import { commit, project, user, type Project } from "@/src/server/db/schema";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  isUniqueViolation,
} from "@/src/server/errors";

// Every query below scopes by userId in the WHERE clause, so someone else's
// project is indistinguishable from a missing one (404, never 403).

const toSummary = (
  row: Pick<
    Project,
    | "id"
    | "slug"
    | "title"
    | "iconEmoji"
    | "liveCommitId"
    | "publishedAt"
    | "createdAt"
    | "updatedAt"
  >,
): ProjectSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  iconEmoji: row.iconEmoji,
  isPublished: row.liveCommitId !== null,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

// The latest commit's html decides `uncommitted`; a project with no commits
// counts as uncommitted once the draft has content.
const latestCommitHtml = async (projectId: string): Promise<string | null> => {
  const [row] = await db
    .select({ html: commit.html })
    .from(commit)
    .where(eq(commit.projectId, projectId))
    .orderBy(desc(commit.v))
    .limit(1);
  return row?.html ?? null;
};

const toDetail = async (row: Project): Promise<ProjectDetail> => {
  const latest = await latestCommitHtml(row.id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    iconEmoji: row.iconEmoji,
    draftHtml: row.draftHtml,
    liveCommitId: row.liveCommitId,
    uncommitted: latest === null ? row.draftHtml !== "" : row.draftHtml !== latest,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const listProjects = async ({
  userId,
  offset,
  limit,
}: {
  userId: string;
  offset?: number;
  limit?: number;
}): Promise<ListResult<ProjectSummary>> => {
  // Per API convention: no pagination params → everything, hard-capped.
  const paginated = offset !== undefined || limit !== undefined;
  const effectiveOffset = offset ?? paginationConfig.defaultOffset;
  const effectiveLimit = paginated
    ? (limit ?? paginationConfig.defaultLimit)
    : paginationConfig.maxLimit;

  const rows = await db
    .select({
      id: project.id,
      slug: project.slug,
      title: project.title,
      iconEmoji: project.iconEmoji,
      liveCommitId: project.liveCommitId,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(eq(project.userId, userId))
    // Manual order first; the recency tie-break preserves the pre-sortOrder
    // ordering for accounts that never reordered (all rows at the default).
    .orderBy(asc(project.sortOrder), desc(project.updatedAt))
    .limit(effectiveLimit)
    .offset(effectiveOffset);

  const data = rows.map(toSummary);

  let pagination: Pagination | null = null;
  if (paginated) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(project)
      .where(eq(project.userId, userId));
    pagination = {
      offset: effectiveOffset,
      limit: effectiveLimit,
      total,
      hasMore: effectiveOffset + rows.length < total,
    };
  }

  return { data, pagination };
};

const findOwnedProject = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<Project> => {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return row;
};

const getProject = async (args: {
  userId: string;
  projectId: string;
}): Promise<ProjectDetail> => {
  return toDetail(await findOwnedProject(args));
};

const createProject = async ({
  userId,
  slug,
  title,
}: {
  userId: string;
  slug: string;
  title?: string;
}): Promise<ProjectDetail> => {
  try {
    const [row] = await db
      .insert(project)
      .values({
        userId,
        slug,
        title: title ?? slug,
        // New pages land on top — same subquery pattern as commit.v.
        sortOrder: sql`(select coalesce(min(sort_order), 0) - 1 from ${project} where ${project.userId} = ${userId})`,
      })
      .returning();
    return toDetail(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A project with this slug already exists");
    }
    throw error;
  }
};

const updateProject = async ({
  userId,
  projectId,
  title,
  draftHtml,
  iconEmoji,
}: {
  userId: string;
  projectId: string;
  title?: string;
  draftHtml?: string;
  // null clears the icon; undefined leaves it untouched.
  iconEmoji?: string | null;
}): Promise<ProjectDetail> => {
  const changes: Partial<{
    title: string;
    draftHtml: string;
    iconEmoji: string | null;
  }> = {};
  if (title !== undefined) changes.title = title;
  if (draftHtml !== undefined) changes.draftHtml = draftHtml;
  if (iconEmoji !== undefined) changes.iconEmoji = iconEmoji;
  if (Object.keys(changes).length === 0) {
    throw new BadRequestError("Nothing to update");
  }

  const [row] = await db
    .update(project)
    .set(changes)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning();
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return toDetail(row);
};

const deleteProject = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<{ id: string }> => {
  const [row] = await db
    .delete(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning({ id: project.id });
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return row;
};

// Visibility rule shared by the public single-page serving queries: only
// live pages, banned owners excluded.
const publishedWhere = (username: string, slug: string) =>
  and(
    eq(user.username, username),
    eq(project.slug, slug),
    isNotNull(project.liveCommitId),
    sql`${user.banned} is not true`,
  );

// Public serving path: resolves <username>.pa9es.com/<slug> to the live
// commit's html (denormalized into publishedHtml). Banned users' pages stay
// off the air. iconEmoji rides along so the route can inject a favicon link
// without a second query.
const getPublishedPage = async ({
  username,
  slug,
}: {
  username: string;
  slug: string;
}): Promise<{ html: string; iconEmoji: string | null }> => {
  const [row] = await db
    .select({ html: project.publishedHtml, iconEmoji: project.iconEmoji })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(publishedWhere(username, slug))
    .limit(1);
  if (!row) {
    throw new NotFoundError("Page not found");
  }
  return { html: row.html ?? "", iconEmoji: row.iconEmoji };
};

// Icon for a published page (<username>.pa9es.com/<slug>/icon.svg). A page
// without an icon 404s exactly like a page that doesn't exist.
const getPublishedIcon = async ({
  username,
  slug,
}: {
  username: string;
  slug: string;
}): Promise<{ emoji: string }> => {
  const [row] = await db
    .select({ iconEmoji: project.iconEmoji })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(publishedWhere(username, slug))
    .limit(1);
  if (!row?.iconEmoji) {
    throw new NotFoundError("Icon not found");
  }
  return { emoji: row.iconEmoji };
};

// Public index for <username>.pa9es.com/ — every published page the user
// has, newest publish first. Same visibility rules as getPublishedPage:
// only live pages, banned owners excluded. Empty result ≙ nothing to show;
// the route renders the same 404 as an unknown username.
const listPublishedPages = async ({
  username,
}: {
  username: string;
}): Promise<Array<{ slug: string; title: string; iconEmoji: string | null }>> => {
  return (
    db
      .select({
        slug: project.slug,
        title: project.title,
        iconEmoji: project.iconEmoji,
      })
      .from(project)
      .innerJoin(user, eq(project.userId, user.id))
      .where(
        and(
          eq(user.username, username),
          isNotNull(project.liveCommitId),
          sql`${user.banned} is not true`,
        ),
      )
      // The owner's manual order, same as the dashboard; the tie-break keeps
      // the old newest-publish-first order for never-reordered accounts.
      .orderBy(asc(project.sortOrder), desc(project.publishedAt))
  );
};

// Persists the user's manual page order: position = index in orderedIds.
// Lenient on drift rather than strict set-equality: an id that no longer
// exists (deleted in another tab) is skipped by the ownership WHERE, and a
// project not mentioned (created mid-drag) keeps its slot — the next reorder
// converges everything. Sync execution inside the transaction, like the
// ledger writes (see src/server/actions/credits.ts).
const reorderProjects = async ({
  userId,
  orderedIds,
}: {
  userId: string;
  orderedIds: string[];
}): Promise<ListResult<ProjectSummary>> => {
  db.transaction((tx) => {
    orderedIds.forEach((projectId, index) => {
      tx.update(project)
        .set({
          sortOrder: index,
          // A reorder is not an edit: pin updatedAt to itself so $onUpdate
          // doesn't bump it (the admin recent-activity sort stays honest).
          updatedAt: sql`${project.updatedAt}`,
        })
        .where(and(eq(project.id, projectId), eq(project.userId, userId)))
        .run();
    });
  });
  return listProjects({ userId });
};

export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  getPublishedPage,
  getPublishedIcon,
  listPublishedPages,
  findOwnedProject,
  latestCommitHtml,
  toDetail,
  toSummary,
};
