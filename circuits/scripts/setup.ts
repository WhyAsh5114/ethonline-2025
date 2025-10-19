#!/usr/bin/env tsx

/**
 * Setup script for TOTP ZK circuit
 * Generates proving and verification keys using Powers of Tau ceremony
 */

import { exec } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CIRCUITS_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(CIRCUITS_DIR, 'build');
const PTAU_FILE = path.join(BUILD_DIR, 'powersOfTau28_hez_final_14.ptau');

async function setup(): Promise<void> {
  console.log('🔧 Setting up TOTP ZK circuit...\n');

  if (!existsSync(BUILD_DIR)) {
    mkdirSync(BUILD_DIR, { recursive: true });
  }

  try {
    // Step 1: Download Powers of Tau file if not present
    if (!existsSync(PTAU_FILE)) {
      console.log('📥 Downloading Powers of Tau file (this may take a while)...');
      await execAsync(
        `wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau -O ${PTAU_FILE}`,
        { cwd: BUILD_DIR }
      );
      console.log('✅ Powers of Tau file downloaded\n');
    } else {
      console.log('✅ Powers of Tau file already exists\n');
    }

    // Step 2: Compile the circuit (should already be done)
    console.log('🔨 Compiling circuit...');
    const r1csFile = path.join(BUILD_DIR, 'totp_verifier.r1cs');
    const wasmFile = path.join(BUILD_DIR, 'totp_verifier_js', 'totp_verifier.wasm');
    
    if (!existsSync(r1csFile) || !existsSync(wasmFile)) {
      console.log('Circuit not compiled. Please run: pnpm compile');
      process.exit(1);
    }
    console.log('✅ Circuit already compiled\n');

    // Step 3: Generate zkey (proving key)
    console.log('🔑 Generating proving key...');
    const zkeyFile = path.join(BUILD_DIR, 'totp_verifier_0000.zkey');
    await execAsync(
      `snarkjs groth16 setup ${r1csFile} ${PTAU_FILE} ${zkeyFile}`,
      { cwd: BUILD_DIR }
    );
    console.log('✅ Initial zkey generated\n');

    // Step 4: Contribute to phase 2 ceremony
    console.log('🎲 Contributing to phase 2 ceremony...');
    const finalZkeyFile = path.join(BUILD_DIR, 'totp_verifier_final.zkey');
    await execAsync(
      `snarkjs zkey contribute ${zkeyFile} ${finalZkeyFile} --name="First contribution" -v -e="random entropy"`,
      { cwd: BUILD_DIR }
    );
    console.log('✅ Final zkey generated\n');

    // Step 5: Export verification key
    console.log('📤 Exporting verification key...');
    const vkeyFile = path.join(BUILD_DIR, 'verification_key.json');
    await execAsync(
      `snarkjs zkey export verificationkey ${finalZkeyFile} ${vkeyFile}`,
      { cwd: BUILD_DIR }
    );
    console.log('✅ Verification key exported\n');

    // Step 6: Generate Solidity verifier
    console.log('📝 Generating Solidity verifier...');
    const verifierFile = path.join(CIRCUITS_DIR, '..', 'blockchain', 'contracts', 'TOTPVerifier.sol');
    await execAsync(
      `snarkjs zkey export solidityverifier ${finalZkeyFile} ${verifierFile}`,
      { cwd: BUILD_DIR }
    );
    
    // Step 7: Rename contract from Groth16Verifier to TOTPVerifier
    console.log('🔧 Renaming contract to TOTPVerifier...');
    let verifierContent = readFileSync(verifierFile, 'utf-8');
    verifierContent = verifierContent.replace(/contract Groth16Verifier/g, 'contract TOTPVerifier');
    writeFileSync(verifierFile, verifierContent);
    console.log('✅ Solidity verifier generated\n');

    console.log('🎉 Setup complete!');
    console.log('\nGenerated files:');
    console.log(`  - Proving key: ${finalZkeyFile}`);
    console.log(`  - Verification key: ${vkeyFile}`);
    console.log(`  - Solidity verifier: ${verifierFile}`);

  } catch (error) {
    const err = error as Error & { stderr?: string };
    console.error('❌ Setup failed:', err.message);
    if (err.stderr) {
      console.error('Error details:', err.stderr);
    }
    process.exit(1);
  }
}

setup();
