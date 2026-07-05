/** SSOT: gateway-bots/shared/auth/oidc-pkce.ts — vendored for hekoti Docker build. */

const VERIFIER_LENGTH = 64;

function randomUrlSafe(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateNonce(): string {
  return randomUrlSafe(24);
}

export function generateCodeVerifier(): string {
  return randomUrlSafe(VERIFIER_LENGTH);
}

export async function codeChallengeS256(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildHeronAuthorizeUrl(params: {
  heronBaseUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  scope?: string;
  prompt?: "none" | "login";
}): string {
  const base = params.heronBaseUrl.replace(/\/+$/, "");
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: params.scope ?? "openid profile email",
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  });
  if (params.prompt) {
    q.set("prompt", params.prompt);
  }
  return `${base}/oauth2/authorize?${q.toString()}`;
}
