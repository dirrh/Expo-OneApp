import { useEffect, useMemo, useState } from "react";

type UseDynamicQRCodeOptions = {
  userId: string | null | undefined;
  windowSeconds?: number;
  issuer?: string;
  audience?: string;
  signingSalt?: string;
};

type UseDynamicQRCodeResult = {
  token: string;
  secondsRemaining: number;
  issuedAt: number;
  expiresAt: number;
};

type TokenState = UseDynamicQRCodeResult & {
  userId: string;
};

const DEFAULT_WINDOW_SECONDS = 10;
const DEFAULT_ISSUER = "expo-oneapp";
const DEFAULT_AUDIENCE = "business-suite";
const DEFAULT_SIGNING_SALT = "demo-signature";
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const base64EncodeAscii = (input: string): string => {
  let output = "";
  let index = 0;
  const length = input.length;

  while (index < length) {
    const c1 = input.charCodeAt(index++);
    const hasC2 = index < length;
    const c2 = hasC2 ? input.charCodeAt(index++) : 0;
    const hasC3 = index < length;
    const c3 = hasC3 ? input.charCodeAt(index++) : 0;

    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (c2 >> 4);
    const e3 = ((c2 & 15) << 2) | (c3 >> 6);
    const e4 = c3 & 63;

    output += BASE64_CHARS.charAt(e1);
    output += BASE64_CHARS.charAt(e2);
    output += hasC2 ? BASE64_CHARS.charAt(e3) : "=";
    output += hasC3 ? BASE64_CHARS.charAt(e4) : "=";
  }

  return output;
};

const toBase64 = (value: string): string => {
  if (typeof globalThis.btoa === "function") {
    try {
      return globalThis.btoa(value);
    } catch {
      // Fall through to other encoders.
    }
  }

  const maybeBuffer = (globalThis as { Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;
  if (maybeBuffer?.from) {
    return maybeBuffer.from(value, "utf8").toString("base64");
  }

  return base64EncodeAscii(value);
};

const base64UrlEncode = (value: string): string =>
  toBase64(value).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const pseudoSign = (value: string, salt: string): string => {
  let hash = 0;
  const data = `${value}.${salt}`;
  for (let i = 0; i < data.length; i += 1) {
    hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
};

const buildDemoJwt = (
  payload: Record<string, unknown>,
  options: { issuer: string; audience: string; signingSalt: string }
): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = { ...payload, iss: options.issuer, aud: options.audience };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode(pseudoSign(`${headerPart}.${payloadPart}`, options.signingSalt));
  return `${headerPart}.${payloadPart}.${signature}`;
};

const getWindowStart = (nowSeconds: number, windowSeconds: number) =>
  Math.floor(nowSeconds / windowSeconds) * windowSeconds;

const buildTokenState = (options: {
  userId: string;
  windowSeconds: number;
  issuer: string;
  audience: string;
  signingSalt: string;
  nowSeconds?: number;
}): TokenState => {
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const windowStart = getWindowStart(nowSeconds, options.windowSeconds);
  const expiresAt = windowStart + options.windowSeconds;
  const payload = {
    userId: options.userId,
    issuedAt: windowStart,
    exp: expiresAt,
  };

  return {
    userId: options.userId,
    token: buildDemoJwt(payload, options),
    issuedAt: windowStart,
    expiresAt,
    secondsRemaining: Math.max(0, expiresAt - nowSeconds),
  };
};

export const useDynamicQRCode = ({
  userId,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  issuer = DEFAULT_ISSUER,
  audience = DEFAULT_AUDIENCE,
  signingSalt = DEFAULT_SIGNING_SALT,
}: UseDynamicQRCodeOptions): UseDynamicQRCodeResult => {
  const resolvedUserId = userId ?? "anonymous";
  const resolvedWindowSeconds = Math.max(1, Math.floor(windowSeconds));

  const baseOptions = useMemo(
    () => ({
      userId: resolvedUserId,
      windowSeconds: resolvedWindowSeconds,
      issuer,
      audience,
      signingSalt,
    }),
    [resolvedUserId, resolvedWindowSeconds, issuer, audience, signingSalt]
  );

  const [state, setState] = useState<TokenState>(() => buildTokenState(baseOptions));

  useEffect(() => {
    setState(buildTokenState(baseOptions));
  }, [baseOptions]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const windowStart = getWindowStart(nowSeconds, resolvedWindowSeconds);
      const expiresAt = windowStart + resolvedWindowSeconds;
      const secondsRemaining = Math.max(0, expiresAt - nowSeconds);

      setState((prev) => {
        if (
          prev.userId === resolvedUserId &&
          prev.issuedAt === windowStart &&
          prev.expiresAt === expiresAt
        ) {
          if (prev.secondsRemaining === secondsRemaining) {
            return prev;
          }
          return { ...prev, secondsRemaining };
        }
        return buildTokenState({ ...baseOptions, nowSeconds });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [baseOptions, resolvedUserId, resolvedWindowSeconds]);

  return {
    token: state.token,
    secondsRemaining: state.secondsRemaining,
    issuedAt: state.issuedAt,
    expiresAt: state.expiresAt,
  };
};
