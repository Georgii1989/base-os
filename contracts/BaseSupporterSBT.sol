// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Non-transferable ERC-721 supporter badge.
contract BaseSupporterSBT is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    string private _baseTokenUri;

    mapping(address => bool) public hasBadge;
    mapping(address => bool) public minters;

    event BadgeMinted(address indexed to, uint256 indexed tokenId);
    event MinterUpdated(address indexed minter, bool allowed);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenUri_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        _baseTokenUri = baseTokenUri_;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "Not minter");
        _;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    function mintBadge(address to) external onlyMinter returns (uint256 tokenId) {
        require(!hasBadge[to], "Badge already minted");
        tokenId = nextTokenId++;
        hasBadge[to] = true;
        _safeMint(to, tokenId);
        emit BadgeMinted(to, tokenId);
    }

    function setBaseTokenUri(string calldata uri) external onlyOwner {
        _baseTokenUri = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenUri;
    }

    // Soulbound behavior: disable transfers after mint.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
    }
}
