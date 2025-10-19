// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";

/// @title TOTPWallet
/// @notice ERC-4337 compatible smart contract wallet with TOTP-based ZK proof verification
contract TOTPWallet is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using UserOperationLib for PackedUserOperation;

    /// @notice The EntryPoint contract address for ERC-4337 account abstraction
    IEntryPoint private immutable _entryPoint;
    
    /// @notice Current owner of the wallet
    address public owner;
    
    /// @notice Maximum allowed time difference for timestamp freshness (5 minutes)
    uint256 public constant MAX_TIME_DIFFERENCE = 5 minutes;
    
    /// @notice Nonce for replay protection
    uint256 public nonce;

    event WalletInitialized(address indexed entryPoint, address indexed owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TransactionExecuted(address indexed to, uint256 value, bytes data, bool success);
    event ZKProofVerified(uint256 timestamp, bool valid);

    error OnlyOwner();
    error OnlyEntryPoint();
    error InvalidProof();
    error TimestampTooOld();
    error TimestampInFuture();
    error TransactionFailed();
    error InvalidSignature();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(_entryPoint)) revert OnlyEntryPoint();
        _;
    }

    /// @notice Initialize the wallet with EntryPoint and owner
    /// @param anEntryPoint The ERC-4337 EntryPoint contract address
    /// @param anOwner The initial owner of the wallet
    constructor(IEntryPoint anEntryPoint, address anOwner) {
        _entryPoint = anEntryPoint;
        owner = anOwner;
        emit WalletInitialized(address(anEntryPoint), anOwner);
    }

    /// @notice Verify ZK proof for TOTP code with timestamp freshness check
    /// @param proof The ZK proof bytes
    /// @param timestamp The timestamp from the proof (must be within 5 minutes)
    /// @param publicSignals Public signals from the ZK proof
    /// @return bool True if proof is valid
    function verifyZKProof(
        bytes calldata proof,
        uint256 timestamp,
        bytes calldata publicSignals
    ) external returns (bool) {
        _checkTimestampFreshness(timestamp);
        bool isValid = _verifyProof(proof, timestamp, publicSignals);
        emit ZKProofVerified(timestamp, isValid);
        if (!isValid) revert InvalidProof();
        return true;
    }

    /// @notice Execute a single transaction from the wallet
    /// @param to Destination address
    /// @param value Amount of ETH to send (in wei)
    /// @param data Transaction calldata
    /// @return success Whether the transaction succeeded
    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bool success) {
        (success, ) = to.call{value: value}(data);
        emit TransactionExecuted(to, value, data, success);
        if (!success) revert TransactionFailed();
        return success;
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

    /// @notice Transfer ownership of the wallet to a new address
    /// @param newOwner The address of the new owner (cannot be zero address)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
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

    /// @dev Internal ZK proof verification (simplified for development)
    /// @dev In production, this would call a ZK verifier contract (e.g., Groth16)
    /// @param proof The ZK proof bytes (must not be empty)
    /// @param publicSignals Public signals from the ZK proof (must not be empty)
    /// @return bool True if proof structure is valid
    function _verifyProof(
        bytes calldata proof,
        uint256 /* timestamp */,
        bytes calldata publicSignals
    ) internal pure returns (bool) {
        if (proof.length == 0 || publicSignals.length == 0) return false;
        return true;
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
