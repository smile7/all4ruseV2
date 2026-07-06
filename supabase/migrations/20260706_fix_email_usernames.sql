-- One-time migration: profiles whose username was stored as an email address
-- (legacy sign-up path) are updated to the clean slug derived from the local
-- part of the email.  Collisions are resolved by appending -2, -3, …
--
-- Rules mirror the TypeScript helpers in src/lib/profile-username.ts:
--   deriveUsernameFromEmail  →  lower, replace non-alphanum with dash, trim dashes, max 30 chars
--   buildUsernameCandidate   →  if collision append "-N", truncate base to keep total ≤ 30

WITH
-- Step 1: derive the raw base slug from the email local part
derived AS (
  SELECT
    id,
    username AS old_username,
    LEFT(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(SPLIT_PART(username, '@', 1)),
          '[^a-z0-9]+', '-', 'g'   -- non-alphanum → dash
        ),
        '^-+|-+$', '', 'g'          -- trim leading/trailing dashes
      ),
      30
    ) AS base_slug
  FROM profiles
  WHERE username LIKE '%@%'
),

-- Step 2: assign a collision rank per base_slug
ranked AS (
  SELECT
    id,
    old_username,
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id) AS rn
  FROM derived
),

-- Step 3: build the final slug (append suffix for duplicates)
final_slugs AS (
  SELECT
    id,
    old_username,
    CASE
      WHEN rn = 1 THEN base_slug
      ELSE
        -- truncate base to leave room for the suffix "-N"
        LEFT(base_slug, 30 - LENGTH('-' || rn::text))
        || '-' || rn::text
    END AS new_username
  FROM ranked
)

UPDATE profiles p
SET
  username   = f.new_username,
  updated_at = NOW()
FROM final_slugs f
WHERE p.id = f.id
  -- safety: only update rows that still have an email-shaped username
  AND p.username LIKE '%@%';
