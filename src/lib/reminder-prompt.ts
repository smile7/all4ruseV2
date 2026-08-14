const SESSION_KEY = "a4r-reminder-prompt-session";

let inFlight = false;

function hasShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function markShownThisSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable
  }
}

/** Locks out overlapping save clicks while we check whether to prompt. */
export function beginReminderPromptCheck(): boolean {
  if (inFlight) return false;
  if (hasShownThisSession()) return false;
  inFlight = true;
  return true;
}

export function commitReminderPrompt() {
  markShownThisSession();
  inFlight = false;
}

export function abortReminderPromptCheck() {
  inFlight = false;
}
