import { writeFileSync } from "node:fs";

import { hostsApi } from "~/lib/api/hosts";
import { createSupabaseAdminClient } from "~/lib/supabase/admin";
import type { EventHost } from "~/types";

/**
 * One-off backfill: links admin-imported events to existing hosts.
 *
 * An event matches a host when its first organizer name or its place equals
 * the host's name or place (case, quotes and whitespace ignored). Only events
 * created by ADMIN_USER_ID with no host yet are considered — events created by
 * registered organizers already point at their own profile. An event matching
 * more than one host is reported and skipped, never guessed.
 *
 * Dry run by default; pass `--apply` to write. Pass `--host=<slug>` to limit
 * the run to a single host.
 */

const PAGE_SIZE = 1000;

type EventRow = {
  id: number;
  title: string;
  startDate: string;
  place: string | null;
  organizers: unknown;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLocaleLowerCase("bg")
    .replace(/["'„“”«»`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstOrganizerName(organizers: unknown): string | null {
  if (!Array.isArray(organizers)) return null;
  const first: unknown = organizers[0];
  if (first && typeof first === "object" && "name" in first) {
    return typeof first.name === "string" ? first.name : null;
  }
  return null;
}

function hostKeys(host: EventHost): Set<string> {
  return new Set([normalize(host.name), normalize(host.place)].filter(Boolean));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const onlySlug = process.argv
    .find((arg) => arg.startsWith("--host="))
    ?.slice("--host=".length);

  const adminUserId = process.env.ADMIN_USER_ID;
  if (!adminUserId) throw new Error("ADMIN_USER_ID is not set");

  const client = createSupabaseAdminClient();
  const hosts = (await hostsApi.listHosts(client)).filter(
    (host) => !onlySlug || host.slug === onlySlug,
  );
  if (hosts.length === 0) {
    console.log("No hosts to match against.");
    return;
  }

  const events: EventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("events")
      .select("id, title, startDate, place, organizers")
      .eq("createdBy", adminUserId)
      .is("host_id", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    events.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const keysByHost = new Map(hosts.map((host) => [host.id, hostKeys(host)]));
  const planByHost = new Map<string, EventRow[]>();
  let ambiguous = 0;

  for (const event of events) {
    const eventKeys = [
      normalize(firstOrganizerName(event.organizers)),
      normalize(event.place),
    ].filter(Boolean);

    const matches = hosts.filter((host) =>
      eventKeys.some((key) => keysByHost.get(host.id)?.has(key)),
    );

    if (matches.length > 1) {
      ambiguous++;
      console.log(
        `  skip  #${event.id} ${event.startDate} „${event.title}“ matches ${matches
          .map((h) => h.slug)
          .join(", ")}`,
      );
      continue;
    }
    const [host] = matches;
    if (!host) continue;
    planByHost.set(host.id, [...(planByHost.get(host.id) ?? []), event]);
  }

  console.log(
    `\n${events.length} unlinked admin events, ${hosts.length} hosts${apply ? "" : " (dry run)"}\n`,
  );

  let linked = 0;
  const rollback: { id: number; host_id: null }[] = [];

  for (const host of hosts) {
    const planned = planByHost.get(host.id) ?? [];
    if (planned.length === 0) continue;

    console.log(`${host.name} (/host/${host.slug}) — ${planned.length}`);
    for (const event of planned) {
      console.log(`  ${event.startDate}  #${event.id}  ${event.title}`);
    }

    if (!apply) {
      linked += planned.length;
      continue;
    }

    const ids = planned.map((event) => event.id);
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const { error } = await client
        .from("events")
        .update({ host_id: host.id })
        .in("id", batch)
        .is("host_id", null);
      if (error) {
        console.log(`  fail  ${error.message}`);
        continue;
      }
      linked += batch.length;
      rollback.push(...batch.map((id) => ({ id, host_id: null })));
    }
  }

  if (apply && rollback.length > 0) {
    const backupPath = `/tmp/event-hosts-rollback-${Date.now()}.json`;
    writeFileSync(backupPath, JSON.stringify(rollback, null, 2));
    console.log(`\nrollback data written to ${backupPath}`);
  }

  console.log(`\n${apply ? "linked" : "would link"}: ${linked}`);
  console.log(`ambiguous (skipped): ${ambiguous}`);
  if (!apply && linked > 0) {
    console.log(
      "\nRe-run with --apply to write, then revalidate host pages (or wait for ISR).",
    );
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
