import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/src/clients/drizzle";
import { project, user, type Project } from "@/src/clients/drizzle/schema";
import { pagination as paginationConfig } from "@/src/config/settings";
import type { ProjectDetail, ProjectSummary } from "@/src/schemas/project";
import type { ListResult, Pagination } from "@/src/schemas/standard-response";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  isUniqueViolation,
} from "@/src/utils/errors";

// Every query below scopes by userId in the WHERE clause, so someone else's
// project is indistinguishable from a missing one (404, never 403).

const toSummary = (
  row: Omit<Project, "draftHtml" | "publishedHtml"> & {
    hasUnpublishedChanges: boolean;
  },
): ProjectSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  isPublished: row.isPublished,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  hasUnpublishedChanges: row.hasUnpublishedChanges,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toDetail = (row: Project): ProjectDetail => ({
  ...toSummary({
    ...row,
    hasUnpublishedChanges: row.draftHtml !== (row.publishedHtml ?? ""),
  }),
  draftHtml: row.draftHtml,
});

// Computed in SQL so list queries never load the HTML blobs.
const hasUnpublishedChangesSql = sql<number>`${project.draftHtml} <> coalesce(${project.publishedHtml}, '')`;

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
      userId: project.userId,
      slug: project.slug,
      title: project.title,
      isPublished: project.isPublished,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      hasUnpublishedChanges: hasUnpublishedChangesSql,
    })
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))
    .limit(effectiveLimit)
    .offset(effectiveOffset);

  const data = rows.map((row) =>
    toSummary({ ...row, hasUnpublishedChanges: Boolean(row.hasUnpublishedChanges) }),
  );

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

const getProject = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ProjectDetail> => {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return toDetail(row);
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
      .values({ userId, slug, title: title ?? slug })
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
}: {
  userId: string;
  projectId: string;
  title?: string;
  draftHtml?: string;
}): Promise<ProjectDetail> => {
  const changes: Partial<{ title: string; draftHtml: string }> = {};
  if (title !== undefined) changes.title = title;
  if (draftHtml !== undefined) changes.draftHtml = draftHtml;
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

// Snapshot the draft in a single UPDATE so a concurrent draft save can't
// interleave between read and write.
const publishProject = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ProjectDetail> => {
  const [row] = await db
    .update(project)
    .set({
      publishedHtml: sql`${project.draftHtml}`,
      isPublished: true,
      publishedAt: new Date(),
    })
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning();
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return toDetail(row);
};

// Only flips the flag — the published snapshot survives for re-publishing.
const unpublishProject = async ({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}): Promise<ProjectDetail> => {
  const [row] = await db
    .update(project)
    .set({ isPublished: false })
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .returning();
  if (!row) {
    throw new NotFoundError("Project not found");
  }
  return toDetail(row);
};

// Public serving path: resolves <username>.pa9es.com/<slug> to HTML. Banned
// users' pages are off the air.
const getPublishedPage = async ({
  username,
  slug,
}: {
  username: string;
  slug: string;
}): Promise<{ html: string }> => {
  const [row] = await db
    .select({ html: project.publishedHtml })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(
      and(
        eq(user.username, username),
        eq(project.slug, slug),
        eq(project.isPublished, true),
        sql`${user.banned} is not true`,
      ),
    )
    .limit(1);
  if (!row) {
    throw new NotFoundError("Page not found");
  }
  return { html: row.html ?? "" };
};

export {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  publishProject,
  unpublishProject,
  getPublishedPage,
};
