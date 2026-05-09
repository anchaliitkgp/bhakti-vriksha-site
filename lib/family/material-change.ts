// Pure-function predicate for detecting material edits on a family.
// Used by both client and server (design D17, FR-10.8):
//   - Client: decide whether to render the consent checkbox on /member/family/edit
//   - Server: authoritative check in PUT /api/family/[id]
//
// A "material" change is anything that affects membership composition or the
// data we display back on dashboards and celebration cards. Cosmetic edits
// (phone, secondary email, relationship label) are NOT material.

export type MemberSnapshot = {
  id: string;
  given_name: string;
  initiated: boolean;
  initiated_name: string | null;
  age: number;
  gender: string;
  marital_status: string;
  relationship: string;
  relationship_other: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  wedding_anniversary: string | null;
};

export type FamilySnapshot = {
  primary: MemberSnapshot;
  secondaries: MemberSnapshot[];
};

/** Fields whose change constitutes a "material" edit (FR-10.8). */
const MATERIAL_FIELDS: (keyof MemberSnapshot)[] = [
  "given_name",
  "initiated",
  "initiated_name",
  "age",
  "marital_status",
  "date_of_birth",
  "wedding_anniversary",
];

/** Fields whose change is considered cosmetic — NOT material. */
export const COSMETIC_FIELDS: (keyof MemberSnapshot)[] = [
  "phone",
  "email", // secondary-only; primary email is immutable per FR-10.3
  "relationship_other",
];

/**
 * Compare two family snapshots and return whether any material change exists.
 *   - add/remove a member                → material
 *   - any MATERIAL_FIELDS value changes  → material
 *   - only COSMETIC_FIELDS changes       → not material
 */
export function isMaterialChange(
  before: FamilySnapshot,
  after: FamilySnapshot
): boolean {
  // Composition changes (add or remove secondaries)
  const beforeIds = new Set(before.secondaries.map((s) => s.id));
  const afterIds = new Set(
    after.secondaries.map((s) => s.id).filter(Boolean) as string[]
  );
  if (beforeIds.size !== afterIds.size) return true;
  for (const id of beforeIds) {
    if (!afterIds.has(id)) return true;
  }
  // afterIds extra entries would also show up here
  for (const id of afterIds) {
    if (!beforeIds.has(id)) return true;
  }

  // Material-field changes on the primary
  if (memberHasMaterialChange(before.primary, after.primary)) return true;

  // Material-field changes on any kept secondary
  const afterBySecondaryId = new Map(
    after.secondaries.filter((s) => s.id).map((s) => [s.id!, s])
  );
  for (const b of before.secondaries) {
    const a = afterBySecondaryId.get(b.id);
    if (a && memberHasMaterialChange(b, a)) return true;
  }

  return false;
}

function memberHasMaterialChange(
  before: MemberSnapshot,
  after: MemberSnapshot
): boolean {
  for (const key of MATERIAL_FIELDS) {
    if (before[key] !== after[key]) return true;
  }
  return false;
}
