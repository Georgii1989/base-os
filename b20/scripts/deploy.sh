#!/usr/bin/env bash
set -euo pipefail

source "$HOME/.bashrc" 2>/dev/null || true

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing b20/.env — copy .env.example and set PRIVATE_KEY + ACCOUNT_ADDRESS."
  exit 1
fi

# shellcheck disable=SC1091
source .env

base-forge script script/CreateToken.s.sol --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast

if command -v jq >/dev/null 2>&1; then
  TOKEN_ADDRESS=$(jq -er '.returns.token.value' "broadcast/CreateToken.s.sol/$CHAIN_ID/run-latest.json")
  echo "export TOKEN_ADDRESS=$TOKEN_ADDRESS" >> .env
  base-cast send "$TOKEN_ADDRESS" "mint(address,uint256)" "$ACCOUNT_ADDRESS" 1000000000000000000000 \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"
  base-cast call "$TOKEN_ADDRESS" "balanceOf(address)(uint256)" "$ACCOUNT_ADDRESS" --rpc-url "$RPC_URL"
fi
