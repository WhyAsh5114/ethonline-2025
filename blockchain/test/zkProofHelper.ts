/**
 * ZK Proof generation utilities for tests
 */

import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256 } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CIRCUITS_BUILD_DIR = path.join(__dirname, '..', '..', 'circuits', 'build');

interface Groth16Proof {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  publicSignals: [bigint, bigint, bigint, bigint];
}

interface TxParams {
  to: string;
  value: bigint;
  data: string;
  nonce: bigint;
}

/**
 * Calculate transaction commitment hash
 * Matches Solidity: keccak256(abi.encodePacked(to, value, keccak256(data), nonce))
 * Note: The result is reduced modulo the BN254 field prime to fit in the circuit
 */
export function calculateTxCommitment(txParams: TxParams): bigint {
  // BN254 field prime (Baby Jubjub curve order)
  const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  
  // First hash the data
  const dataHash = keccak256(txParams.data as `0x${string}`);

  // Solidity abi.encodePacked packs: address (20 bytes) + uint256 (32 bytes) + bytes32 (32 bytes) + uint256 (32 bytes)
  // Addresses are case-insensitive in EVM, keep as-is from input
  const addressHex = txParams.to.slice(2).toLowerCase(); // Remove 0x and normalize to lowercase
  const valueHex = txParams.value.toString(16).padStart(64, '0');
  const dataHashHex = dataHash.slice(2); // Remove 0x
  const nonceHex = txParams.nonce.toString(16).padStart(64, '0');
  
  const packed = `0x${addressHex}${valueHex}${dataHashHex}${nonceHex}`;

  // Hash the packed parameters
  const commitmentHash = keccak256(packed as `0x${string}`);
  const commitmentValue = BigInt(commitmentHash);
  
  // Reduce modulo the field prime to match what the circuit will output
  return commitmentValue % FIELD_PRIME;
}

/**
 * Generate a TOTP ZK proof for testing
 * @param secret The secret key (as a number)
 * @param timestamp The current timestamp
 * @param txParams Optional transaction parameters for commitment binding
 * @returns Promise<Groth16Proof> The proof components and public signals
 */
export async function generateTOTPProof(
  secret: bigint,
  timestamp: bigint,
  txParams?: TxParams
): Promise<Groth16Proof> {
  const poseidon = await buildPoseidon();

  // Calculate time counter (timestamp / 30)
  const timeCounter = timestamp / 30n;

  // Compute secret hash using Poseidon
  const secretHash = BigInt(poseidon.F.toString(poseidon([secret])));

  // Compute TOTP code
  const totpHash = poseidon([secret, timeCounter]);
  const totpCode = BigInt(poseidon.F.toString(totpHash)) % 1000000n;

  // Calculate transaction commitment if params provided, otherwise use 0
  const txCommitment = txParams ? calculateTxCommitment(txParams) : 0n;

  // Prepare circuit inputs
  const input = {
    secret: secret.toString(),
    totpCode: totpCode.toString(),
    timeCounter: timeCounter.toString(),
    secretHash: secretHash.toString(),
    txCommitment: txCommitment.toString(),
  };

  // Generate proof
  const wasmFile = path.join(CIRCUITS_BUILD_DIR, 'totp_verifier_js', 'totp_verifier.wasm');
  const zkeyFile = path.join(CIRCUITS_BUILD_DIR, 'totp_verifier_final.zkey');

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    wasmFile,
    zkeyFile
  );

  // Convert proof to format expected by Solidity verifier
  return {
    pA: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
    pB: [
      [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
      [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
    ],
    pC: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
    publicSignals: [
      BigInt(publicSignals[0]), // totpCode
      BigInt(publicSignals[1]), // timeCounter
      BigInt(publicSignals[2]), // secretHash
      BigInt(publicSignals[3]), // txCommitment
    ],
  };
}

/**
 * Get the expected TOTP code for a given secret and timestamp
 * @param secret The secret key
 * @param timestamp The timestamp
 * @returns Promise<bigint> The TOTP code
 */
export async function calculateTOTPCode(
  secret: bigint,
  timestamp: bigint
): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const timeCounter = timestamp / 30n;
  const totpHash = poseidon([secret, timeCounter]);
  return BigInt(poseidon.F.toString(totpHash)) % 1000000n;
}

/**
 * Get the secret hash for a given secret
 * @param secret The secret key
 * @returns Promise<bigint> The secret hash
 */
export async function calculateSecretHash(secret: bigint): Promise<bigint> {
  const poseidon = await buildPoseidon();
  return BigInt(poseidon.F.toString(poseidon([secret])));
}
