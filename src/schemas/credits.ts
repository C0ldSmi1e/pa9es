import { z } from "zod";

const LedgerEntrySchema = z.object({
  id: z.string(),
  // Signed, in internal units (see `credits` in src/config/constants.ts).
  delta: z.number().int(),
  kind: z.string(),
  note: z.string().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

const BalanceSchema = z.object({
  // Internal units.
  balance: z.number().int(),
});

// Admin grant/deduct. Amount is signed internal units; zero would be a
// meaningless ledger row.
const adminAdjustCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, "Amount must be non-zero"),
  note: z.string().trim().min(1).max(200).optional(),
});

type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
type Balance = z.infer<typeof BalanceSchema>;

export { LedgerEntrySchema, BalanceSchema, adminAdjustCreditsSchema };
export type { LedgerEntry, Balance };
