export const PRECISION: u64 = 1_000_000;
export const BASIS_POINTS: u64 = 10_000;
export const MAX_FEE: u64 = 500;
export const MIN_DEPOSIT: u64 = 1_000_000;
export const TWAP_WINDOW: u64 = 600;
export const DEFAULT_STRATEGY_INTERVAL: u64 = 600;
export const DEFAULT_REBALANCE_THRESHOLD: u64 = 500;
export const MAX_SLIPPAGE: u64 = 300;
export const GAS_RESERVE: u64 = 1_000_000;

export const STORAGE_KEYS = {
  TOTAL_ASSETS: "TA",
  TOTAL_SHARES: "TS",
  USER_SHARES_PREFIX: "SH_",
  ACCUMULATED_FEES: "FEE",
  PRICE_SUM: "SUM",
  SAMPLE_COUNT: "CNT",
  LAST_UPDATE: "LU",
  TWAP_THRESHOLD: "THP",
  SIGMA_THRESHOLD: "THS",
  NEXT_EXEC_SLOT: "NXT",
  STRATEGY_ACTIVE: "SA",
  OWNER: "OWN",
  DAO_MULTISIG: "DAO",
  PAUSED: "PSE",
  STRATEGY_ADDRESS: "STR",
  EXECUTOR_ADDRESS: "EXE",
  ORACLE_ADDRESS: "ORC",
  DEX_ADDRESS: "DEX"
};

export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: "Insufficient balance",
  ZERO_AMOUNT: "Amount must be greater than zero",
  UNAUTHORIZED: "Unauthorized caller",
  PAUSED: "Contract is paused",
  REENTRANCY: "Reentrancy detected",
  INVALID_ADDRESS: "Invalid address",
  SLIPPAGE_EXCEEDED: "Slippage tolerance exceeded",
  ORACLE_STALE: "Oracle data is stale",
  STRATEGY_INACTIVE: "Strategy is not active"
};