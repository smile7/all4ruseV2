"use client";

import { useCallback, useEffect, useState } from "react";

import {
  reportPushEnableFailure,
  urlBase64ToUint8Array,
  VAPID_PUBLIC_KEY,
} from "~/lib/push-client";

const SW_LOOKUP_MS = 5000;
const SW_POLL_MS = 250;

type PermissionState = "default" | "granted" | "denied" | "unsupported";

type PushState = {
  isReady: boolean;
  isPushCapable: boolean;
  hasServiceWorker: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
};

type UsePushNotificationsReturn = PushState & {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Asks the server whether this endpoint is stored for the signed-in user.
 * Returns null when the answer is unknown (offline, server error) so callers
 * can keep the browser-derived state instead of flipping the UI on a blip.
 */
async function isEndpointRegistered(endpoint: string): Promise<boolean | null> {
  try {
    const res = await fetch(
      `/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { registered?: boolean };
    return json.registered === true;
  } catch {
    return null;
  }
}

async function findRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? null;
  } catch {
    return null;
  }
}

/** Polls briefly for Serwist registration without hanging on `navigator.serviceWorker.ready`. */
async function waitForRegistration(
  timeoutMs = SW_LOOKUP_MS,
): Promise<ServiceWorkerRegistration | null> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const reg = await findRegistration();
    if (reg?.active) return reg;
    await new Promise((resolve) => setTimeout(resolve, SW_POLL_MS));
  }

  return findRegistration();
}

async function readPushState(): Promise<
  Pick<
    PushState,
    "isPushCapable" | "hasServiceWorker" | "permission" | "isSubscribed"
  >
> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("PushManager" in window)
  ) {
    return {
      isPushCapable: false,
      hasServiceWorker: false,
      permission: "unsupported",
      isSubscribed: false,
    };
  }

  const permission = Notification.permission as PermissionState;
  const reg = await waitForRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;

  // The browser keeps its subscription across sign-out and endpoint rotation,
  // so its presence alone does not mean reminders will be delivered. The stored
  // row is the source of truth for whether the cron can reach this device.
  let isSubscribed = sub !== null;
  if (sub) {
    const registered = await isEndpointRegistered(sub.endpoint);
    if (registered !== null) isSubscribed = registered;
  }

  return {
    isPushCapable: true,
    hasServiceWorker: reg !== null,
    permission,
    isSubscribed,
  };
}

/** True when we can offer to turn reminders on — including in dev, where the SW is off. */
export async function isEligibleForReminderPrompt(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!VAPID_PUBLIC_KEY) return false;
  if (!("Notification" in window) || !("PushManager" in window)) return false;

  // Don't prompt if the user has already explicitly denied permission.
  if (Notification.permission === "denied") return false;

  const reg = await findRegistration();
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    // A local subscription the server doesn't know about delivers nothing, so
    // those users should still be offered the prompt.
    if (sub && (await isEndpointRegistered(sub.endpoint)) !== false) {
      return false;
    }
  }

  return true;
}

export type EnablePushResult =
  | { status: "subscribed" }
  | { status: "denied"; permission: PermissionState }
  | { status: "error"; message: string };

export async function enablePushNotifications(): Promise<EnablePushResult> {
  try {
    if (!VAPID_PUBLIC_KEY) {
      await reportPushEnableFailure("no_vapid_key");
      return { status: "error", message: "VAPID key not configured." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await reportPushEnableFailure("permission_denied");
      return {
        status: "denied",
        permission: permission as PermissionState,
      };
    }

    const reg = await waitForRegistration();
    if (!reg) {
      await reportPushEnableFailure("no_service_worker");
      return { status: "error", message: "Service worker not available." };
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!p256dh || !auth) {
      await reportPushEnableFailure("missing_keys");
      return { status: "error", message: "Push subscription missing keys." };
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh, auth }),
    });
    if (!res.ok) {
      await sub.unsubscribe();
      await reportPushEnableFailure("save_rejected", `HTTP ${res.status}`);
      return { status: "error", message: "Failed to save subscription." };
    }

    return { status: "subscribed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await reportPushEnableFailure("subscribe_threw", message);
    return { status: "error", message };
  }
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushState>({
    isReady: false,
    isPushCapable: false,
    hasServiceWorker: false,
    permission: "default",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    const next = await readPushState();
    setState({
      isReady: true,
      ...next,
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    const result = await enablePushNotifications();

    if (result.status === "subscribed") {
      setState({
        isReady: true,
        isPushCapable: true,
        hasServiceWorker: true,
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (result.status === "denied") {
      setState((s) => ({
        ...s,
        permission: result.permission,
        isLoading: false,
      }));
      return;
    }

    const next = await readPushState();
    setState({
      isReady: true,
      ...next,
      isLoading: false,
      error: result.message,
    });
  }, []);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const reg = await findRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;

      if (sub) {
        const res = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!res.ok) throw new Error("Failed to remove subscription.");
        await sub.unsubscribe();
      }

      setState((s) => ({ ...s, isSubscribed: false, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  return { ...state, enable, disable, refresh };
}
