export type RelayTxData = {
  from?: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  chainId: number;
  gas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export type RelayStepItem = {
  status: string;
  data?: RelayTxData;
  check?: {
    endpoint: string;
    method: string;
  };
};

export type RelayStep = {
  id: string;
  action: string;
  description: string;
  kind: string;
  requestId?: string;
  items: RelayStepItem[];
};

export type RelayQuoteResponse = {
  steps: RelayStep[];
  fees?: unknown;
  details?: {
    operation?: string;
    timeEstimate?: number;
    currencyIn?: {
      amount?: string;
      amountFormatted?: string;
      amountUsd?: string;
      currency?: { symbol?: string; decimals?: number };
    };
    currencyOut?: {
      amount?: string;
      amountFormatted?: string;
      amountUsd?: string;
      currency?: { symbol?: string; decimals?: number };
    };
  };
};

export type RelayStatusResponse = {
  status?: string;
  inTxHashes?: string[];
  txHashes?: string[];
  updatedAt?: number;
  originChainId?: number;
  destinationChainId?: number;
};
