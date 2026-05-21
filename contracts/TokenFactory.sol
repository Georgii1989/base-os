// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseLaunchToken.sol";

/// @notice Deploys a new ERC-20 per call; caller pays gas and receives the full supply.
contract TokenFactory {
    event TokenLaunched(
        address indexed creator,
        address indexed token,
        string name,
        string symbol,
        uint256 initialSupply
    );

    function launch(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply
    ) external returns (address token) {
        uint256 nameLen = bytes(name).length;
        uint256 symbolLen = bytes(symbol).length;
        require(nameLen > 0 && nameLen <= 32, "name length");
        require(symbolLen > 0 && symbolLen <= 11, "symbol length");
        require(initialSupply > 0, "zero supply");

        BaseLaunchToken deployed = new BaseLaunchToken(name, symbol, initialSupply, msg.sender);
        token = address(deployed);
        emit TokenLaunched(msg.sender, token, name, symbol, initialSupply);
    }
}
