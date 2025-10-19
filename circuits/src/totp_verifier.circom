pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// TOTP Verifier Circuit
// Verifies that a TOTP code is correct without revealing the secret
template TOTPVerifier() {
    // Public inputs
    signal input totpCode;        // The TOTP code to verify (6 digits, 0-999999)
    signal input timeCounter;     // Unix timestamp / 30
    signal input secretHash;      // Poseidon hash of the secret
    
    // Private inputs
    signal input secret;          // The secret key (field element)
    
    // Intermediate signals
    signal secretHashComputed;
    signal totpCodeComputed;
    
    // Step 1: Verify the secret hash
    // Hash the secret and ensure it matches the public hash
    component hasher = Poseidon(1);
    hasher.inputs[0] <== secret;
    secretHashComputed <== hasher.out;
    
    // Constrain: computed hash must equal provided hash
    secretHash === secretHashComputed;
    
    // Step 2: Generate TOTP code
    // In a simplified model: TOTP = Poseidon(secret, timeCounter) % 1000000
    component totpHasher = Poseidon(2);
    totpHasher.inputs[0] <== secret;
    totpHasher.inputs[1] <== timeCounter;
    
    // Step 3: Extract 6-digit code from hash
    // We'll use modulo to get a 6-digit number
    signal totpHash;
    totpHash <== totpHasher.out;
    
    // Compute: totpCodeComputed = totpHash % 1000000
    // This is simplified - in practice we'd need proper modulo circuits
    signal quotient;
    signal remainder;
    
    // For now, use a simplified constraint
    // In production, implement proper HMAC-SHA256 or use lookup tables
    component mod = Modulo(1000000);
    mod.in <== totpHash;
    totpCodeComputed <== mod.out;
    
    // Step 4: Verify the TOTP code matches
    totpCode === totpCodeComputed;
}

// Helper template for modulo operation
template Modulo(divisor) {
    signal input in;
    signal output out;
    signal quotient;
    
    // Compute quotient and remainder
    quotient <-- in \ divisor;
    out <-- in % divisor;
    
    // Constrain: in = quotient * divisor + remainder
    in === quotient * divisor + out;
    
    // Constrain: 0 <= remainder < divisor
    component lt = LessThan(32);
    lt.in[0] <== out;
    lt.in[1] <== divisor;
    lt.out === 1;
}

component main {public [totpCode, timeCounter, secretHash]} = TOTPVerifier();
