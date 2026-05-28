// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Grid646 — 6×6, four in a row, 1v1 with ETH stakes (no game server).
 * @notice Free placement (крестики-нолики на большом поле), not gravity/Connect-Four columns.
 *         Player X (host) vs Player O (joiner). Each move is an onchain transaction.
 */
contract Grid646 {
    uint8 internal constant SIZE = 6;
    uint8 internal constant WIN_LEN = 4;
    uint8 internal constant CELLS = 36;

    uint256 public constant MIN_STAKE = 0.00001 ether;
    uint256 public constant MAX_STAKE = 0.05 ether;
    uint256 public constant JOIN_TIMEOUT = 1 hours;
    uint256 public constant MOVE_TIMEOUT = 24 hours;

    enum Status {
        Open,
        Active,
        Finished,
        Cancelled
    }

    struct Game {
        address playerX;
        address playerO;
        uint96 stakeWei;
        uint40 lastMoveAt;
        Status status;
        address winner;
        uint8 turn; // 0 = X, 1 = O
        uint256 xMask;
        uint256 oMask;
    }

    uint256 public nextGameId = 1;
    mapping(uint256 => Game) public games;

    event GameCreated(uint256 indexed gameId, address indexed playerX, uint256 stakeWei);
    event GameJoined(uint256 indexed gameId, address indexed playerO);
    event MovePlayed(
        uint256 indexed gameId,
        address indexed player,
        uint8 row,
        uint8 col,
        uint8 turnAfter
    );
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 payoutWei);
    event GameCancelled(uint256 indexed gameId, address indexed refunded, uint256 amountWei);
    event GameDraw(uint256 indexed gameId, uint256 refundEachWei);

    error InvalidStake();
    error InvalidGame();
    error NotOpen();
    error NotActive();
    error NotPlayer();
    error WrongTurn();
    error CellTaken();
    error InvalidCell();
    error SelfJoin();
    error TransferFailed();
    error TimeoutNotReached();
    error NothingToCancel();

    function createGame() external payable returns (uint256 gameId) {
        if (msg.value < MIN_STAKE || msg.value > MAX_STAKE) revert InvalidStake();

        gameId = nextGameId++;
        games[gameId] = Game({
            playerX: msg.sender,
            playerO: address(0),
            stakeWei: uint96(msg.value),
            lastMoveAt: uint40(block.timestamp),
            status: Status.Open,
            winner: address(0),
            turn: 0,
            xMask: 0,
            oMask: 0
        });

        emit GameCreated(gameId, msg.sender, msg.value);
    }

    function joinGame(uint256 gameId) external payable {
        Game storage g = games[gameId];
        if (g.playerX == address(0)) revert InvalidGame();
        if (g.status != Status.Open) revert NotOpen();
        if (msg.value != g.stakeWei) revert InvalidStake();
        if (msg.sender == g.playerX) revert SelfJoin();

        g.playerO = msg.sender;
        g.status = Status.Active;
        g.lastMoveAt = uint40(block.timestamp);

        emit GameJoined(gameId, msg.sender);
    }

    function cancelOpenGame(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.status != Status.Open) revert NotOpen();
        if (msg.sender != g.playerX) revert NotPlayer();
        if (block.timestamp < uint256(g.lastMoveAt) + JOIN_TIMEOUT) revert TimeoutNotReached();

        g.status = Status.Cancelled;
        uint256 amount = g.stakeWei;
        g.stakeWei = 0;

        _send(g.playerX, amount);
        emit GameCancelled(gameId, g.playerX, amount);
    }

    function play(uint256 gameId, uint8 row, uint8 col) external {
        Game storage g = games[gameId];
        if (g.status != Status.Active) revert NotActive();
        if (row >= SIZE || col >= SIZE) revert InvalidCell();

        uint8 idx = row * SIZE + col;
        uint256 bit = uint256(1) << idx;
        if ((g.xMask | g.oMask) & bit != 0) revert CellTaken();

        bool isX = g.turn == 0;
        if (isX) {
            if (msg.sender != g.playerX) revert NotPlayer();
            g.xMask |= bit;
        } else {
            if (msg.sender != g.playerO) revert NotPlayer();
            g.oMask |= bit;
        }

        uint256 playerMask = isX ? g.xMask : g.oMask;
        if (_hasWin(playerMask, row, col)) {
            _finishWin(g, gameId, msg.sender);
            return;
        }

        if ((g.xMask | g.oMask) == (uint256(1) << CELLS) - 1) {
            _finishDraw(g, gameId);
            return;
        }

        g.turn = isX ? 1 : 0;
        g.lastMoveAt = uint40(block.timestamp);
        emit MovePlayed(gameId, msg.sender, row, col, g.turn);
    }

    function claimMoveTimeout(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.status != Status.Active) revert NotActive();
        if (block.timestamp < uint256(g.lastMoveAt) + MOVE_TIMEOUT) revert TimeoutNotReached();

        address winner = g.turn == 0 ? g.playerO : g.playerX;
        _finishWin(g, gameId, winner);
    }

    function getGame(uint256 gameId)
        external
        view
        returns (
            address playerX,
            address playerO,
            uint256 stakeWei,
            Status status,
            address winner,
            uint8 turn,
            uint256 xMask,
            uint256 oMask,
            uint40 lastMoveAt
        )
    {
        Game storage g = games[gameId];
        if (g.playerX == address(0)) revert InvalidGame();
        return (
            g.playerX,
            g.playerO,
            g.stakeWei,
            g.status,
            g.winner,
            g.turn,
            g.xMask,
            g.oMask,
            g.lastMoveAt
        );
    }

    function _finishWin(Game storage g, uint256 gameId, address winner) internal {
        g.status = Status.Finished;
        g.winner = winner;
        uint256 pot = uint256(g.stakeWei) * 2;
        g.stakeWei = 0;
        _send(winner, pot);
        emit GameFinished(gameId, winner, pot);
    }

    function _finishDraw(Game storage g, uint256 gameId) internal {
        g.status = Status.Finished;
        uint256 stake = g.stakeWei;
        g.stakeWei = 0;
        _send(g.playerX, stake);
        _send(g.playerO, stake);
        emit GameDraw(gameId, stake);
    }

    function _send(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _hasWin(uint256 mask, uint8 row, uint8 col) internal pure returns (bool) {
        if (_lineCount(mask, row, col, 0, 1) >= WIN_LEN) return true;
        if (_lineCount(mask, row, col, 1, 0) >= WIN_LEN) return true;
        if (_lineCount(mask, row, col, 1, 1) >= WIN_LEN) return true;
        if (_lineCount(mask, row, col, 1, -1) >= WIN_LEN) return true;
        return false;
    }

    function _lineCount(
        uint256 mask,
        uint8 row,
        uint8 col,
        int8 dr,
        int8 dc
    ) internal pure returns (uint8) {
        uint8 total = 1;
        total += _ray(mask, row, col, dr, dc);
        total += _ray(mask, row, col, -dr, -dc);
        return total;
    }

    function _ray(
        uint256 mask,
        uint8 row,
        uint8 col,
        int8 dr,
        int8 dc
    ) internal pure returns (uint8) {
        uint8 count = 0;
        int16 r = int16(uint16(row));
        int16 c = int16(uint16(col));
        for (uint8 i = 0; i < WIN_LEN - 1; i++) {
            r += dr;
            c += dc;
            if (r < 0 || r >= int16(uint16(SIZE)) || c < 0 || c >= int16(uint16(SIZE))) break;
            if (!_test(mask, uint8(uint16(r)), uint8(uint16(c)))) break;
            count++;
        }
        return count;
    }

    function _test(uint256 mask, uint8 row, uint8 col) internal pure returns (bool) {
        uint8 idx = row * SIZE + col;
        return ((mask >> idx) & 1) == 1;
    }
}
