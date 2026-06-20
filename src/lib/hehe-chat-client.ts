import { env } from "@/lib/env";

export type ForwardArticlePayload = {
  hehestlUserId: string;
  sourceId: string;
  title: string;
  lang: string;
  path: string;
  slug: string;
  publicUrl: string;
  contentMd: string;
  updatedAt: string;
  isPublished: boolean;
  senderDisplayName: string;
};

export type ForwardArticleResult = {
  roomId: string;
  messengerUrl: string;
};

export class HeheChatForwardError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "HeheChatForwardError";
    this.status = status;
    this.code = code;
  }
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function forwardArticleToHekotiAgent(
  payload: ForwardArticlePayload,
  opts?: { retries?: number },
): Promise<ForwardArticleResult> {
  const apiBase = env.HEHE_CHAT_API_URL?.trim();
  const token = env.HEKOTI_FORWARD_TOKEN?.trim();
  if (!apiBase || !token) {
    throw new HeheChatForwardError("Hehe Chat integration is not configured.", 503);
  }

  const publicBase = env.HEHE_CHAT_PUBLIC_URL?.trim() || apiBase.replace(/\/api\/?$/, "");
  const maxAttempts = Math.max(1, (opts?.retries ?? 2) + 1);
  let lastError: HeheChatForwardError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(attempt === 1 ? 300 : 900);
    }

    let res: Response;
    try {
      res = await fetch(`${apiBase.replace(/\/$/, "")}/internal/hekoti/forward`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hehe-service": "hekoti",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch {
      lastError = new HeheChatForwardError("Hehe Chat is unreachable.", 502);
      continue;
    }

    const body = (await res.json().catch(() => ({}))) as {
      roomId?: string;
      error?: string;
      code?: string;
      message?: string;
    };

    if (!res.ok) {
      const err = new HeheChatForwardError(
        body.error || body.message || "Forward failed",
        res.status,
        body.code,
      );
      if (!isRetryableStatus(res.status) || attempt === maxAttempts - 1) {
        throw err;
      }
      lastError = err;
      continue;
    }

    const roomId = body.roomId;
    if (!roomId) {
      throw new HeheChatForwardError("Invalid response from Hehe Chat.", 502);
    }

    const messengerBase = publicBase.replace(/\/$/, "");
    return {
      roomId,
      messengerUrl: `${messengerBase}/messenger/${roomId}`,
    };
  }

  throw lastError ?? new HeheChatForwardError("Hehe Chat is unreachable.", 502);
}
