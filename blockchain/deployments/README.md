# Deployment Records

This directory contains deployment records for different networks.

Files are automatically generated when you run `scripts/deploy.ts`.

## File Format

Each deployment creates a JSON file with the following information:

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "timestamp": "2025-10-23T12:34:56.789Z",
  "contracts": {
    "entryPoint": "0x1234...",
    "verifier": "0x5678..."
  }
}
```

## Note

Deployment files are gitignored to avoid cluttering the repository.
The important addresses are automatically saved to `frontend/src/lib/contract-addresses.ts`.
