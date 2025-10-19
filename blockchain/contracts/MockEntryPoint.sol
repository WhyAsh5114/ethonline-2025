// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/core/UserOperationLib.sol";

contract MockEntryPoint {
    using UserOperationLib for PackedUserOperation;

    mapping(address => uint256) public deposits;

    struct DepositInfo {
        uint256 deposit;
        bool staked;
        uint256 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    function depositTo(address account) external payable {
        deposits[account] += msg.value;
    }

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external {
        deposits[msg.sender] -= withdrawAmount;
        (bool success, ) = withdrawAddress.call{value: withdrawAmount}("");
        require(success, "Withdrawal failed");
    }

    function getDepositInfo(address account) external view returns (DepositInfo memory info) {
        return DepositInfo({
            deposit: deposits[account],
            staked: false,
            stake: 0,
            unstakeDelaySec: 0,
            withdrawTime: 0
        });
    }

    function validateUserOp(
        address wallet,
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        return IAccount(wallet).validateUserOp(userOp, userOpHash, missingAccountFunds);
    }

    receive() external payable {}
}
