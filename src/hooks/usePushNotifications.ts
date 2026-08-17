"use client";

import { useCallback, useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
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

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
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

  return {
    isPushCapable: true,
    hasServiceWorker: reg !== null,
    permission,
    isSubscribed: sub !== null,
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
    if (sub) return false;
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
      return { status: "error", message: "VAPID key not configured." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        status: "denied",
        permission: permission as PermissionState,
      };
    }

    const reg = await waitForRegistration();
    if (!reg) {
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
      return { status: "error", message: "Push subscription missing keys." };
    }

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh, auth }),
    });
    if (!res.ok) {
      await sub.unsubscribe();
      return { status: "error", message: "Failed to save subscription." };
    }

    return { status: "subscribed" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
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
