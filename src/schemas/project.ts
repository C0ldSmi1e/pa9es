import { z } from "zod";
import { content, pagination } from "@/src/config/constants";
import { ICON_EMOJI_SET } from "@/src/config/icon-emojis";
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

// Membership in the curated set is the entire validation — no free-form
// input ever reaches the icon SVG template.
const iconEmojiSchema = z
  .string()
  .refine((value) => ICON_EMOJI_SET.has(value), "Pick an emoji from the icon set");

const createProjectSchema = z.object({
  slug: slugSchema,
  // Defaults to the slug when omitted.
  title: titleSchema.optional(),
});

const updateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    draftHtml: draftHtmlSchema.optional(),
    // null clears the icon; absent leaves it untouched.
    iconEmoji: iconEmojiSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.draftHtml !== undefined ||
      value.iconEmoji !== undefined,
    "Nothing to update",
  );

const createCommitSchema = z.object({
  message: commitMessageSchema,
});

const commitRefSchema = z.object({
  commitId: z.string().min(1),
});

// Full ordered id list — position = array index. Capped at the same hard
// limit as unpaginated GETs, since that's the most a client can ever hold.
const reorderProjectsSchema = z.object({
  orderedIds: z
    .array(z.string().min(1))
    .min(1)
    .max(pagination.maxLimit)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate project ids"),
});

const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  iconEmoji: z.string().nullable(),
  isPublished: z.boolean(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const ProjectDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  iconEmoji: z.string().nullable(),
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
  iconEmojiSchema,
  createProjectSchema,
  updateProjectSchema,
  createCommitSchema,
  commitRefSchema,
  reorderProjectsSchema,
  ProjectSummarySchema,
  ProjectDetailSchema,
  CommitSummarySchema,
  CommitDetailSchema,
};
export type { ProjectSummary, ProjectDetail, CommitSummary, CommitDetail };
