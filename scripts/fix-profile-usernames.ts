import { writeFileSync } from "node:fs";

import { profilesApi } from "~/lib/api/profiles";
import { isUsernameInvalid } from "~/lib/profile-username";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";

/**
 * One-off backfill for legacy profiles whose `username` is missing, email-shaped,
 * or otherwise fails the public username format.
 *
 * `/user/<username>` is a public URL, so an email in that column leaks a personal
 * address into the sitemap and the SERP, and the profile is excluded from the
 * sitemap until it is fixed. The profile page already self-heals via
 * `fixInvalidProfileUsername`, but only when the owner signs in and opens it —
 * this walks every row instead of waiting.
 *
 * Dry run by default; pass `--apply` to write.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const client = createSupabaseAdminClient();

  const { data, error } = await client
    .from("profiles")
    .select("id, username, email")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const invalid = (data ?? []).filter((row) => isUsernameInvalid(row.username));
  console.log(
    `${invalid.length} of ${data?.length ?? 0} profiles need a username${apply ? "" : " (dry run)"}\n`,
  );

  // The old values are the only way back, and they are about to be overwritten.
  // Contains email addresses, so it is written outside the repo.
  if (apply && invalid.length > 0) {
    const backupPath = `/tmp/profile-usernames-backup-${Date.now()}.json`;
    writeFileSync(
      backupPath,
      JSON.stringify(
        invalid.map((row) => ({ id: row.id, username: row.username })),
        null,
        2,
      ),
    );
    console.log(`rollback data written to ${backupPath}\n`);
  }

  let updated = 0;
  let skipped = 0;
  // Dry runs write nothing, so the collision check in `deriveAvailableUsername`
  // cannot see names claimed earlier in the same run. Tracked here only so the
  // preview can flag them; the apply path resolves them for real.
  const planned = new Set<string>();

  // Sequential on purpose: `deriveAvailableUsername` checks the DB for
  // collisions, so two rows resolved in parallel could claim the same candidate.
  for (const row of invalid) {
    if (!row.email) {
      console.log(`  skip  ${row.id}  no email to derive from`);
      skipped++;
      continue;
    }

    let username: string;
    try {
      username = await profilesApi.deriveAvailableUsername(
        client,
        row.email,
        row.id,
      );
    } catch {
      console.log(`  skip  ${row.id}  could not derive an available username`);
      skipped++;
      continue;
    }

    const before = row.username ? redact(row.username) : "(empty)";

    if (!apply) {
      const note = planned.has(username)
        ? "  (taken earlier in this run — gets a -N suffix on apply)"
        : "";
      planned.add(username);
      console.log(`  plan  ${before}  ->  ${username}${note}`);
      updated++;
      continue;
    }

    const { error: updateError } = await client
      .from("profiles")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateError) {
      console.log(`  fail  ${before}  ->  ${username}  ${updateError.message}`);
      skipped++;
      continue;
    }

    console.log(`  done  ${before}  ->  ${username}`);
    updated++;
  }

  console.log(`\n${apply ? "updated" : "would update"}: ${updated}`);
  console.log(`skipped: ${skipped}`);
  if (!apply && updated > 0) {
    console.log("\nRe-run with --apply to write these changes.");
  }
}

/** Keeps email-shaped usernames out of the log output. */
function redact(username: string): string {
  const at = username.indexOf("@");
  return at === -1 ? username : `***${username.slice(at)}`;
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
