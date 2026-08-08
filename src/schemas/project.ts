import { z } from "zod";
import { content } from "@/src/config/constants";
import { HOST_LABEL_REGEX } from "@/src/schemas/shared";

const maxHtmlMb = content.maxHtmlBytes / 1024 / 1024;

// Slugs follow the same hostname-label rules as usernames, normalized to
// lowercase like usernames are.
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    HOST_LABEL_REGEX,
    "Only lowercase letters, numbers and hyphens (not at the edges), 63 chars max",
  );

const titleSchema = z.string().trim().min(1).max(100);

// Size is measured in UTF-8 bytes (what SQLite stores), not JS chars.
const draftHtmlSchema = z
  .string()
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= content.maxHtmlBytes,
    `HTML exceeds the ${maxHtmlMb} MB limit`,
  );

const commitMessageSchema = z.string().trim().min(1, "Message required").max(200);

const createProjectSchema = z.object({
  slug: slugSchema,
  // Defaults to the slug when omitted.
  title: titleSchema.optional(),
});

const updateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    draftHtml: draftHtmlSchema.optional(),
  })
  .refine(
    (value) => value.title !== undefined || value.draftHtml !== undefined,
    "Nothing to update",
  );

const createCommitSchema = z.object({
  message: commitMessageSchema,
});

const commitRefSchema = z.object({
  commitId: z.string().min(1),
});

const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  isPublished: z.boolean(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const ProjectDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  draftHtml: z.string(),
  liveCommitId: z.string().nullable(),
  // True when the draft differs from the latest commit (or when there are no
  // commits and the draft is non-empty).
  uncommitted: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const CommitSummarySchema = z.object({
  id: z.string(),
  v: z.number().int(),
  message: z.string(),
  createdAt: z.iso.datetime(),
});

const CommitDetailSchema = CommitSummarySchema.extend({
  html: z.string(),
});

type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
type CommitSummary = z.infer<typeof CommitSummarySchema>;
type CommitDetail = z.infer<typeof CommitDetailSchema>;

export {
  slugSchema,
  titleSchema,
  draftHtmlSchema,
  commitMessageSchema,
  createProjectSchema,
  updateProjectSchema,
  createCommitSchema,
  commitRefSchema,
  ProjectSummarySchema,
  ProjectDetailSchema,
  CommitSummarySchema,
  CommitDetailSchema,
};
export type { ProjectSummary, ProjectDetail, CommitSummary, CommitDetail };
