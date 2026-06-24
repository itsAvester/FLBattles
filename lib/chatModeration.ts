import { GENERATED_BAD_WORDS } from "./generatedBadWords";

export const CHAT_MESSAGE_MAX_LENGTH = 300;
export const CHAT_SEND_COOLDOWN_MS = 4000;

const EXTRA_BLOCKED_CHAT_WORDS: string[] = [];

const BLOCKED_CHAT_WORDS = Array.from(
  new Set(
    [...GENERATED_BAD_WORDS, ...EXTRA_BLOCKED_CHAT_WORDS]
      .map((word) => String(word).trim().toLowerCase())
      .filter(Boolean)
  )
).sort((a, b) => b.length - a.length);

export const BLOCKED_CHAT_WORD_COUNT = BLOCKED_CHAT_WORDS.length;

export type ChatModerationResult =
  | {
      ok: true;
      message: string;
      sanitizedMessage: string;
      wasCensored: boolean;
    }
  | {
      ok: false;
      error: string;
      message?: string;
      sanitizedMessage?: string;
      wasCensored?: boolean;
    };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function starOut(value: string) {
  return "*".repeat(value.length);
}

export function normalizeChatMessage(message: string) {
  return String(message ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function getMessageFingerprint(message: string) {
  return normalizeChatMessage(message)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isRepeatedChatMessage(
  currentMessage: string,
  previousMessage: string | null | undefined
) {
  if (!previousMessage) return false;

  const currentFingerprint = getMessageFingerprint(currentMessage);
  const previousFingerprint = getMessageFingerprint(previousMessage);

  return !!currentFingerprint && currentFingerprint === previousFingerprint;
}

export function getChatCooldownRemainingMs(
  lastSentAtMs: number | null | undefined,
  nowMs = Date.now()
) {
  if (!lastSentAtMs) return 0;

  const remaining = CHAT_SEND_COOLDOWN_MS - (nowMs - lastSentAtMs);
  return Math.max(0, remaining);
}

export function getChatCooldownRemainingSeconds(
  lastSentAtMs: number | null | undefined,
  nowMs = Date.now()
) {
  return Math.ceil(getChatCooldownRemainingMs(lastSentAtMs, nowMs) / 1000);
}

function buildBlockedWordRegex(term: string) {
  const escaped = escapeRegExp(term.trim());

  return new RegExp(
    `(^|[^a-zA-Z0-9_])(${escaped})(?=$|[^a-zA-Z0-9_])`,
    "gi"
  );
}

export function censorChatMessage(message: string) {
  let censored = normalizeChatMessage(message);

  for (const term of BLOCKED_CHAT_WORDS) {
    const regex = buildBlockedWordRegex(term);

    censored = censored.replace(regex, (_fullMatch, prefix, blockedTerm) => {
      return `${prefix}${starOut(blockedTerm)}`;
    });
  }

  return censored;
}

export function containsBlockedChatWord(message: string) {
  const normalized = normalizeChatMessage(message);

  if (!normalized) return false;

  return BLOCKED_CHAT_WORDS.some((term) => buildBlockedWordRegex(term).test(normalized));
}

export function validateChatMessage(
  message: string,
  options?: {
    previousMessage?: string | null;
    lastSentAtMs?: number | null;
    nowMs?: number;
    enforceCooldown?: boolean;
    enforceRepeat?: boolean;

    // false = send message with stars
    // true = prevent sending if it contains a blocked word
    blockIfCensored?: boolean;
  }
): ChatModerationResult {
  const normalized = normalizeChatMessage(message);

  if (!normalized) {
    return {
      ok: false,
      error: "Message cannot be empty.",
    };
  }

  if (normalized.length > CHAT_MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Message must be ${CHAT_MESSAGE_MAX_LENGTH} characters or less.`,
    };
  }

  if (options?.enforceCooldown) {
    const remainingSeconds = getChatCooldownRemainingSeconds(
      options.lastSentAtMs,
      options.nowMs
    );

    if (remainingSeconds > 0) {
      return {
        ok: false,
        error: `Wait ${remainingSeconds}s before sending another message.`,
      };
    }
  }

  if (
    options?.enforceRepeat &&
    isRepeatedChatMessage(normalized, options.previousMessage)
  ) {
    return {
      ok: false,
      error: "Please do not send the same message twice in a row.",
    };
  }

  const sanitizedMessage = censorChatMessage(normalized);
  const wasCensored = sanitizedMessage !== normalized;

  if (options?.blockIfCensored && wasCensored) {
    return {
      ok: false,
      error: "That message contains blocked language.",
      message: sanitizedMessage,
      sanitizedMessage,
      wasCensored,
    };
  }

  return {
    ok: true,
    message: sanitizedMessage,
    sanitizedMessage,
    wasCensored,
  };
}

export function moderateChatMessage(
  message: string,
  options?: Parameters<typeof validateChatMessage>[1]
) {
  return validateChatMessage(message, options);
}