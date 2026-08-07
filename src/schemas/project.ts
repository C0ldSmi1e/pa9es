import { z } from "zod";
import { content } from "@/src/config/settings";
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

const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  isPublished: z.boolean(),
  publishedAt: z.iso.datetime().nullable(),
  // True when the draft differs from what visitors currently see.
  hasUnpublishedChanges: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const ProjectDetailSchema = ProjectSummarySchema.extend({
  draftHtml: z.string(),
});

type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export {
  slugSchema,
  titleSchema,
  draftHtmlSchema,
  createProjectSchema,
  updateProjectSchema,
  ProjectSummarySchema,
  ProjectDetailSchema,
};
export type { ProjectSummary, ProjectDetail };
