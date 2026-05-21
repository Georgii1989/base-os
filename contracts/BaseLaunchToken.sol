// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Standard ERC-20 minted once to the launcher wallet (18 decimals).
contract BaseLaunchToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        address recipient
    ) ERC20(name_, symbol_) {
        require(recipient != address(0), "zero recipient");
        require(initialSupply > 0, "zero supply");
        _mint(recipient, initialSupply);
    }
}
