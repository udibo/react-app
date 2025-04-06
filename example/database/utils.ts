import { encodeHex } from "@std/encoding/hex";

/** Generates random salt. The length is the number of bytes. */
export function generateSalt(length = 16): string {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return encodeHex(salt);
}

/** Hashes a password with salt using the PBKDF2 algorithm with 100k SHA-256 iterations. */
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const buffer = new Uint8Array(derivedBits, 0, 32);
  return encodeHex(buffer);
}
