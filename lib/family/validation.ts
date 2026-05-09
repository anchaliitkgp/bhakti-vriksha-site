// Shared Zod schemas for the family-registration API.
// Imported by:
//   - app/api/family/register/route.ts   (POST — create)
//   - app/api/family/[id]/route.ts       (PUT — edit)
//   - components/FamilyRegistrationForm.tsx (client-side mirror)
//
// The DB layer is the ultimate source of truth (see migrations 007–008); Zod
// is the first line of defence against malformed input, giving us friendly
// 400 responses with field-level pointers (design §7.7).

import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────────────────
export const RELATIONSHIP = [
  "Self",
  "Spouse",
  "Son",
  "Daughter",
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Other",
] as const;

export const GENDER = ["Male", "Female", "Other"] as const;
export const MARITAL_STATUS = ["Married", "Single"] as const;

// ─── Reusable primitives ────────────────────────────────────────────────
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Please provide a valid email address." })
  .max(255);

const optionalEmail = z
  .union([email, z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : v))
  .nullable();

// Permissive — we show phone as free-text; server never parses it.
const phone = z
  .string()
  .trim()
  .min(5, { message: "Please provide a phone number." })
  .max(40);

const optionalPhone = z
  .union([phone, z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : v))
  .nullable();

// YYYY-MM-DD (HTML date input). Empty/null coerced to null.
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format.",
});
const optionalIsoDate = z
  .union([isoDate, z.literal(""), z.null()])
  .transform((v) => (v === "" || v == null ? null : v))
  .nullable();

// Given name: 1..120 chars after trimming.
const givenName = z
  .string()
  .trim()
  .min(1, { message: "Name is required." })
  .max(120);

const initiatedName = z.string().trim().min(1).max(120);

const relationshipOther = z
  .string()
  .trim()
  .min(1, { message: "Please specify the relationship." })
  .max(40);

const age = z
  .number({ message: "Age must be a number." })
  .int({ message: "Age must be a whole number." })
  .min(0, { message: "Age must be 0 or greater." })
  .max(120, { message: "Age looks too high — please double-check." });

// ─── Per-member payload shape ──────────────────────────────────────────
const baseMember = z
  .object({
    given_name: givenName,
    initiated: z.boolean().default(false),
    initiated_name: z.union([initiatedName, z.literal(""), z.null()])
      .transform((v) => (v === "" || v == null ? null : v))
      .nullable(),
    age,
    gender: z.enum(GENDER),
    marital_status: z.enum(MARITAL_STATUS),
    date_of_birth: optionalIsoDate,
    wedding_anniversary: optionalIsoDate,
  })
  .superRefine((m, ctx) => {
    // FR-02.9: initiated → initiated_name required + non-empty
    if (m.initiated && !m.initiated_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["initiated_name"],
        message: "Initiated name is required when Initiated is ticked.",
      });
    }
    // FR-12.3: minors (< 18) must be Single
    if (m.age < 18 && m.marital_status === "Married") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["marital_status"],
        message: "Members under 18 must have marital status 'Single'.",
      });
    }
    // FR-03.4: only a Married member may have a wedding anniversary
    if (m.marital_status === "Single" && m.wedding_anniversary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wedding_anniversary"],
        message:
          "Wedding anniversary only applies when marital status is 'Married'.",
      });
    }
  });

export const primarySchema = baseMember.and(
  z.object({
    // Primary: email + phone are REQUIRED (FR-01.2, FR-02.4).
    email,
    phone,
  })
);

export const secondarySchema = baseMember.and(
  z.object({
    relationship: z.enum(RELATIONSHIP).refine((r) => r !== "Self", {
      message: "Relationship 'Self' is reserved for the primary.",
    }),
    relationship_other: z
      .union([relationshipOther, z.literal(""), z.null()])
      .transform((v) => (v === "" || v == null ? null : v))
      .nullable(),
    email: optionalEmail,
    phone: optionalPhone,
  })
).superRefine((s, ctx) => {
  // FR-02.3: 'Other' relationship requires a label
  if (s.relationship === "Other" && !s.relationship_other) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["relationship_other"],
      message:
        "Please describe the relationship when 'Other' is selected.",
    });
  }
  if (s.relationship !== "Other" && s.relationship_other) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["relationship_other"],
      message:
        "Relationship label applies only when 'Other' is selected.",
    });
  }
});

// ─── Full request bodies ───────────────────────────────────────────────

/** POST /api/family/register body shape. */
export const familyRegisterBody = z.object({
  primary: primarySchema,
  secondaries: z
    .array(secondarySchema)
    .max(15, {
      message: "A family can include up to 15 additional members.",
    })
    .default([]),
  consent: z.literal(true, {
    message:
      "Please confirm consent to share family data to submit the form.",
  }),
});

export type FamilyRegisterBody = z.infer<typeof familyRegisterBody>;

/** Body for PUT /api/family/[id]. Members carry an optional id so the server
 *  can diff vs the current DB snapshot. We relax strictness here; the final
 *  DB CHECKs + the edit_family RPC are authoritative. */
export const familyEditMember = z
  .object({
    id: z.string().uuid().optional(),
    _op: z.enum(["keep", "create", "delete"]).default("keep"),
    given_name: z.string().trim().min(1).max(120).optional(),
    initiated: z.boolean().optional(),
    initiated_name: z.union([z.string().trim().min(1).max(120), z.literal(""), z.null()]).optional(),
    relationship: z.enum(RELATIONSHIP).optional(),
    relationship_other: z.union([z.string().trim().min(1).max(40), z.literal(""), z.null()]).optional(),
    age: z.number().int().min(0).max(120).optional(),
    gender: z.enum(GENDER).optional(),
    marital_status: z.enum(MARITAL_STATUS).optional(),
    email: optionalEmail.optional(),
    phone: optionalPhone.optional(),
    date_of_birth: optionalIsoDate.optional(),
    wedding_anniversary: optionalIsoDate.optional(),
  });

export const familyEditBody = z.object({
  expectedVersion: z.number().int().min(1),
  primary: primarySchema.and(
    z.object({ id: z.string().uuid() })
  ),
  secondaries: z.array(familyEditMember).max(15).default([]),
  // Only required when the server detects a material change (see FR-10.8).
  consent_if_material: z.boolean().optional(),
});

export type FamilyEditBody = z.infer<typeof familyEditBody>;

// ─── Error mapping ─────────────────────────────────────────────────────
/** Convert a ZodError into the API's standard { error, code, field } shape
 *  (design §7.7). Uses the first issue for the `error` + `field` pointers. */
export function zodErrorToApiError(err: z.ZodError): {
  error: string;
  code: "VALIDATION";
  field: string | null;
} {
  const first = err.issues[0];
  return {
    error: first?.message ?? "Invalid request body.",
    code: "VALIDATION",
    field: first?.path.length ? first.path.join(".") : null,
  };
}
