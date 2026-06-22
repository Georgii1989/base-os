#!/usr/bin/env bash
set -euo pipefail
source "$HOME/.bashrc" 2>/dev/null || true
cd "$(dirname "$0")/.."
source .env

TOKEN="0xb200000000000000000000CFDF192B3017d8C007"

base-cast send "$TOKEN" "mint(address,uint256)" "$ACCOUNT_ADDRESS" 1000000000000000000000 \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY"

echo "balance:"
base-cast call "$TOKEN" "balanceOf(address)(uint256)" "$ACCOUNT_ADDRESS" --rpc-url "$RPC_URL"
echo "name:"
base-cast call "$TOKEN" "name()(string)" --rpc-url "$RPC_URL"
echo "symbol:"
base-cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC_URL"
