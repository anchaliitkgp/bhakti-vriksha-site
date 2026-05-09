# Requirements — Family Registration

**Status:** Draft v1
**Owner:** Anchal Nema
**Parent spec:** [`bhakti-vriksha-website`](../bhakti-vriksha-website/requirements.md) (US-7, US-14)
**Last updated:** 2026-05-09

---

## 1. Background

The Bhakti Vriksha Radha Madan Mohan site (see parent spec `bhakti-vriksha-website`) currently provides a contact-based registration path (US-7): a prospective family calls or WhatsApps HG Mahaprema Krishna Das, and is added to the WhatsApp group manually. There is no structured capture of family composition, no approval workflow, and no link between registration and the DB-backed member allowlist. Attendance (US-14) is per-individual and assumes every attendee signs in with their own Gmail — unrealistic for families where kids and one spouse often share a household email or don't use Gmail at all.

This spec replaces the contact-based flow with a **family-level registration flow** gated by Organiser approval. A registering household submits one form describing the whole family. Organisers review the submission in a queue and approve or reject it. On approval, the primary member's email is allowlisted, the family can sign in, the member dashboard greets them as `<Primary Name> and Family`, and the primary can mark attendance on behalf of the whole family in one click. Optional birthday and anniversary fields are captured at registration so that later phases can surface upcoming celebrations to the sanga.

This spec is scoped to **Phase 1** of the family-registration capability: the form, the approval queue, the allowlist bridge, family-level attendance, and profile editing. Event rendering, automated emails, and photo uploads are deferred to Phase 2 of this spec.

## 2. Glossary

- **Family**: A household registered via the new flow. One Family has exactly one Primary member and zero or more Secondary members.
- **Primary**: The person who owns the family's login identity. Their email is the allowlisted Gmail.
- **Secondary**: Any family member other than the Primary (spouse, children, parents, siblings, other).
- **Registrant**: A Primary who has submitted the form but whose Family has not yet been approved.
- **Organiser**: An authenticated user with the `organiser` role (defined in `lib/auth/roles.ts` in the parent spec). Includes the Website Manager.
- **Approval_Queue**: The ordered list of Families in `Pending` status awaiting Organiser review.
- **Role_Allowlist**: The union of (a) the code-based allowlist in `lib/auth/roles.ts` (Manager + Organisers) and (b) the DB-backed set of emails belonging to Approved Families.
- **Sanga**: The community of devotees attending the Sunday program.
- **Session**: A Sunday program instance (week 1..32).
- **Family_Attendance**: A record that a Family was present for a Session. Either a new table or a column on the existing `attendance` table — decision deferred to design phase.
- **Audit_Log**: An append-only record of who changed what on a Family and when.

## 3. Goals (measurable)

| # | Goal | Success signal |
|---|---|---|
| G1 | A prospective family completes the structured form on mobile in under 4 minutes for a family of 4. | Time-to-submit median < 4 min measured on dev, confirmed with 3 pilot families. |
| G2 | Organisers process the approval queue in under 30 seconds per Family on average. | Approve/Reject action takes one click; queue shows all pending Families on one screen for up to 50 items. |
| G3 | Approved Families can sign in within 60 seconds of approval with no further manual step by the Website Manager. | DB-backed allowlist reflects the approval immediately; the next sign-in attempt by the Primary succeeds. |
| G4 | A Primary marks attendance for the whole Family in one click. | One `POST /api/attendance/mark` call produces one Family_Attendance record per Session (schema shape to be decided in design). |
| G5 | Pending Families are never allowlisted and cannot sign in. | Sign-in attempt by a Pending Family's Primary returns a clear "pending approval" message; no Member row is created. |
| G6 | Kids' personal data (age, gender, DOB) is never rendered on any publicly accessible page. | Public pages never query the `family_members` table; middleware blocks unauthenticated access to any route that could surface a minor's identity. |
| G7 | Primaries can update family composition and event dates any time without Organiser involvement. | Edit-family UI available on the Member dashboard; changes audited. |

## 4. In Scope — Phase 1 of this spec

1. Replace `app/register/page.tsx` (the current contact-fallback registration page) with a structured family-registration form.
2. New DB schema for Families, Family Members, and Family Events. Attendance-schema choice (new table vs new column) deferred to design — see OQ-FR-3.
3. Pending / Approved / Rejected status on each Family.
4. Organiser approval queue at `/admin/registrations` with Approve and Reject actions (optional reject reason).
5. DB-backed extension of the Role_Allowlist: Approved Families' Primary emails (and any Secondary Gmails) become Members automatically.
6. Sign-in flow rejects Pending and Rejected Family Primaries with a clear message.
7. Family-level attendance: the Primary marks attendance for the whole Family in one click; Secondaries with their own Gmail can still mark themselves independently.
8. Member dashboard greets the Family as `Hare Krishna, <Primary First Name> and Family` when Family size > 1.
9. "Edit family" flow on the Member dashboard for the Primary to add/remove Secondaries, update ages, update marital status (subject to age-18 rule), update events.
10. Audit_Log for all family edits (who, what, when).
11. Validation rules: exactly one Primary per Family; Primary cannot be removed while Secondaries exist; age < 18 auto-locks marital status to Single.
12. Mobile-first UX; warm Vaishnava copy on event fields.

## 5. Out of Scope — deferred to Phase 2 of this spec

- UI to surface upcoming birthdays and anniversaries on the Organiser dashboard or `/events` page. This spec only captures the data.
- Automated email notifications on approve / reject (confirmation emails, rejection reasons sent to the Primary).
- Photo upload per Family.
- Per-member login differentiation within a Family (treating each Secondary as a separately authenticated identity with their own dashboard view).
- Bulk operations on the approval queue (approve-all, reject-all).
- Self-service email change for the Primary (this remains an Organiser-intervention flow).
- Organiser-initiated Family creation (today, every Family enters through the registration form).
- Hindi / multi-language copy for the form.

## 6. Personas

| Persona | Primary goal | Tech comfort |
|---|---|---|
| **Nisha (Family Registrant, Primary)** | Register her family of 4 from her phone on a Sunday evening, see that the form was received, and come back a day later to sign in once approved. | Smartphone, WhatsApp-first, not a power user. |
| **HG Mahaprema Krishna Das (Organiser, reviewer)** | Work through the pending-families queue on his phone between sessions; Approve most, Reject the occasional duplicate or spam. | Mixed; may approve from a desktop on weekdays and a phone on Sundays. |
| **Ravi (Approved Family Primary, attending member)** | On Sunday morning, open the site on his phone, see "Hare Krishna, Ravi and Family" on the dashboard, and tap "Mark attendance" for the whole family. Occasionally updates his kids' ages before a birthday celebration. | Mixed — desktop at work, phone at home. |
| **Anchal (Website Manager)** | Occasionally help an Organiser unblock a stuck approval or fix a wrong Primary email. Primary role is technical admin, not day-to-day approval. | Engineer. |

## 7. User Stories & Acceptance Criteria

Acceptance criteria follow EARS patterns (Ubiquitous, Event-driven, State-driven, Unwanted-event, Optional-feature, Complex). Systems referenced are defined in section 2 (Glossary).

### FR-01 — Submit a family registration

**User story:** As a prospective Primary, I want to submit a single form describing my whole family, so that the sanga has a complete picture of who is joining and I do not have to explain it over WhatsApp.

**Acceptance criteria:**
1. WHEN a visitor navigates to `/register`, THE Registration_Form SHALL render a form with one Primary section and a control to add Secondary members.
2. THE Registration_Form SHALL require the Primary's Name, Relationship-to-primary (fixed to "Self"), Age (integer 0–120), Gender (Male / Female / Other), Marital Status (Married / Single), Email, and Phone.
3. THE Registration_Form SHALL treat the Primary's Date of Birth and Wedding Anniversary as optional fields.
4. WHEN the visitor submits a valid form, THE Registration_Form SHALL create one Family in `Pending` status with one Primary member and zero or more Secondary members, and SHALL return a confirmation screen within 3 seconds on a 3G mobile connection.
5. WHEN the visitor submits the form and the Primary's email already exists on any Family (regardless of status), THE Registration_Form SHALL reject the submission with a message explaining that the email is already registered and pointing to the contact page.
6. IF the form submission fails due to a server error, THEN THE Registration_Form SHALL preserve all user input and display a retry affordance.
7. THE Registration_Form SHALL render correctly on a 360×640 viewport with no horizontal overflow.
8. THE Registration_Form SHALL require the consent gate defined in FR-13 to be checked before allowing submission.

### FR-02 — Add Secondary family members during registration

**User story:** As a Primary, I want to add my spouse, children, and any other family members in the same form, so that my whole family is registered in one submission.

**Acceptance criteria:**
1. WHEN the Primary clicks "Add family member", THE Registration_Form SHALL append a new Secondary member block with the same per-member fields as the Primary, except that Email and Phone are optional and Relationship is a selectable dropdown.
2. THE Relationship dropdown for Secondary members SHALL offer exactly the values: `Spouse`, `Son`, `Daughter`, `Mother`, `Father`, `Sister`, `Brother`, `Other`.
3. WHERE the Relationship is `Other`, THE Registration_Form SHALL require a non-empty free-text label of up to 40 characters.
4. THE Registration_Form SHALL offer two independent checkboxes on each Secondary block labelled "Same email as Primary" and "Same phone as Primary"; WHEN either is checked, THE Registration_Form SHALL copy the Primary's value into the Secondary's corresponding field and SHALL disable the field until unchecked.
5. WHILE a Secondary member has Age less than 18, THE Registration_Form SHALL force Marital Status to `Single` and SHALL prevent the user from editing that field.
6. WHEN the Primary removes a Secondary block, THE Registration_Form SHALL immediately drop that member's data with no server round-trip.
7. THE Registration_Form SHALL accept 0 to 15 Secondary members per Family; IF the Primary attempts to add a 16th, THEN THE Registration_Form SHALL disable the "Add family member" control and display the limit.
8. THE Registration_Form SHALL render its mobile layout such that each Secondary block is collapsible, so that a family of 6 does not produce a 5-screen-tall form.
9. THE Registration_Form SHALL offer an "Initiated" checkbox on every member block (Primary and Secondary), defaulting to unchecked. WHEN the checkbox is ticked, THE Registration_Form SHALL reveal an "Initiated name" text field and SHALL require a non-empty value before submission. The initiated name SHALL persist independently of the member's given name.
10. WHERE a member has an initiated name, THE Member_Dashboard, Approval_Queue detail view, and any future celebration UI SHALL display the initiated name instead of the given name for that member. The given name is retained for organiser-only administrative views.

### FR-03 — Capture birthdays and wedding anniversaries

**User story:** As a Primary, I want to optionally share birthdays and wedding anniversaries, so that the sanga can celebrate and seek devotees' blessings.

**Acceptance criteria:**
1. THE Registration_Form SHALL present a Date-of-Birth field and (when Marital Status is Married) a Wedding Anniversary field on every member block, each clearly marked optional.
2. THE Registration_Form SHALL display copy explaining the purpose: "Share birthdays and anniversaries so the sanga can celebrate and seek devotees' blessings." The copy SHALL NOT imply that sharing is required.
3. WHILE a member's Marital Status is `Single`, THE Registration_Form SHALL hide the Wedding Anniversary input entirely.
4. WHEN a member's Marital Status changes from `Single` to `Married`, THE Registration_Form SHALL reveal the Wedding Anniversary input in-place without losing other entered data.
5. WHEN the Primary submits the form, THE Registration_Form SHALL persist each non-empty Date-of-Birth and Wedding Anniversary to the Family_Events store (exact schema decided in design), and SHALL accept empty values without error.
6. IF a Date-of-Birth implies an age that differs from the member's entered Age by more than 1 year, THEN THE Registration_Form SHALL surface a non-blocking warning next to the field ("This DOB doesn't match the age you entered — is that right?"), and SHALL still allow submission.

### FR-04 — Pending-approval experience for the registrant

**User story:** As a Primary whose registration is pending, I want to see a clear status when I try to sign in, so that I know the submission was received and I am waiting on review, not broken.

**Acceptance criteria:**
1. WHEN a visitor completes registration, THE Registration_Form SHALL display a confirmation screen stating that the Family is pending approval and naming the Organiser who will review it.
2. WHILE a Family is in `Pending` status, THE Role_Allowlist SHALL NOT contain the Primary's email.
3. WHEN a Pending Family's Primary signs in via Google, THE System SHALL render a "Your registration is pending approval" screen and SHALL NOT create a Member row.
4. WHEN a `Rejected` Family's Primary signs in, THE System SHALL render a "Your registration was not approved — please contact the Organiser" screen and SHALL NOT create a Member row.
5. THE confirmation screen SHALL include the Program Coordinator's WhatsApp and email contact for follow-up.

### FR-05 — Organiser views the approval queue

**User story:** As an Organiser, I want to see all pending registrations in one place with enough context to decide, so that I can clear the queue quickly between other duties.

**Acceptance criteria:**
1. WHEN an Organiser navigates to `/admin/registrations`, THE Approval_Queue SHALL list all Families with status `Pending`, sorted by submission time ascending (oldest first).
2. THE Approval_Queue SHALL display, for each Family: Primary name, Primary email, Primary phone, Family size, submission timestamp, and a one-line summary of the Secondaries (e.g. "Spouse · Son (12) · Daughter (9)").
3. THE Approval_Queue SHALL render a count of pending Families at the top of the page.
4. WHEN an Organiser clicks a Family row, THE Approval_Queue SHALL expand an in-place detail view showing every field of every member, including optional DOB and anniversary values.
5. THE Approval_Queue SHALL also expose tabs or filters for `Approved` and `Rejected` Families so an Organiser can audit past decisions.
6. IF a Member or Guest navigates to `/admin/registrations`, THEN THE System SHALL reject the request with the standard admin-guard redirect defined in the parent spec.

### FR-06 — Organiser approves or rejects a family

**User story:** As an Organiser, I want to Approve or Reject a Family with one click, optionally capturing a reject reason, so that the queue moves fast.

**Acceptance criteria:**
1. WHEN an Organiser clicks "Approve" on a Pending Family, THE System SHALL transition the Family to `Approved` status, SHALL add the Primary's email to the DB-backed Role_Allowlist, SHALL add any Secondary Gmail address to the same allowlist, and SHALL record the Organiser's identity and the timestamp in the Audit_Log.
2. WHEN an Organiser clicks "Reject" on a Pending Family, THE System SHALL transition the Family to `Rejected` status, SHALL accept an optional free-text reason of up to 280 characters, and SHALL record the Organiser's identity, timestamp, and reason in the Audit_Log.
3. THE System SHALL NOT require the Website Manager to redeploy for an approval or rejection to take effect.
4. WHEN the Primary of a newly Approved Family signs in, THE System SHALL create or update the Member row and SHALL route the user to the Member dashboard.
5. IF two Organisers approve the same Family simultaneously, THEN THE System SHALL accept exactly one transition and SHALL return a clear "already approved by [name]" response to the second caller.
6. THE System SHALL permit an Organiser to reopen a Rejected Family by transitioning it back to `Pending` (with an Audit_Log entry), but SHALL NOT permit transitioning an Approved Family directly to Rejected — design phase decides the exact allowed state graph.

### FR-07 — DB-backed allowlist merges with code-based allowlist

**User story:** As the System, I want the effective member allowlist to be the union of the code-based Organiser/Manager allowlist and the DB-backed Approved-family allowlist, so that approvals take effect without a redeploy and hard-coded roles still override.

**Acceptance criteria:**
1. THE Role_Allowlist SHALL resolve an email's role by first checking the code-based allowlist in `lib/auth/roles.ts`, and WHEN the email is present there, SHALL return that role.
2. WHEN an email is not in the code-based allowlist, THE Role_Allowlist SHALL check the DB-backed Approved-family allowlist; WHEN the email belongs to an Approved Family's Primary or a Secondary with a Gmail address, THE Role_Allowlist SHALL return the role `member`.
3. WHEN an email is in neither allowlist, THE Role_Allowlist SHALL return `guest` and THE System SHALL reject sign-in with the "pending or unregistered" message defined in FR-04.
4. IF an email appears in both allowlists, THEN THE Role_Allowlist SHALL return the code-based role (Manager / Organiser overrides Member).
5. WHEN an Organiser rejects a previously Approved Family, THE Role_Allowlist SHALL remove that Family's emails from the DB-backed allowlist within the same transaction.

### FR-08 — Family-level attendance by the Primary

**User story:** As a Primary who attended Sunday session with my family, I want to mark attendance once for the whole family, so that I do not have to chase each member to sign in individually.

**Acceptance criteria:**
1. WHEN a Primary views the Member dashboard on a Sunday that matches a scheduled Session, THE Attendance_System SHALL render an "I attended with my Family today" control in place of the individual attendance control.
2. WHEN the Primary clicks the family-attendance control, THE Attendance_System SHALL create exactly one Family_Attendance record for the Family and Session in a single atomic operation.
3. WHEN a Secondary member with their own Gmail address views the Member dashboard on a session Sunday, THE Attendance_System SHALL allow that Secondary to mark their own attendance independently of the Primary.
4. WHERE a Secondary marks their own attendance and the Primary has already marked family-level attendance, THE Attendance_System SHALL ensure the Secondary is still counted exactly once for the Session (de-duplication rule; exact enforcement — DB constraint vs application logic — decided in design).
5. WHILE it is not Sunday of a scheduled Session, THE Attendance_System SHALL either hide the family-attendance control or render it disabled with the explanation already used in the parent spec's US-14.
6. IF a Family's status is not `Approved`, THEN THE Attendance_System SHALL NOT expose any attendance control to that Family.
7. THE Attendance_System SHALL reuse the existing IST-day comparison logic from the parent spec (`effectiveTodayIST`) so behaviour around timezone boundaries is unchanged.

### FR-09 — Dashboard greets the family

**User story:** As an approved Primary, I want the Member dashboard to greet my family as a unit, so that the site feels personal to the whole household.

**Acceptance criteria:**
1. WHEN an Approved Primary loads `/member` AND the Family has at least one Secondary, THE Member_Dashboard SHALL render the header as `Hare Krishna, <Primary Display First Name> and Family!` where Display First Name is the first token of the initiated name when present, else the first token of the given name.
2. WHEN an Approved Primary loads `/member` AND the Family has no Secondaries, THE Member_Dashboard SHALL render the header as `Hare Krishna, <Primary Display First Name>!` using the same rule as criterion 1.
3. WHEN a Secondary with their own Gmail loads `/member`, THE Member_Dashboard SHALL render the header as `Hare Krishna, <Secondary Display First Name>!` (Secondaries do not collectively greet the family). Same initiated-name preference applies.
4. THE role badge on the dashboard SHALL remain unchanged — `Member`, `Organiser`, `Website Manager`.
5. THE Member_Dashboard SHALL include an "Edit family" link visible only to the Primary.

### FR-10 — Primary edits family profile

**User story:** As a Primary, I want to update my family composition and event dates any time, so that records stay current (new baby, child turning 18, anniversary correction) without asking the Organiser.

**Acceptance criteria:**
1. WHEN the Primary clicks "Edit family" on the Member_Dashboard, THE System SHALL render an editable view of every Family_Member and every Family_Event using the same component tree as FR-01 / FR-02 / FR-03.
2. THE System SHALL permit the Primary to add a Secondary, remove a Secondary, change any Secondary's Name, Relationship, Age, Gender, Marital Status (subject to the age-18 rule), Email, Phone, DOB, Wedding Anniversary, Initiated flag, and Initiated name.
3. THE System SHALL NOT permit the Primary to change their own email address through this UI.
4. IF the Primary attempts to remove themselves from the Family WHILE any Secondary exists, THEN THE System SHALL reject the change with the message "The primary cannot be removed while other family members exist."
5. WHEN the Primary adds a Secondary with a Gmail address to an Approved Family, THE System SHALL add that address to the DB-backed Role_Allowlist within the same transaction.
6. WHEN the Primary removes a Secondary whose Gmail was on the allowlist, THE System SHALL remove that address from the DB-backed Role_Allowlist within the same transaction.
7. WHEN the Primary saves any change, THE System SHALL write exactly one Audit_Log entry summarising the diff (who, what fields, old → new, when).
8. WHEN the Primary saves an edit that materially changes member composition, member ages, events, or initiation status, THE System SHALL re-require the consent checkbox defined in FR-13 and SHALL record a new consent timestamp. WHEN the edit is cosmetic (e.g., fixing a typo in a phone number), THE System MAY skip the re-consent prompt; design phase decides the exact "material change" predicate.

### FR-11 — Audit log for family changes

**User story:** As an Organiser, I want a durable record of who changed what on a Family and when, so that disputes and data hygiene issues can be investigated.

**Acceptance criteria:**
1. THE Audit_Log SHALL capture, for every create / approve / reject / edit action on a Family: actor identity (email + role), action type, target Family identifier, a serializable diff, and a UTC timestamp.
2. THE Audit_Log SHALL be append-only; THE System SHALL NOT expose an API or UI to delete or modify existing entries.
3. WHERE the Organiser's `/admin/registrations` detail view is opened on a Family, THE System SHALL display the Audit_Log history for that Family in reverse chronological order.
4. IF writing an Audit_Log entry fails, THEN THE System SHALL roll back the originating state change so that the database and audit trail cannot diverge.

### FR-12 — Data integrity and validation rules

**User story:** As the System, I want to enforce the core invariants of the Family model, so that downstream code, the Approval_Queue, the Role_Allowlist, and the Attendance_System can trust what they read.

**Acceptance criteria:**
1. THE System SHALL enforce that every Family has exactly one Primary at all times.
2. THE System SHALL enforce that every Family_Member's Age is an integer in the range 0 to 120 inclusive.
3. WHILE a Family_Member's Age is less than 18, THE System SHALL enforce Marital Status equal to `Single` at the persistence layer (not only in the form UI).
4. THE System SHALL enforce that the Primary's Email is unique across all Families regardless of status (Pending, Approved, Rejected).
5. THE System SHALL enforce that a Family has at most 16 members (1 Primary + up to 15 Secondaries).
6. IF a client submits a Family whose only member is missing, or whose Primary's Relationship is not `Self`, THEN THE System SHALL reject the submission with a 400-level response.
7. THE System SHALL reject any attempt to set `approved_at` or `rejected_at` fields without a corresponding `approved_by` / `rejected_by` actor.

### FR-13 — Consent gate for sharing family data

**User story:** As a Primary registering a family that includes minors, I want to affirm that I am authorised to share their information, so that our data stewardship is explicit.

**Acceptance criteria:**
1. THE Registration_Form SHALL display a single consent checkbox at the bottom of the form, defaulting to unchecked. Label: "I confirm I am authorised to share the above information for my family, including any minors, and I agree to the sanga holding this data for the purposes of the program."
2. THE Registration_Form SHALL disable the Submit button WHILE the consent checkbox is unchecked.
3. IF the Registration_Form is submitted with an unchecked consent box (e.g., via direct API call bypassing the UI), THEN THE System SHALL reject the submission with a 400-level response and the message "Consent to share family data is required."
4. THE System SHALL persist the consent flag and timestamp on the Family record so that it is clear when and by whom consent was given.
5. WHEN the Primary re-saves the Family via "Edit family" after a material change to member composition or events, THE System SHALL re-require the consent checkbox on that edit, recording a new consent timestamp.
6. THE System SHALL NOT retain any submitted Family data if the consent box was never checked; IF such a row exists due to a bug, THEN THE System SHALL treat it as a validation failure on read.

## 8. Non-Functional Requirements

### NFR-FR-1 — Privacy, with explicit attention to minors
1. THE System SHALL NOT render Name, Age, Gender, DOB, or any other identifying field of a Family_Member whose Age is less than 18 on any publicly accessible page.
2. THE System SHALL restrict `/admin/registrations` and all `family_members` / `family_events` reads to authenticated Organisers and the Website Manager.
3. THE System SHALL transmit all Family data over HTTPS only (inherited from the parent spec's NFR-5).
4. WHERE anonymous visitors see pages that list Families (e.g., a future celebrations page), THE System SHALL render only an aggregate count or a first-name-only, age-redacted summary — never enough to identify a minor.
5. THE System SHALL NOT send minors' data to any third-party service (analytics, error monitoring) in request payloads or logs.
6. Guardian-consent language on the registration form is an Open Question (OQ-FR-4).

### NFR-FR-2 — Data retention and deletion
1. THE System SHALL retain Rejected Family records for at least 30 days and at most 180 days, then SHALL purge them via a scheduled job.
2. THE System SHALL retain Approved Family records for the lifetime of the program (through at least 2027-12-31) and SHALL NOT purge them without Website Manager action.
3. WHEN a Primary requests data deletion (via the Organiser), THE System SHALL delete the Family, all Family_Members, all Family_Events, and all Family_Attendance rows, and SHALL retain only a single Audit_Log tombstone.
4. THE System SHALL NOT back up Family data outside the Supabase-managed backups inherited from the parent spec.

### NFR-FR-3 — Mobile-first
1. THE Registration_Form, Approval_Queue, and Edit-Family flows SHALL render usable layouts on a 360×640 viewport.
2. THE Registration_Form SHALL keep Secondary member blocks collapsible so that a 6-person family form fits readable-height screens.
3. Touch targets on the form and approval queue SHALL be at least 44×44 px.
4. THE Registration_Form SHALL preserve entered data across browser-tab re-activations for at least 30 minutes (via `sessionStorage` or equivalent), so that a parent who switches to WhatsApp to copy a phone number does not lose progress.

### NFR-FR-4 — Accessibility
1. THE Registration_Form and Approval_Queue SHALL meet WCAG 2.1 AA (inherited from parent NFR-2).
2. Every form field SHALL have a programmatically associated label.
3. Dynamic changes (showing / hiding Wedding Anniversary, enabling / disabling Marital Status for minors) SHALL be announced to screen readers via appropriate ARIA live regions or field-level messages.
4. Error messages SHALL be associated with their fields via `aria-describedby`.

### NFR-FR-5 — Performance
1. THE Registration_Form SHALL submit in under 3 seconds on a 3G mobile connection for a Family of up to 6 members.
2. THE Approval_Queue SHALL render up to 50 pending Families in under 2 seconds on a standard broadband connection.
3. The approve / reject action SHALL complete in under 1 second measured server-side.

### NFR-FR-6 — Operational safety
1. Approve / Reject actions SHALL be idempotent so that a double-click or network retry does not produce duplicate Audit_Log entries.
2. DB-backed allowlist changes SHALL be transactional with Family state transitions (a failure in one rolls back the other).
3. THE System SHALL log structured events for every approve, reject, and edit for observability (inherited from parent NFR-9).

### NFR-FR-7 — Copy and tone
1. Event-field copy SHALL use warm Vaishnava language (see FR-03.2).
2. Rejection messages SHALL be respectful and SHALL direct the registrant to a human contact (Program Coordinator).
3. THE UI SHALL consistently say "family" (lowercase) in prose, and "Family" only when referring to the entity.

## 9. Assumptions

1. Every Primary's login is a Google (Gmail) account. Non-Gmail primary emails are out of scope for Phase 1.
2. A Family has at most 16 members (1 Primary + up to 15 Secondaries) — large enough for any realistic household.
3. Approval decisions are made by humans; no auto-approval rules exist in Phase 1.
4. Fraud / spam rate is expected to be low (small, trust-based community); CAPTCHA is not required for Phase 1 but may be added if the approval queue accumulates obvious spam.
5. All registrations happen through the `/register` page. Organiser-initiated Family creation is not in scope.
6. The existing `sessions` table and IST-aware attendance-date logic from the parent spec are reused as-is.
7. Google OAuth and NextAuth session behaviour from the parent spec are reused as-is.
8. Dev / Prod Supabase separation from the parent spec applies.
9. The relationships dropdown covers the realistic household shapes observed in the sanga; "Other" plus free text catches the long tail.

## 10. Open Questions — resolved and remaining

### Resolved in this review

| # | Question | Decision |
|---|---|---|
| OQ-FR-3 | Family-level attendance schema: new column on `attendance` or separate `family_attendance` table? | **Design-phase choice, optimize for extensibility.** Whatever cleanly allows us to later add per-member attendance within a family, mark-on-behalf by organisers, and "this family was absent" reporting without a schema rewrite. Recommend separate `family_attendance` table with FK to `families`, keeping the existing `attendance` table untouched for individual records. |
| OQ-FR-4 | Guardian-consent language for minors' data? | **Single consent checkbox at the bottom of the registration form.** Unchecked by default. Label: "I confirm I am authorised to share the above information for my family, including any minors, and I agree to the sanga holding this data for the purposes of the program." Submission is blocked if unchecked. One checkbox covers the whole family rather than per-minor. |
| OQ-FR-9 | Initiated / spiritual names vs legal names? | **Add an "Initiated" checkbox to each member block.** Default unchecked. When checked, reveal an "Initiated name" field (required when checked). The primary's display name in the UI ("Hare Krishna, X and Family!") uses the initiated name if present, else the given name. |
| Admin UX | Should Organisers have a dedicated simple approval page? | **Yes — dedicated `/admin/registrations` page showing the queue with one-click Approve / Reject, unchanged from FR-05 / FR-06.** Reinforced by this review: the page must be a standalone, minimal UI — just the queue, the family detail expander, and the two action buttons. No other admin features live on that page. |

### Still open — design phase to decide

| # | Question | Blocking phase | Notes |
|---|---|---|---|
| OQ-FR-1 | Upcoming-celebrations card on Organiser dashboard in Phase 1 vs Phase 2? | Phase 1 design | Currently deferred to Phase 2. Design may pull it forward if near-free. |
| OQ-FR-2 | Approval / rejection email to the Primary in Phase 1 vs Phase 2? | Phase 1 design | Currently Phase 2. Reconsider during design if Supabase + a simple transactional-email provider makes it quick. |
| OQ-FR-5 | Exact allowed Family state transitions — can Approved become Rejected? Can Rejected be re-opened to Pending? | Phase 1 design | |
| OQ-FR-6 | When an Organiser un-approves a Family, what happens to historical Family_Attendance rows — preserve-and-orphan, soft-delete, or cascade? | Phase 1 design | Tied to OQ-FR-3. |
| OQ-FR-7 | Rate-limit `/register` submissions per IP to mitigate spam? | Phase 1 design | |
| OQ-FR-8 | Does the Approval_Queue need a "claim" signal to prevent two Organisers reviewing the same Family simultaneously, or is optimistic-last-writer-wins plus FR-06.5 sufficient? | Phase 1 design | |

## 11. Known Integration Points with the Parent Spec

This spec touches the following files and endpoints in `bhakti-vriksha-site`:

**Replaces (behaviour change — no backward compatibility with the current page):**
- `app/register/page.tsx` — today a contact-fallback page; becomes the structured Registration_Form.

**Extends:**
- `lib/auth/roles.ts` — `roleFor()` must consult the DB-backed Approved-family allowlist when the code-based allowlist misses. Code-based entries still override.
- `app/api/auth/[...nextauth]/*` — sign-in callback must detect Pending / Rejected Families and short-circuit with the appropriate error screen instead of creating a Member row.
- `app/signin/SignInCard.tsx` + `app/signin/page.tsx` — handle "pending" and "rejected" states surfaced from NextAuth.
- `middleware.ts` — add `/admin/registrations` to the Organiser-guarded routes.
- `app/admin/page.tsx` — link to the new `/admin/registrations` page and surface the pending count.
- `app/member/page.tsx` — greet as "<Primary> and Family" (FR-09), expose "Edit family" link (FR-10), switch attendance UI to family-level when appropriate (FR-08).
- `app/api/attendance/mark/route.ts` — accept a family-level marking path and preserve the individual path for Secondaries with their own Gmail.
- `components/AttendanceButton.tsx` — support the family-level variant with one-click semantics.

**Adds (new files — final names decided in design):**
- `app/admin/registrations/page.tsx` — Approval_Queue page for Organisers.
- `app/member/family/edit/page.tsx` (or equivalent) — Edit-family flow.
- `app/api/family/register/route.ts` — POST endpoint behind the Registration_Form.
- `app/api/family/[id]/approve/route.ts` and `.../reject/route.ts` — Organiser actions.
- `app/api/family/[id]/edit/route.ts` — Primary edits.
- `supabase/migrations/007_families.sql` — Families table.
- `supabase/migrations/008_family_members.sql` — Family members table.
- `supabase/migrations/009_family_events.sql` — Optional DOB / anniversary store.
- `supabase/migrations/010_family_attendance.sql` OR a column on `003_attendance.sql` via a follow-up migration — per OQ-FR-3.
- `supabase/migrations/011_family_audit_log.sql` — Audit_Log.
- `supabase/migrations/012_families_rls.sql` — RLS policies mirroring `005_rls.sql`.

**Inherits unchanged:**
- Google OAuth provider, NextAuth config, IST-day logic in `lib/auth/dev-overrides.ts`, Supabase server client, Dev / Prod env split, tailwind palette.

## 12. Success Criteria — Phase 1 of this spec

The family-registration Phase 1 is considered done when all of the following hold on prod:

- [ ] `/register` renders the structured family-registration form on desktop and mobile and submits successfully for families of sizes 1, 4, and 6 (representative cases).
- [ ] A new Family lands in `Pending` status and appears in `/admin/registrations` for Organisers within 1 minute of submission.
- [ ] An Organiser can Approve a Family and, within 60 seconds, that Family's Primary can sign in as a Member without any Website Manager action.
- [ ] A Pending Primary sees the "pending approval" screen on sign-in attempt and no Member row is created.
- [ ] A Rejected Primary sees the "not approved" screen on sign-in attempt with a contact-us pointer.
- [ ] A Primary of a 4-person Approved Family sees `Hare Krishna, <First Name> and Family!` on `/member`.
- [ ] A Primary can mark family-level attendance on a Session Sunday in one click, and the record is visible to Organisers.
- [ ] A Secondary with their own Gmail can mark individual attendance independently, and the Family is not double-counted for that Session.
- [ ] A Primary can add a new Secondary via "Edit family", and if that Secondary has a Gmail, they can sign in on the next attempt with no Organiser action.
- [ ] Every create / approve / reject / edit writes exactly one Audit_Log row; no row is ever deleted or mutated.
- [ ] No public page exposes any identifying field of a minor; `/admin/*` remains Organiser-gated.
- [ ] Rejected Families are automatically purged between 30 and 180 days after rejection (scheduled job verified in at least one dev cycle).

---

**End of requirements draft v1.**

Review focus: section 10 (Open Questions), especially OQ-FR-3 (attendance schema) and OQ-FR-4 (guardian consent). These two shape the design phase more than anything else.
