// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Battleship10 — classic 10×10 Battleship, 1v1 on Base (no game server).
 * @notice Fleet: 5+4+3+3+2 cells (Hasbro rules). Casual = 0 stake; ranked = MIN–MAX ETH.
 * @notice Hit = extra turn. Ship layouts are on-chain (UI hides opponent fleet; storage is public).
 */
contract Battleship10 {
    uint8 internal constant SIZE = 10;
    uint8 internal constant CELLS = 100;
    uint8 internal constant FLEET_CELLS = 17;

    uint256 public constant MIN_STAKE = 0.00001 ether;
    uint256 public constant MAX_STAKE = 0.05 ether;
    uint256 public constant JOIN_TIMEOUT = 1 hours;
    uint256 public constant MOVE_TIMEOUT = 24 hours;
    uint256 public constant CASUAL_INACTIVITY_TIMEOUT = 1 hours;

    enum Status {
        Open,
        Placing,
        Active,
        Finished,
        Cancelled
    }

    struct ShipPlaced {
        uint8 row;
        uint8 col;
        uint8 length;
        bool horizontal;
    }

    struct Game {
        address playerX;
        address playerO;
        uint96 stakeWei;
        uint40 lastMoveAt;
        Status status;
        address winner;
        uint8 turn; // 0 = X, 1 = O
        uint128 shipsX;
        uint128 shipsO;
        uint128 shotsX; // X's shots on O's board
        uint128 shotsO;
        uint128 hitsX; // X's hits on O's board (subset of shotsX)
        uint128 hitsO;
        bool placedX;
        bool placedO;
    }

    struct GameView {
        address playerX;
        address playerO;
        uint256 stakeWei;
        Status status;
        address winner;
        uint8 turn;
        uint128 shipsX;
        uint128 shipsO;
        uint128 shotsX;
        uint128 shotsO;
        uint128 hitsX;
        uint128 hitsO;
        bool placedX;
        bool placedO;
        uint40 lastMoveAt;
    }

    uint256 public nextGameId = 1;
    mapping(uint256 => Game) public games;

    event GameCreated(uint256 indexed gameId, address indexed playerX, uint256 stakeWei);
    event GameJoined(uint256 indexed gameId, address indexed playerO);
    event ShipsPlaced(uint256 indexed gameId, address indexed player);
    event BattleStarted(uint256 indexed gameId);
    event ShotFired(uint256 indexed gameId, address indexed shooter, uint8 row, uint8 col, bool hit);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 payoutWei);
    event GameCancelled(uint256 indexed gameId, address indexed refunded, uint256 amountWei);

    error InvalidStake();
    error InvalidGame();
    error NotOpen();
    error NotPlacing();
    error NotActive();
    error NotPlayer();
    error WrongTurn();
    error AlreadyPlaced();
    error InvalidShip();
    error ShipsOverlap();
    error ShipsTouching();
    error InvalidCell();
    error AlreadyShot();
    error SelfJoin();
    error TransferFailed();
    error TimeoutNotReached();

    function createGame() external payable returns (uint256 gameId) {
        if (msg.value != 0 && (msg.value < MIN_STAKE || msg.value > MAX_STAKE)) {
            revert InvalidStake();
        }

        gameId = nextGameId++;
        games[gameId] = Game({
            playerX: msg.sender,
            playerO: address(0),
            stakeWei: uint96(msg.value),
            lastMoveAt: uint40(block.timestamp),
            status: Status.Open,
            winner: address(0),
            turn: 0,
            shipsX: 0,
            shipsO: 0,
            shotsX: 0,
            shotsO: 0,
            hitsX: 0,
            hitsO: 0,
            placedX: false,
            placedO: false
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
        g.status = Status.Placing;
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

    function placeShips(uint256 gameId, ShipPlaced[5] calldata ships) external {
        _storeFleetMask(gameId, _validateFleet(ships));
    }

    /// @notice Place fleet as a 100-bit mask (supports snake / non-linear ships).
    function placeFleetMask(uint256 gameId, uint128 fleetMask) external {
        _storeFleetMask(gameId, _validateFleetMask(fleetMask));
    }

    function _storeFleetMask(uint256 gameId, uint128 mask) internal {
        Game storage g = games[gameId];
        if (g.status != Status.Placing) revert NotPlacing();

        bool isX = msg.sender == g.playerX;
        bool isO = msg.sender == g.playerO;
        if (!isX && !isO) revert NotPlayer();
        if (isX && g.placedX) revert AlreadyPlaced();
        if (isO && g.placedO) revert AlreadyPlaced();

        if (isX) {
            g.shipsX = mask;
            g.placedX = true;
        } else {
            g.shipsO = mask;
            g.placedO = true;
        }

        g.lastMoveAt = uint40(block.timestamp);
        emit ShipsPlaced(gameId, msg.sender);

        if (g.placedX && g.placedO) {
            g.status = Status.Active;
            g.turn = 0;
            emit BattleStarted(gameId);
        }
    }

    function fire(uint256 gameId, uint8 row, uint8 col) external {
        Game storage g = games[gameId];
        if (g.status != Status.Active) revert NotActive();
        if (row >= SIZE || col >= SIZE) revert InvalidCell();

        bool isX = msg.sender == g.playerX;
        bool isO = msg.sender == g.playerO;
        if (!isX && !isO) revert NotPlayer();
        if (isX && g.turn != 0) revert WrongTurn();
        if (isO && g.turn != 1) revert WrongTurn();

        uint8 idx = row * SIZE + col;
        uint128 bit = uint128(1) << idx;

        if (isX) {
            if (g.shotsX & bit != 0) revert AlreadyShot();
            g.shotsX |= bit;
        } else {
            if (g.shotsO & bit != 0) revert AlreadyShot();
            g.shotsO |= bit;
        }

        uint128 targetShips = isX ? g.shipsO : g.shipsX;
        uint128 myShots = isX ? g.shotsX : g.shotsO;
        bool hit = (targetShips & bit) != 0;
        if (hit) {
            if (isX) g.hitsX |= bit;
            else g.hitsO |= bit;
        }

        emit ShotFired(gameId, msg.sender, row, col, hit);

        if ((targetShips & myShots) == targetShips) {
            _finishWin(g, gameId, msg.sender);
            return;
        }

        g.lastMoveAt = uint40(block.timestamp);
        if (!hit) {
            g.turn = isX ? 1 : 0;
        }
    }

    function claimMoveTimeout(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.status != Status.Active && g.status != Status.Placing) revert NotActive();
        if (g.stakeWei == 0) revert InvalidStake();
        if (block.timestamp < uint256(g.lastMoveAt) + MOVE_TIMEOUT) revert TimeoutNotReached();

        address winner = g.turn == 0 ? g.playerO : g.playerX;
        _finishWin(g, gameId, winner);
    }

    function closeCasualIdleGame(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.playerX == address(0)) revert InvalidGame();
        if (g.stakeWei != 0) revert InvalidStake();
        if (g.status != Status.Open && g.status != Status.Placing && g.status != Status.Active) {
            revert NotActive();
        }
        if (block.timestamp < uint256(g.lastMoveAt) + CASUAL_INACTIVITY_TIMEOUT) {
            revert TimeoutNotReached();
        }

        g.status = Status.Cancelled;
        g.stakeWei = 0;
        emit GameCancelled(gameId, address(0), 0);
    }

    function getGame(uint256 gameId) external view returns (GameView memory v) {
        Game storage g = games[gameId];
        if (g.playerX == address(0)) revert InvalidGame();
        v.playerX = g.playerX;
        v.playerO = g.playerO;
        v.stakeWei = g.stakeWei;
        v.status = g.status;
        v.winner = g.winner;
        v.turn = g.turn;
        v.shipsX = g.shipsX;
        v.shipsO = g.shipsO;
        v.shotsX = g.shotsX;
        v.shotsO = g.shotsO;
        v.hitsX = g.hitsX;
        v.hitsO = g.hitsO;
        v.placedX = g.placedX;
        v.placedO = g.placedO;
        v.lastMoveAt = g.lastMoveAt;
    }

    function _validateFleet(ShipPlaced[5] calldata ships) internal pure returns (uint128 mask) {
        uint8[5] memory got;
        for (uint256 i = 0; i < 5; i++) {
            got[i] = ships[i].length;
        }
        _sort5(got);
        if (got[0] != 2 || got[1] != 3 || got[2] != 3 || got[3] != 4 || got[4] != 5) {
            revert InvalidShip();
        }

        uint128 m;
        uint128 blockMask;
        for (uint256 i = 0; i < 5; i++) {
            ShipPlaced calldata s = ships[i];
            if (s.length < 2 || s.length > 5) revert InvalidShip();
            for (uint256 j = 0; j < s.length; j++) {
                uint8 r = s.horizontal ? s.row : s.row + uint8(j);
                uint8 c = s.horizontal ? s.col + uint8(j) : s.col;
                if (r >= SIZE || c >= SIZE) revert InvalidShip();
                uint8 idx = r * SIZE + c;
                uint128 bit = uint128(1) << idx;
                if (m & bit != 0) revert ShipsOverlap();
                if (blockMask & bit != 0) revert ShipsTouching();
            }
            uint128 shipMask;
            for (uint256 j = 0; j < s.length; j++) {
                uint8 r = s.horizontal ? s.row : s.row + uint8(j);
                uint8 c = s.horizontal ? s.col + uint8(j) : s.col;
                uint8 idx = r * SIZE + c;
                uint128 bit = uint128(1) << idx;
                m |= bit;
                shipMask |= bit;
            }
            blockMask |= _neighborBlock(shipMask);
        }
        if (_popcount128(m) != FLEET_CELLS) revert InvalidShip();
        return m;
    }

    function _validateFleetMask(uint128 m) internal pure returns (uint128) {
        if (_popcount128(m) != FLEET_CELLS) revert InvalidShip();

        uint128 remaining = m;
        uint8[5] memory sizes;

        for (uint256 i = 0; i < 5; i++) {
            uint8 startIdx = _lowestSetBit(remaining);
            if (startIdx == type(uint8).max) revert InvalidShip();

            (uint128 compMask, uint8 size) = _connectedComponent(remaining, startIdx);
            sizes[i] = size;

            uint128 others = m & ~compMask;
            uint128 neigh = _neighborBlock(compMask);
            if ((neigh & others) != 0) revert ShipsTouching();

            remaining &= ~compMask;
        }

        if (remaining != 0) revert InvalidShip();
        _sort5(sizes);
        if (sizes[0] != 2 || sizes[1] != 3 || sizes[2] != 3 || sizes[3] != 4 || sizes[4] != 5) {
            revert InvalidShip();
        }
        return m;
    }

    function _lowestSetBit(uint128 x) internal pure returns (uint8) {
        if (x == 0) return type(uint8).max;
        for (uint8 i = 0; i < CELLS; i++) {
            if ((x & (uint128(1) << i)) != 0) return i;
        }
        return type(uint8).max;
    }

    function _connectedComponent(
        uint128 mask,
        uint8 start
    ) internal pure returns (uint128 compMask, uint8 size) {
        compMask = 0;
        size = 0;
        uint128 frontier = uint128(1) << start;
        uint128 visited = 0;

        while (frontier != 0) {
            uint8 idx = _lowestSetBit(frontier);
            frontier &= ~(uint128(1) << idx);
            if ((visited & (uint128(1) << idx)) != 0) continue;
            visited |= uint128(1) << idx;
            if ((mask & (uint128(1) << idx)) == 0) continue;
            compMask |= uint128(1) << idx;
            size++;

            uint8 r = idx / SIZE;
            uint8 c = idx % SIZE;
            if (r > 0) {
                uint8 ni = (r - 1) * SIZE + c;
                if ((mask & (uint128(1) << ni)) != 0 && (visited & (uint128(1) << ni)) == 0) {
                    frontier |= uint128(1) << ni;
                }
            }
            if (r + 1 < SIZE) {
                uint8 ni = (r + 1) * SIZE + c;
                if ((mask & (uint128(1) << ni)) != 0 && (visited & (uint128(1) << ni)) == 0) {
                    frontier |= uint128(1) << ni;
                }
            }
            if (c > 0) {
                uint8 ni = r * SIZE + (c - 1);
                if ((mask & (uint128(1) << ni)) != 0 && (visited & (uint128(1) << ni)) == 0) {
                    frontier |= uint128(1) << ni;
                }
            }
            if (c + 1 < SIZE) {
                uint8 ni = r * SIZE + (c + 1);
                if ((mask & (uint128(1) << ni)) != 0 && (visited & (uint128(1) << ni)) == 0) {
                    frontier |= uint128(1) << ni;
                }
            }
        }
    }

    function _neighborBlock(uint128 shipMask) internal pure returns (uint128 blockMask) {
        for (uint8 idx = 0; idx < CELLS; idx++) {
            uint128 bit = uint128(1) << idx;
            if (shipMask & bit == 0) continue;
            uint8 r = idx / SIZE;
            uint8 c = idx % SIZE;
            for (int8 dr = -1; dr <= 1; dr++) {
                for (int8 dc = -1; dc <= 1; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    int16 nr = int16(uint16(r)) + int16(int8(dr));
                    int16 nc = int16(uint16(c)) + int16(int8(dc));
                    if (nr >= 0 && nr < int16(uint16(SIZE)) && nc >= 0 && nc < int16(uint16(SIZE))) {
                        blockMask |= uint128(1) << (uint8(uint16(nr)) * SIZE + uint8(uint16(nc)));
                    }
                }
            }
        }
    }

    function _sort5(uint8[5] memory arr) internal pure {
        for (uint256 i = 0; i < 5; i++) {
            for (uint256 j = i + 1; j < 5; j++) {
                if (arr[j] < arr[i]) {
                    uint8 t = arr[i];
                    arr[i] = arr[j];
                    arr[j] = t;
                }
            }
        }
    }

    function _popcount128(uint128 x) internal pure returns (uint8 c) {
        while (x != 0) {
            x &= x - 1;
            c++;
        }
    }

    function _finishWin(Game storage g, uint256 gameId, address winner) internal {
        g.status = Status.Finished;
        g.winner = winner;
        uint256 pot = uint256(g.stakeWei) * 2;
        g.stakeWei = 0;
        _send(winner, pot);
        emit GameFinished(gameId, winner, pot);
    }

    function _send(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
