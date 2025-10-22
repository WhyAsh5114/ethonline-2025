import * as OTPAuth from "otpauth";
import { keccak256, toBytes } from "viem";

export interface TOTPSecret {
  secret: string;
  uri: string;
  secretHash: bigint;
}

export function generateTOTPSecret(accountAddress: string): TOTPSecret {
  const secret = new OTPAuth.Secret({ size: 20 });
  const base32Secret = secret.base32;

  const totp = new OTPAuth.TOTP({
    issuer: "ChronoVault",
    label: accountAddress,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  const uri = totp.toString();

  const secretHash = BigInt(keccak256(toBytes(base32Secret)));

  return {
    secret: base32Secret,
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
