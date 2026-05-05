// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITipJar {
    function tip(string calldata message) external payable;
}

interface IBaseSupporterSBT {
    function hasBadge(address account) external view returns (bool);
    function mintBadge(address to) external returns (uint256);
}

/// @notice Routes tips to TipJar and mints a soulbound badge once per sender.
contract TipWithBadgeRouter {
    ITipJar public immutable tipJar;
    IBaseSupporterSBT public immutable sbt;

    event TipReceived(address indexed from, uint256 amount, string message);
    event BadgeIssued(address indexed to);

    constructor(address tipJarAddress, address sbtAddress) {
        require(tipJarAddress != address(0), "TipJar zero address");
        require(sbtAddress != address(0), "SBT zero address");
        tipJar = ITipJar(tipJarAddress);
        sbt = IBaseSupporterSBT(sbtAddress);
    }

    function tip(string calldata message) external payable {
        require(msg.value > 0, "Zero tip");

        tipJar.tip{value: msg.value}(message);
        emit TipReceived(msg.sender, msg.value, message);

        if (!sbt.hasBadge(msg.sender)) {
            sbt.mintBadge(msg.sender);
            emit BadgeIssued(msg.sender);
        }
    }
}
