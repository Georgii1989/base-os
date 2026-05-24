// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Soulbound commemorative NFT minted from Base OS UI. Metadata links to the tip-profile soulbound collection.
contract BaseOSSupporterNFT is ERC721, Ownable {
    uint256 public nextTokenId = 1;
    string private _baseTokenUri;

    mapping(address => bool) public hasMinted;

    /// @notice Tip-router soulbound (`BaseSupporterSBT`) this badge references (may be zero if unset).
    address public immutable linkedSoulboundCollection;

    event OSSupporterMinted(address indexed to, uint256 indexed tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenUri_,
        address linkedSoulbound_,
        address owner_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        linkedSoulboundCollection = linkedSoulbound_;
        _baseTokenUri = baseTokenUri_;
    }

    /// @notice One soulbound badge per wallet; caller pays gas only.
    function mint() external returns (uint256 tokenId) {
        require(!hasMinted[msg.sender], "Already minted");
        hasMinted[msg.sender] = true;
        tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit OSSupporterMinted(msg.sender, tokenId);
    }

    function setBaseTokenUri(string calldata uri) external onlyOwner {
        _baseTokenUri = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenUri;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert("Soulbound: non-transferable");
        }
    }
}
