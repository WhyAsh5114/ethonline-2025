// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";

contract TOTPWallet is IAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using UserOperationLib for PackedUserOperation;

    IEntryPoint private immutable _entryPoint;
    address public owner;
    uint256 public constant MAX_TIME_DIFFERENCE = 5 minutes;
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

    constructor(IEntryPoint anEntryPoint, address anOwner) {
        _entryPoint = anEntryPoint;
        owner = anOwner;
        emit WalletInitialized(address(anEntryPoint), anOwner);
    }

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

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

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

    function entryPoint() external view returns (IEntryPoint) {
        return _entryPoint;
    }

    function checkTimestampFreshness(uint256 timestamp) external view {
        _checkTimestampFreshness(timestamp);
    }

    receive() external payable {}

    function addDeposit() external payable {
        _entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) external onlyOwner {
        _entryPoint.withdrawTo(withdrawAddress, amount);
    }

    function getDeposit() external view returns (uint256) {
        return _entryPoint.getDepositInfo(address(this)).deposit;
    }

    function _checkTimestampFreshness(uint256 timestamp) internal view {
        uint256 currentTime = block.timestamp;
        if (timestamp > currentTime) revert TimestampInFuture();
        if (currentTime - timestamp > MAX_TIME_DIFFERENCE) revert TimestampTooOld();
    }

    function _verifyProof(
        bytes calldata proof,
        uint256 /* timestamp */,
        bytes calldata publicSignals
    ) internal pure returns (bool) {
        if (proof.length == 0 || publicSignals.length == 0) return false;
        return true;
    }

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
