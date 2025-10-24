# QR-Based Two-Device Authentication Flow

## Architecture

This implementation properly separates the TOTP secret between two devices for true 2FA:

1. **Transaction Device** (Web Browser): Has NO secret, prepares and submits transactions
2. **Authenticator Device** (Separate Device): Has the secret, generates ZK proofs

## Security Model

- TOTP secret is ONLY stored on the authenticator device
- Transaction device cannot generate TOTP codes locally
- Proof is bound to specific transaction via commitment
- Transaction commitment: `keccak256(to, value, data, nonce) % FIELD_PRIME`

## Flow Diagram

```
Transaction Device                    Authenticator Device
-----------------                     --------------------
1. User enters tx params
   - to, value, data
   
2. Get current nonce              
   
3. Calculate commitment
   = keccak256(to, value, data, nonce) % FIELD_PRIME
   
4. Display QR with:
   - to, value, data, nonce
   - commitment
   - walletAddress
                              ------>  5. Scan transaction QR
                              
                                       6. Show tx details to user
                                       
                                       7. User enters current TOTP code
                                          (from their authenticator app)
                                       
                                       8. Generate ZK proof
                                          - Input: secret, TOTP, commitment
                                          - Output: proof + public signals
                                       
                              <------  9. Display proof as QR
                              
10. Scan proof QR

11. Submit executeWithProof(
    to, value, data,
    pA, pB, pC, publicSignals
    )

12. Contract verifies proof
```

## Components

### Transaction Device

**`transaction-execution.tsx`**
- Shows transaction form (to, value, data)
- "Prepare Transaction QR" button
- Gets nonce from contract
- Calculates commitment
- Shows QR with `TransactionQRDisplay`
- "Open QR Scanner" to scan proof
- Submits `executeWithProof()` to contract

**`transaction-qr-display.tsx`**
- Displays transaction request as QR code
- Encodes: `{to, value, data, nonce, commitment, walletAddress}`

**`qr-proof-scanner.tsx`**
- Opens camera to scan proof QR
- Parses proof JSON and converts strings to bigint
- Returns `SolidityProof` object

### Authenticator Device

**`authenticator-proof-generator.tsx`**
- Scans transaction request QR
- Shows transaction details
- User enters current TOTP code
- Generates ZK proof using `generateZKProof()`
- Displays proof as QR code
- Encodes: `{pA, pB, pC, publicSignals}` (as strings for JSON)

### Hook Updates

**`use-totp-wallet.ts`**
- Added `executeWithProof()` function
- Takes pre-generated proof instead of generating it
- Submits directly to `executeWithProof()` on contract

## Data Structures

### TransactionRequest (in QR)
```typescript
{
  to: Address;
  value: bigint; // as string in JSON
  data: `0x${string}`;
  nonce: bigint; // as string in JSON
  commitment: bigint; // as string in JSON
  walletAddress: Address;
}
```

### SolidityProof (in QR)
```typescript
{
  pA: [bigint, bigint]; // as strings in JSON
  pB: [[bigint, bigint], [bigint, bigint]]; // as strings
  pC: [bigint, bigint]; // as strings
  publicSignals: [bigint, bigint, bigint, bigint]; // as strings
}
```

## Implementation Status

### ✅ Completed
- Transaction execution component with QR flow
- Transaction QR display component
- QR proof scanner component
- `executeWithProof()` in hook
- Proper TypeScript types for all components
- BigInt ↔ String conversion for JSON serialization

### 🚧 To Complete
- Integrate QR scanner library properly (html5-qrcode)
- Add authenticator proof generator to authenticator page
- Add transaction request QR scanner to authenticator page
- Test full end-to-end flow
- Handle edge cases (timeout, wrong code, etc.)

## Usage Example

### On Transaction Device
```typescript
// In dashboard/execute page
<TransactionExecution walletAddress={deployedWalletAddress} />
```

### On Authenticator Device
```typescript
// In authenticator page - add this component
{selectedAccount && (
  <AuthenticatorProofGenerator
    secret={selectedAccount.secret}
    accountName={selectedAccount.name}
  />
)}
```

## Security Guarantees

1. **No Secret Leakage**: Transaction device never has access to TOTP secret
2. **Transaction Binding**: Proof is cryptographically bound to specific transaction
3. **Replay Protection**: Nonce prevents transaction replay
4. **Time-based**: TOTP code expires every 30 seconds
5. **ZK Privacy**: Proof reveals nothing about secret or TOTP code

## Next Steps

1. Update authenticator page to include proof generator
2. Test QR scanning flow both directions
3. Add better error handling and user feedback
4. Add transaction preview/confirmation on authenticator
5. Consider adding transaction history/audit log
