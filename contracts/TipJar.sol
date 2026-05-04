// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TipJar {
    address public immutable owner;
    uint256 public totalTipsReceived;

    event TipReceived(address indexed from, uint256 amount, string message);
    event Withdrawal(address indexed to, uint256 amount);

    error ZeroTip();
    error NotOwner();
    error TransferFailed();

    constructor(address ownerAddress) {
        owner = ownerAddress;
    }

    function tip(string calldata message) external payable {
        if (msg.value == 0) revert ZeroTip();

        totalTipsReceived += msg.value;
        emit TipReceived(msg.sender, msg.value, message);
    }

    function withdraw(address payable to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0)) revert TransferFailed();
        if (amount > address(this).balance) revert TransferFailed();

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawal(to, amount);
    }

    receive() external payable {
        totalTipsReceived += msg.value;
        emit TipReceived(msg.sender, msg.value, "");
    }
}
