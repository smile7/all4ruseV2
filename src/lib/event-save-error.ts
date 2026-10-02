import {
  type FailureStage,
  getFailureMessage,
} from "~/lib/failures";
import { ImageCompressError } from "~/lib/images/compress-client";

export type EventSaveToastKey =
  | "saveErrorSession"
  | "saveErrorImage"
  | "saveErrorNetwork"
  | "error";

export function classifyEventSaveError(error: unknown): {
  toastKey: EventSaveToastKey;
  stage: FailureStage<"event_create">;
} {
  if (error instanceof ImageCompressError) {
    return { toastKey: "saveErrorImage", stage: "image_failed" };
  }

  const message = (getFailureMessage(error) ?? "").toLowerCase();

  if (
    message.includes("jwt") ||
    message.includes("session") ||
    message.includes("not authenticated") ||
    message.includes("auth session missing") ||
    message.includes("401")
  ) {
    return { toastKey: "saveErrorSession", stage: "session_expired" };
  }

  if (
    error instanceof Error &&
    error.name === "StorageUploadError"
  ) {
    return { toastKey: "saveErrorImage", stage: "image_failed" };
  }

  if (
    message.includes("storage") ||
    message.includes("upload") ||
    message.includes("mime") ||
    message.includes("payload too large") ||
    message.includes("413")
  ) {
    return { toastKey: "saveErrorImage", stage: "image_failed" };
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("offline")
  ) {
    return { toastKey: "saveErrorNetwork", stage: "network_failed" };
  }

  return { toastKey: "error", stage: "save_failed" };
}

export function storageUploadError(message: string): Error {
  const error = new Error(message);
  error.name = "StorageUploadError";
  return error;
}
