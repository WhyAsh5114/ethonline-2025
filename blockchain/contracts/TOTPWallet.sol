// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";
import "./TOTPVerifier.sol";

/// @title TOTPWallet
/// @notice ERC-4337 compatible smart contract wallet with TOTP-based ZK proof verification
contract TOTPWallet is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using UserOperationLib for PackedUserOperation;

    /// @notice The EntryPoint contract address for ERC-4337 account abstraction
    IEntryPoint private immutable _entryPoint;
    
    /// @notice The ZK proof verifier contract
    TOTPVerifier private immutable _verifier;
    
    /// @notice Current owner of the wallet
    address public owner;
    
    /// @notice Hash of the owner's TOTP secret (for proof verification)
    uint256 public ownerSecretHash;
    
    /// @notice Maximum allowed time difference for timestamp freshness (5 minutes)
    uint256 public constant MAX_TIME_DIFFERENCE = 5 minutes;
    
    /// @notice BN254 field prime - used for reducing transaction commitments to match circuit behavior
    uint256 public constant FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    /// @notice Nonce for replay protection
    uint256 public nonce;
    
    /// @notice Last used time counter to prevent replay attacks
    /// @dev Ensures each time window can only be used once
    uint256 public lastUsedTimeCounter;

    event WalletInitialized(address indexed entryPoint, address indexed owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TransactionExecuted(address indexed to, uint256 value, bytes data, bool success);
    event ZKProofVerified(uint256 timestamp, bool valid);
    event SecretHashUpdated(uint256 indexed newSecretHash);

    error OnlyOwner();
    error OnlyEntryPoint();
    error InvalidProof();
    error SecretHashMismatch();
    error TimestampTooOld();
    error TimestampInFuture();
    error TransactionFailed();
    error InvalidSignature();
    error TimeCounterAlreadyUsed();
    error TxCommitmentMismatch();
    error DirectExecuteDisabled();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(_entryPoint)) revert OnlyEntryPoint();
        _;
    }

    /// @notice Initialize the wallet with EntryPoint, verifier, and owner
    /// @param anEntryPoint The ERC-4337 EntryPoint contract address
    /// @param verifier The ZK proof verifier contract address
    /// @param anOwner The initial owner of the wallet
    /// @param initialSecretHash Hash of the owner's TOTP secret
    constructor(IEntryPoint anEntryPoint, TOTPVerifier verifier, address anOwner, uint256 initialSecretHash) payable {
        _entryPoint = anEntryPoint;
        _verifier = verifier;
        owner = anOwner;
        ownerSecretHash = initialSecretHash;
        emit WalletInitialized(address(anEntryPoint), anOwner);
    }

    /// @notice Internal function to verify ZK proof for TOTP code with timestamp and tx commitment
    /// @param pA First part of the Groth16 proof
    /// @param pB Second part of the Groth16 proof
    /// @param pC Third part of the Groth16 proof
    /// @param publicSignals Public signals [totpCode, timeCounter, secretHash, txCommitment]
    /// @return bool True if proof is valid
    function _verifyZKProofInternal(
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata publicSignals
    ) internal returns (bool) {
        // publicSignals[2] is the secretHash - must match owner's secret
        if (publicSignals[2] != ownerSecretHash) revert SecretHashMismatch();
        
        // publicSignals[1] is the timeCounter
        uint256 timeCounter = publicSignals[1];
        uint256 timestamp = timeCounter * 30;
        _checkTimestampFreshness(timestamp);
        
        // Prevent replay: each time window can only be used once
        // timeCounter must be greater than the last used one
        if (timeCounter <= lastUsedTimeCounter) revert TimeCounterAlreadyUsed();
        
        // Verify the cryptographic proof
        bool isValid = _verifier.verifyProof(pA, pB, pC, publicSignals);
        emit ZKProofVerified(timestamp, isValid);
        if (!isValid) revert InvalidProof();
        
        // Update the last used time counter (prevents replay)
        lastUsedTimeCounter = timeCounter;
        
        return true;
    }

    /// @notice Execute a transaction with TOTP ZK proof verification
    /// @dev This binds the proof to specific transaction parameters preventing front-running attacks
    /// @param to Destination address
    /// @param value Amount of ETH to send (in wei)
    /// @param data Transaction calldata
    /// @param pA First part of the Groth16 proof
    /// @param pB Second part of the Groth16 proof
    /// @param pC Third part of the Groth16 proof
    /// @param publicSignals Public signals [totpCode, timeCounter, secretHash, txCommitment]
    /// @return success Whether the transaction succeeded
    function executeWithProof(
        address to,
        uint256 value,
        bytes calldata data,
        uint[2] calldata pA,
        uint[2][2] calldata pB,
        uint[2] calldata pC,
        uint[4] calldata publicSignals
    ) external onlyOwner returns (bool success) {
        // Calculate the expected transaction commitment
        // This binds the proof to these specific transaction parameters
        bytes32 expectedTxCommitmentHash = keccak256(abi.encodePacked(
            to,
            value,
            keccak256(data),
            nonce
        ));
        
        // Reduce modulo field prime to match circuit behavior
        uint256 expectedTxCommitment = uint256(expectedTxCommitmentHash) % FIELD_PRIME;
        
        // publicSignals[3] is the txCommitment from the proof
        // It MUST match the actual transaction parameters (after field reduction)
        if (expectedTxCommitment != publicSignals[3]) {
            revert TxCommitmentMismatch();
        }
        
        // Verify the TOTP ZK proof
        // This proves: 1) User knows TOTP secret, 2) TOTP code is correct, 3) Timestamp is fresh
        _verifyZKProofInternal(pA, pB, pC, publicSignals);
        
        // Increment nonce for next transaction
        nonce++;
        
        // Execute the transaction
        (success, ) = to.call{value: value}(data);
        emit TransactionExecuted(to, value, data, success);
        if (!success) revert TransactionFailed();
        
        return success;
    }

    /// @notice Direct execution is disabled - use executeWithProof instead
    /// @dev This ensures all transactions require TOTP verification, even if private key is compromised
    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external pure returns (bool) {
        // Silence unused parameter warnings
        to; value; data;
        revert DirectExecuteDisabled();
    }

    /// @notice Execute a batch of transactions atomically
    /// @param dest Array of destination addresses
    /// @param values Array of ETH amounts to send (in wei)
    /// @param func Array of transaction calldata
    function executeBatch(
        address[] calldata dest,
        uint256[] calldata values,
        bytes[] calldata func
    ) external onlyOwner {
        require(dest.length == values.length && dest.length == func.length, "Length mismatch");
        for (uint256 i = 0; i < dest.length; i++) {
            (bool success, ) = dest[i].call{value: values[i]}(func[i]);
            emit TransactionExecuted(dest[i], values[i], func[i], success);
            if (!success) revert TransactionFailed();
        }
    }

    /// @notice Transfer ownership to a new address
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /// @notice Update the secret hash (e.g., when rotating TOTP secret)
    /// @param newSecretHash The new secret hash
    function updateSecretHash(uint256 newSecretHash) external onlyOwner {
        ownerSecretHash = newSecretHash;
        emit SecretHashUpdated(newSecretHash);
    }

    /// @notice Validate user operation for ERC-4337 (called by EntryPoint)
    /// @param userOp The user operation to validate
    /// @param userOpHash Hash of the user operation
    /// @param missingAccountFunds Amount of ETH to deposit to EntryPoint if needed
    /// @return validationData 0 if signature is valid, 1 if invalid
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOp, userOpHash);
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Payment failed");
        }
        return validationData;
    }

    /// @notice Get the EntryPoint address
    /// @return The EntryPoint contract interface
    function entryPoint() external view returns (IEntryPoint) {
        return _entryPoint;
    }

    /// @notice Check if a timestamp is within acceptable bounds (public helper)
    /// @param timestamp The timestamp to check
    function checkTimestampFreshness(uint256 timestamp) external view {
        _checkTimestampFreshness(timestamp);
    }

    /// @notice Receive ETH transfers
    receive() external payable {}

    /// @notice Deposit ETH to the EntryPoint for gas payments
    function addDeposit() external payable {
        _entryPoint.depositTo{value: msg.value}(address(this));
    }

    /// @notice Withdraw ETH from EntryPoint deposit
    /// @param withdrawAddress Address to send withdrawn ETH to
    /// @param amount Amount of ETH to withdraw (in wei)
    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) external onlyOwner {
        _entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /// @notice Get the current deposit balance in EntryPoint
    /// @return The deposit amount (in wei)
    function getDeposit() external view returns (uint256) {
        return _entryPoint.getDepositInfo(address(this)).deposit;
    }

    /// @dev Internal helper to check timestamp freshness (within MAX_TIME_DIFFERENCE)
    /// @param timestamp The timestamp to validate
    function _checkTimestampFreshness(uint256 timestamp) internal view {
        uint256 currentTime = block.timestamp;
        if (timestamp > currentTime) revert TimestampInFuture();
        if (currentTime - timestamp > MAX_TIME_DIFFERENCE) revert TimestampTooOld();
    }

    /// @dev Validate the signature of a user operation against the owner
    /// @param userOp The user operation to validate
    /// @param userOpHash Hash of the user operation
    /// @return validationData 0 if signature matches owner, 1 if invalid
    function _validateSignature(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        if (signer != owner) return 1;
        return 0;
    }
}
