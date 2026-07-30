const ITERATIONS = 100_000;
const KEY_LENGTH = 512;

function encode(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(saltBytes.buffer as ArrayBuffer);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encode(saltHex) as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH,
  );
  return `salt:${saltHex}:iterations:${ITERATIONS}:hash:${toHex(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "salt" || parts[2] !== "iterations" || parts[4] !== "hash") {
    return false;
  }
  const saltHex = parts[1];
  const iterations = parseInt(parts[3], 10);
  const originalHash = parts[5];
  if (!saltHex || isNaN(iterations) || !originalHash || iterations < 1 || iterations > 1_000_000) {
    return false;
  }
  try {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encode(password) as BufferSource,
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encode(saltHex) as BufferSource, iterations, hash: "SHA-256" },
      keyMaterial,
      KEY_LENGTH,
    );
    return timingSafeEqual(toHex(derived), originalHash);
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let result = 0;
    for (let i = 0; i < b.length; i++) result |= 0xff;
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
