import {
  type FailureMetadata,
  type FailureStage,
  getFailureMessage,
} from "~/lib/failures";
import { recordFailure } from "~/lib/failures-server";

import type { SmartFillFeature } from "./rate-limit";

import "server-only";

type SmartFillFailureSource =
  | SmartFillFeature
  | "facebook_check"
  | "admin_scrape";

type SmartFillFailureInput = {
  userId: string;
  source: SmartFillFailureSource;
  stage: FailureStage<"smart_fill">;
  /** Either the caught error or a plain message. */
  error?: unknown;
  url?: string;
};

export async function recordSmartFillFailure({
  userId,
  source,
  stage,
  error,
  url,
}: SmartFillFailureInput): Promise<void> {
  const metadata: FailureMetadata = { source };
  if (url) metadata.url = url.slice(0, 200);

  await recordFailure({
    flow: "smart_fill",
    stage,
    userId,
    metadata,
    message: getFailureMessage(error),
  });
}
