// Couple-relationship helpers.
//
// Business rule (user request): Wedding Anniversary should only be asked ONCE
// per couple. If two members of the same family are a married couple (primary
// + spouse, OR mother + father), only the designated "bearer" shows the
// anniversary input; the other member sees a note that their partner is
// entering it. On save, the value is duplicated to both members so it
// survives if one of them is later removed.
//
// Helpers here are pure functions used by both the client form and the
// server-side register/edit pipelines.

export type CoupleMemberLite = {
  relationship: string; // "Self" | "Spouse" | "Mother" | "Father" | ...
  marital_status: string; // "Married" | "Single"
  wedding_anniversary?: string | null;
};

/**
 * For a family's members (primary + secondaries), identify who is the
 * "anniversary bearer" in each couple. Returns a set of indices (in the
 * secondaries array, -1 for the primary) that SHOULD show the anniversary
 * input. Partners of those bearers HIDE the input.
 *
 * Couple detection rules:
 *   1. Primary (Married) + Secondary (Spouse, Married) → primary is bearer
 *   2. Two secondaries with relationship "Mother" + "Father" (both Married) →
 *      the one with gender "Father" is the bearer (deterministic)
 *      Fallback: the first one in the list.
 */
export type CoupleAssignment = {
  /** Whether the primary should show + enter the anniversary. */
  primaryShowsAnniversary: boolean;
  /** Partner name if the primary's anniversary is shared with a secondary. */
  primaryPartnerName: string | null;

  /** Per-secondary decisions, aligned with the secondaries array. */
  secondaries: Array<{
    showsAnniversary: boolean;
    /** If !showsAnniversary: name of the partner who IS entering it. */
    partnerName: string | null;
  }>;
};

export function computeCoupleAssignment(
  primary: { given_name: string; relationship: "Self"; marital_status: string },
  secondaries: Array<{
    given_name: string;
    relationship: string;
    marital_status: string;
    gender?: string;
  }>
): CoupleAssignment {
  const result: CoupleAssignment = {
    primaryShowsAnniversary: primary.marital_status === "Married",
    primaryPartnerName: null,
    secondaries: secondaries.map(() => ({
      showsAnniversary: false,
      partnerName: null,
    })),
  };

  // Rule 1: primary + spouse
  if (primary.marital_status === "Married") {
    const spouseIdx = secondaries.findIndex(
      (s) =>
        s.relationship === "Spouse" && s.marital_status === "Married"
    );
    if (spouseIdx >= 0) {
      // Primary is the bearer. Spouse hides.
      result.secondaries[spouseIdx] = {
        showsAnniversary: false,
        partnerName: primary.given_name || "your partner",
      };
      // Mark all other married secondaries as standalone bearers (covers the
      // case where a grandparent couple is also in the family).
      for (let i = 0; i < secondaries.length; i++) {
        if (i === spouseIdx) continue;
        result.secondaries[i].showsAnniversary =
          secondaries[i].marital_status === "Married";
      }
    } else {
      // No spouse in this family, but primary is Married. Primary bearer stands.
      for (let i = 0; i < secondaries.length; i++) {
        result.secondaries[i].showsAnniversary =
          secondaries[i].marital_status === "Married";
      }
    }
  } else {
    // Primary is Single — they don't show anniversary at all.
    for (let i = 0; i < secondaries.length; i++) {
      result.secondaries[i].showsAnniversary =
        secondaries[i].marital_status === "Married";
    }
  }

  // Rule 2: Mother + Father couple inside secondaries
  const motherIdx = secondaries.findIndex(
    (s) => s.relationship === "Mother" && s.marital_status === "Married"
  );
  const fatherIdx = secondaries.findIndex(
    (s) => s.relationship === "Father" && s.marital_status === "Married"
  );
  if (motherIdx >= 0 && fatherIdx >= 0 && motherIdx !== fatherIdx) {
    // Father is the bearer; mother hides.
    result.secondaries[fatherIdx].showsAnniversary = true;
    result.secondaries[motherIdx] = {
      showsAnniversary: false,
      partnerName:
        secondaries[fatherIdx].given_name || "your partner",
    };
  }

  return result;
}

/**
 * Given a family's raw submission (primary + secondaries), duplicate the
 * anniversary value from each bearer to their partner so both members end up
 * with the same date in the DB. Idempotent — safe to call in create + edit.
 */
export function duplicateCoupleAnniversaries<
  P extends {
    given_name: string;
    relationship: "Self";
    marital_status: string;
    wedding_anniversary?: string | null;
  },
  S extends {
    given_name: string;
    relationship: string;
    marital_status: string;
    gender?: string;
    wedding_anniversary?: string | null;
  }
>(primary: P, secondaries: S[]): { primary: P; secondaries: S[] } {
  const out: S[] = secondaries.map((s) => ({ ...s }));
  let nextPrimary: P = { ...primary };

  // Primary + spouse pair
  if (primary.marital_status === "Married") {
    const spouseIdx = out.findIndex(
      (s) => s.relationship === "Spouse" && s.marital_status === "Married"
    );
    if (spouseIdx >= 0) {
      const ann =
        primary.wedding_anniversary ||
        out[spouseIdx].wedding_anniversary ||
        null;
      nextPrimary = { ...nextPrimary, wedding_anniversary: ann };
      out[spouseIdx] = { ...out[spouseIdx], wedding_anniversary: ann };
    }
  }

  // Mother + father pair
  const motherIdx = out.findIndex(
    (s) => s.relationship === "Mother" && s.marital_status === "Married"
  );
  const fatherIdx = out.findIndex(
    (s) => s.relationship === "Father" && s.marital_status === "Married"
  );
  if (motherIdx >= 0 && fatherIdx >= 0 && motherIdx !== fatherIdx) {
    const ann =
      out[fatherIdx].wedding_anniversary ||
      out[motherIdx].wedding_anniversary ||
      null;
    out[motherIdx] = { ...out[motherIdx], wedding_anniversary: ann };
    out[fatherIdx] = { ...out[fatherIdx], wedding_anniversary: ann };
  }

  return { primary: nextPrimary, secondaries: out };
}

/**
 * Compute age from YYYY-MM-DD date of birth as of now in IST.
 * Throws if dob is invalid — callers MUST validate shape first.
 */
export function ageFromDob(dob: string): number {
  // Anchor "today" in IST to avoid boundary flips around midnight UTC.
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const [ty, tm, td] = todayIST.split("-").map((n) => parseInt(n, 10));
  const [by, bm, bd] = dob.split("-").map((n) => parseInt(n, 10));
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}
