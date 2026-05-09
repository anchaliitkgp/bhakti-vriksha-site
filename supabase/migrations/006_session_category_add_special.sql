-- Migration 006: allow Special / Guest Session category
-- For one-off talks, guest devotees, and bonus sessions outside the 32-week
-- Gita backbone. Keeps the two main categories unchanged.

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_category_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_category_check
  CHECK (category IN (
    'Gita / Core',
    'Practical (HG Radheshyam Prabhu)',
    'Special / Guest Session'
  ));
