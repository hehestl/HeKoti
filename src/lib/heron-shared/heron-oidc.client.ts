/** SSOT: gateway-bots/shared/auth/heron-oidc.client.ts — vendored for hekoti Docker build. */

export type HeronOidcTokenResponse = {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
};

export type HeronOidcRuntime = {
  apiUrl: string;
  issuer: string;
  audiences: string[];
  fetchTimeoutMs: number;
  verifyIdToken?: (
    idToken: string,
    nonce: string,
    clientId: string,
  ) => Promise<boolean>;
};

export async function exchangeHeronAuthorizationCode(
  cfg: HeronOidcRuntime,
  input: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
    clientId: string;
    clientSecret?: string;
    nonce?: string;
  },
): Promise<
  | { ok: true; data: HeronOidcTokenResponse }
  | { ok: false; status: number; message: string }
> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code.trim(),
    redirect_uri: input.redirectUri.trim(),
    client_id: input.clientId.trim(),
    code_verifier: input.codeVerifier.trim(),
  });
  if (input.clientSecret?.trim()) {
    body.set("client_secret", input.clientSecret.trim());
  }

  const tokenUrl = `${cfg.apiUrl.replace(/\/$/, "")}/oauth2/token`;
  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(cfg.fetchTimeoutMs),
    });
    const json = (await res.json()) as {
      access_token?: string;
      id_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
    };
    if (!res.ok || !json.access_token || !json.id_token) {
      return {
        ok: false,
        status: res.status || 502,
        message: json.error ?? "Heron token exchange failed",
      };
    }

    if (input.nonce?.trim() && cfg.verifyIdToken) {
      const ok = await cfg.verifyIdToken(json.id_token, input.nonce.trim(), input.clientId);
      if (!ok) {
        return { ok: false, status: 401, message: "Invalid id_token" };
      }
    }

    return {
      ok: true,
      data: {
        accessToken: json.access_token,
        idToken: json.id_token,
        refreshToken: json.refresh_token,
        expiresIn: json.expires_in ?? 900,
        scope: json.scope ?? "openid",
      },
    };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      message: err instanceof Error ? err.message : "Heron token exchange error",
    };
  }
}
