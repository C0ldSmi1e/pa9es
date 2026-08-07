import { z } from "zod";
import { RESERVED_USERNAMES } from "@/src/config/reserved-usernames";
import { HOST_LABEL_REGEX } from "@/src/schemas/shared";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .regex(
    HOST_LABEL_REGEX,
    "Only lowercase letters, numbers and hyphens (not at the edges), 63 chars max",
  )
  .refine((value) => !RESERVED_USERNAMES.has(value), "This username is reserved");

export { usernameSchema };
