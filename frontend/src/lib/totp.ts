import * as OTPAuth from "otpauth";
import { keccak256, toBytes } from "viem";

export interface TOTPSecret {
  secret: string; // Numeric secret for ZK circuit compatibility
  uri: string;
  secretHash: bigint;
}

/**
 * Generate a TOTP secret compatible with the ZK circuit
 * The secret is a numeric string that can be used in the circuit
 */
export function generateTOTPSecret(accountAddress: string): TOTPSecret {
  // Generate a random numeric secret (20 digits)
  // This is compatible with the ZK circuit which expects numeric inputs
  const numericSecret = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");

  // For QR code display, we still use OTPAuth format
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "ChronoVault",
    label: accountAddress || "Account",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  const uri = totp.toString();

  // Calculate the secret hash using keccak256
  // Note: In production, you should use Poseidon hash for consistency with ZK circuit
  const secretHash = BigInt(keccak256(toBytes(numericSecret)));

  return {
    secret: numericSecret,
    uri,
    secretHash,
  };
}

export function generateTOTPCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return totp.generate();
}

export function verifyTOTPCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export function getTimeCounter(): number {
  return Math.floor(Date.now() / 1000 / 30);
}
