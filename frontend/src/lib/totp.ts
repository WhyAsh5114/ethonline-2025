import { buildPoseidon } from "circomlibjs";

/**
 * TOTP System Architecture:
 *
 * Single Poseidon-based TOTP system for ZK-friendly authentication.
 *
 * **Poseidon TOTP (ZK-friendly)**:
 * - Uses 20-digit numeric secrets
 * - Poseidon hash for ZK circuit compatibility
 * - TOTP calculation: Poseidon(secret, timeCounter) % 1000000
 * - Generates 6-digit codes that change every 30 seconds
 *
 * **Custom Authenticator**:
 * - Built-in authenticator page (/authenticator) for true 2FA
 * - Secrets stored encrypted in IndexedDB
 * - Works on separate device (phone/tablet) for genuine 2FA
 * - No dependency on external authenticator apps
 *
 * **Why Poseidon-only?**:
 * - ZK circuits need efficient field arithmetic
 * - Eliminates confusion between SHA-1 and Poseidon codes
 * - True 2FA: secret never leaves authenticator device
 * - ~150 constraints vs ~40,000 for SHA-1 in ZK circuits
 */

export interface TOTPSecret {
  secret: string; // 20-digit numeric secret for ZK circuit
  secretHash: bigint; // Poseidon hash of the secret (stored on-chain)
  qrData: string; // JSON string for QR code with metadata
}

/**
 * Generate a TOTP secret compatible with the ZK circuit
 * Creates a 20-digit numeric secret that can be used in Poseidon hash
 *
 * @param accountAddress - Ethereum address for metadata
 * @param accountName - Optional friendly name for the account
 * @returns TOTPSecret with numeric secret, hash, and QR data
 */
export async function generateTOTPSecret(
  accountAddress: string,
  accountName?: string,
): Promise<TOTPSecret> {
  // Generate a random 20-digit numeric secret
  // This is compatible with the ZK circuit which expects numeric inputs
  const numericSecret = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 10),
  ).join("");

  // Calculate the secret hash using Poseidon (matches ZK circuit)
  const poseidon = await buildPoseidon();
  const secretBigInt = BigInt(numericSecret);
  const secretHashField = poseidon([secretBigInt]);
  const secretHash = BigInt(poseidon.F.toString(secretHashField));

  // Create QR code data with metadata
  const qrData = JSON.stringify({
    type: "chronovault-totp",
    version: 1,
    secret: numericSecret,
    address: accountAddress,
    name: accountName || accountAddress.slice(0, 10),
    timestamp: Date.now(),
  });

  return {
    secret: numericSecret,
    secretHash,
    qrData,
  };
}

/**
 * Generate TOTP code using Poseidon hash (matches ZK circuit)
 * This is what the ZK circuit will verify
 *
 * @param secret - 20-digit numeric secret
 * @param timestamp - Unix timestamp (defaults to current time)
 * @returns 6-digit TOTP code as string
 */
export async function generatePoseidonTOTPCode(
  secret: string,
  timestamp?: number,
): Promise<string> {
  const poseidon = await buildPoseidon();
  const secretBigInt = BigInt(secret);
  const timeCounter = BigInt(Math.floor((timestamp ?? Date.now() / 1000) / 30));

  // Match the circuit's TOTP calculation: Poseidon(secret, timeCounter) % 1000000
  const totpHash = poseidon([secretBigInt, timeCounter]);
  const totpCode = BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);

  return totpCode.toString().padStart(6, "0");
}

/**
 * Verify TOTP code against secret
 * Checks current window and ±1 window (90 second total window)
 *
 * @param secret - 20-digit numeric secret
 * @param code - 6-digit TOTP code to verify
 * @param timestamp - Unix timestamp (defaults to current time)
 * @returns true if code is valid
 */
export async function verifyTOTPCode(
  secret: string,
  code: string,
  timestamp?: number,
): Promise<boolean> {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);

  // Check current window and ±1 window (allows 30 seconds clock skew each direction)
  for (let window = -1; window <= 1; window++) {
    const windowTimestamp = ts + window * 30;
    const expectedCode = await generatePoseidonTOTPCode(
      secret,
      windowTimestamp,
    );

    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Get current time counter (30-second intervals since Unix epoch)
 */
export function getTimeCounter(): number {
  return Math.floor(Date.now() / 1000 / 30);
}

/**
 * Get seconds remaining in current TOTP window
 */
export function getTimeRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}
