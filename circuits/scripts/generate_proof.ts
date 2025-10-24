#!/usr/bin/env node

/**
 * Generate a TOTP proof
 * Example usage: tsx scripts/generate_proof.ts <secret> <timestamp> <totpCode>
 */

import * as snarkjs from 'snarkjs';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPoseidon } from 'circomlibjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, '..', 'build');

interface ProofResult {
  proof: unknown;
  publicSignals: string[];
  calldata: string;
}

async function generateProof(
  secret: string,
  timestamp: number,
  totpCode: string
): Promise<ProofResult> {
  console.log('🔐 Generating TOTP proof...\n');

  try {
    const poseidon = await buildPoseidon();

    // Convert inputs to field elements
    const secretBigInt = BigInt(secret);
    const timeCounter = BigInt(Math.floor(timestamp / 30));
    const totpCodeBigInt = BigInt(totpCode);

    // Compute secret hash using Poseidon
    const secretHash = poseidon.F.toString(poseidon([secretBigInt]));

    // Compute expected TOTP code
    const totpHash = poseidon([secretBigInt, timeCounter]);
    const expectedCode = BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);

    console.log('📊 Input values:');
    console.log(`  Secret: ${secret}`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Time Counter: ${timeCounter}`);
    console.log(`  TOTP Code (provided): ${totpCode}`);
    console.log(`  TOTP Code (computed): ${expectedCode}`);
    console.log(`  Secret Hash: ${secretHash}\n`);

    // Verify the TOTP code matches before generating proof
    if (expectedCode.toString() !== totpCode.toString()) {
      console.error('❌ Error: Provided TOTP code does not match computed code');
      console.error(`  Expected: ${expectedCode}`);
      console.error(`  Got: ${totpCode}`);
      process.exit(1);
    }

    // Prepare circuit inputs
    // For testing, use a dummy txCommitment
    const dummyTxCommitment = "123456789";
    
    const input = {
      secret: secretBigInt.toString(),
      totpCode: totpCodeBigInt.toString(),
      timeCounter: timeCounter.toString(),
      secretHash: secretHash,
      txCommitment: dummyTxCommitment,
    };
    
    console.log(`  Transaction Commitment (test): ${dummyTxCommitment}`);

    console.log('🔨 Generating witness...');
    const wasmFile = path.join(BUILD_DIR, 'totp_verifier_js', 'totp_verifier.wasm');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmFile,
      path.join(BUILD_DIR, 'totp_verifier_final.zkey')
    );

    console.log('✅ Witness generated\n');

    console.log('🔐 Generating proof...');
    console.log('✅ Proof generated\n');

    // Save proof and public signals
    const proofFile = path.join(BUILD_DIR, 'proof.json');
    const publicFile = path.join(BUILD_DIR, 'public.json');

    writeFileSync(proofFile, JSON.stringify(proof, null, 2));
    writeFileSync(publicFile, JSON.stringify(publicSignals, null, 2));

    console.log('💾 Files saved:');
    console.log(`  Proof: ${proofFile}`);
    console.log(`  Public signals: ${publicFile}\n`);

    // Verify the proof locally
    console.log('🔍 Verifying proof locally...');
    const vKey = JSON.parse(
      readFileSync(path.join(BUILD_DIR, 'verification_key.json'), 'utf-8')
    );

    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    if (verified) {
      console.log('✅ Proof verified successfully!\n');
    } else {
      console.log('❌ Proof verification failed\n');
      process.exit(1);
    }

    // Generate Solidity calldata
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const calldataFile = path.join(BUILD_DIR, 'calldata.txt');
    writeFileSync(calldataFile, calldata);

    console.log('📋 Solidity calldata saved to:', calldataFile);
    console.log('\nYou can use this calldata to call the verifier contract.');

    return { proof, publicSignals, calldata };
  } catch (error) {
    console.error('❌ Failed to generate proof:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: tsx scripts/generate_proof.ts <secret> <timestamp> [totpCode]');
  console.log('\nIf totpCode is not provided, it will be calculated automatically.');
  console.log('\nExample:');
  console.log('  tsx scripts/generate_proof.ts 12345 1729353600');
  console.log('  tsx scripts/generate_proof.ts 12345 1729353600 586413');
  process.exit(1);
}

const [secret, timestampStr, providedCode] = args;
const timestamp = Number.parseInt(timestampStr);

// If TOTP code is not provided, calculate it
async function getTotpCode(): Promise<string> {
  if (providedCode) {
    return providedCode;
  }
  
  // Calculate TOTP code
  const poseidon = await buildPoseidon();
  const secretBigInt = BigInt(secret);
  const timeCounter = BigInt(Math.floor(timestamp / 30));
  const totpHash = poseidon([secretBigInt, timeCounter]);
  const totpCode = BigInt(poseidon.F.toString(totpHash)) % BigInt(1000000);
  
  console.log('ℹ️  TOTP code not provided, calculated automatically:', totpCode.toString());
  return totpCode.toString();
}

getTotpCode()
  .then(totpCode => generateProof(secret, timestamp, totpCode))
  .then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
