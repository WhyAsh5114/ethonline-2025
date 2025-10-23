import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";

export interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

export interface ProofInputs {
  secret: string;
  totpCode: string;
  timestamp: number;
}

export interface SolidityProof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  publicSignals: [bigint, bigint, bigint];
}

/**
 * Calculate Poseidon hash of the secret
 */
export async function calculateSecretHash(secret: string): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const secretBigInt = BigInt(secret);
  const hash = poseidon.F.toString(poseidon([secretBigInt]));
  return BigInt(hash);
}

/**
 * Calculate TOTP code for given secret and timestamp
 */
export async function calculateTOTPCode(
  secret: string,
  timestamp: number,
): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const secretBigInt = BigInt(secret);
  const timeCounter = BigInt(Math.floor(timestamp / 30));

  const totpHash = poseidon([secretBigInt, timeCounter]);
  const totpCode = BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);

  return totpCode;
}

/**
 * Generate a ZK proof for TOTP verification
 * @param secret The TOTP secret (numeric string)
 * @param totpCode The current TOTP code
 * @param timestamp The current Unix timestamp
 * @param wasmPath Path to the WASM file (default: /circuits/totp_verifier.wasm)
 * @param zkeyPath Path to the zkey file (default: /circuits/totp_verifier_final.zkey)
 */
export async function generateZKProof(
  secret: string,
  totpCode: string,
  timestamp: number,
  wasmPath = "/circuits/totp_verifier.wasm",
  zkeyPath = "/circuits/totp_verifier_final.zkey",
): Promise<ZKProof> {
  try {
    const poseidon = await buildPoseidon();

    const secretBigInt = BigInt(secret);
    const timeCounter = BigInt(Math.floor(timestamp / 30));
    const totpCodeBigInt = BigInt(totpCode);

    // Calculate secret hash
    const secretHash = poseidon.F.toString(poseidon([secretBigInt]));

    // Verify TOTP code is correct before generating proof
    const totpHash = poseidon([secretBigInt, timeCounter]);
    const expectedCode =
      BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);

    if (expectedCode.toString() !== totpCode.toString()) {
      throw new Error(
        `TOTP code mismatch. Expected: ${expectedCode}, Got: ${totpCode}`,
      );
    }

    // Prepare circuit inputs
    const input = {
      secret: secretBigInt.toString(),
      totpCode: totpCodeBigInt.toString(),
      timeCounter: timeCounter.toString(),
      secretHash: secretHash,
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath,
    );

    return { proof, publicSignals };
  } catch (error) {
    console.error("Failed to generate ZK proof:", error);
    throw error;
  }
}

/**
 * Verify a ZK proof locally (for testing)
 * @param proof The generated proof
 * @param publicSignals The public signals
 * @param vkeyPath Path to verification key (default: /circuits/verification_key.json)
 */
export async function verifyZKProof(
  proof: ZKProof["proof"],
  publicSignals: string[],
  vkeyPath = "/circuits/verification_key.json",
): Promise<boolean> {
  try {
    const response = await fetch(vkeyPath);
    const vKey = await response.json();

    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    return verified;
  } catch (error) {
    console.error("Failed to verify ZK proof:", error);
    throw error;
  }
}

/**
 * Convert snarkjs proof to Solidity-compatible format
 */
export function formatProofForSolidity(proof: ZKProof): SolidityProof {
  // Convert proof components to bigints
  const pA: [bigint, bigint] = [
    BigInt(proof.proof.pi_a[0]),
    BigInt(proof.proof.pi_a[1]),
  ];

  const pB: [[bigint, bigint], [bigint, bigint]] = [
    [BigInt(proof.proof.pi_b[0][1]), BigInt(proof.proof.pi_b[0][0])],
    [BigInt(proof.proof.pi_b[1][1]), BigInt(proof.proof.pi_b[1][0])],
  ];

  const pC: [bigint, bigint] = [
    BigInt(proof.proof.pi_c[0]),
    BigInt(proof.proof.pi_c[1]),
  ];

  const publicSignals: [bigint, bigint, bigint] = [
    BigInt(proof.publicSignals[0]),
    BigInt(proof.publicSignals[1]),
    BigInt(proof.publicSignals[2]),
  ];

  return { pA, pB, pC, publicSignals };
}

/**
 * Get current time counter (30-second intervals)
 */
export function getTimeCounter(timestamp?: number): bigint {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  return BigInt(Math.floor(ts / 30));
}
