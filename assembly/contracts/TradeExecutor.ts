import { Args, stringToBytes, u128 } from "@massalabs/as-types";
import { 
  Storage, 
  Context, 
  generateEvent,
  callContract,
  transferCoins,
  balanceOf
} from "@massalabs/massa-as-sdk";
import { 
  STORAGE_KEYS, 
  ERROR_MESSAGES,
  MAX_SLIPPAGE,
  BASIS_POINTS
} from "../utils/Constants";
import {
  requireAuth,
  requireNotPaused,
  getString,
  setString,
  emitEvent
} from "../utils/Helpers";

interface RebalanceParams {
  targetAllocation: u64;
  minAmountOut: u64;
  maxSlippage: u64;
}

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const owner = args.nextString().expect("Owner address required");
  const strategyAddress = args.nextString().expect("Strategy address required");
  const vaultAddress = args.nextString().expect("Vault address required");
  const dexAddress = args.nextString().expect("DEX address required");
  
  setString(STORAGE_KEYS.OWNER, owner);
  setString(STORAGE_KEYS.STRATEGY_ADDRESS, strategyAddress);
  setString(STORAGE_KEYS.VAULT_ADDRESS, vaultAddress);
  setString(STORAGE_KEYS.DEX_ADDRESS, dexAddress);
}

export function rebalance(argsData: StaticArray<u8>): void {
  requireNotPaused();
  
  const strategyAddress = getString(STORAGE_KEYS.STRATEGY_ADDRESS);
  requireAuth(strategyAddress);
  
  const args = new Args(argsData);
  const twap = args.nextU64().expect("TWAP required");
  const sigma = args.nextU64().expect("Sigma required");
  const action = args.nextString().expect("Action required");
  
  const vaultAddress = getString(STORAGE_KEYS.VAULT_ADDRESS);
  const dexAddress = getString(STORAGE_KEYS.DEX_ADDRESS);
  
  const totalAssetsResult = callContract(vaultAddress, "totalAssets", new StaticArray<u8>(0), 0);
  const totalAssets = new Args(totalAssetsResult).nextU128().unwrap();
  
  const currentBalance = balanceOf(Context.contractAddress().toString());
  
  let targetAllocation: u64 = 5000;
  if (action == "rebalance_volatility") {
    targetAllocation = 3000;
  } else if (action == "rebalance_price_up") {
    targetAllocation = 7000;
  } else if (action == "rebalance_price_down") {
    targetAllocation = 4000;
  }
  
  const targetAmount = totalAssets.mul(u128.from(targetAllocation)).div(u128.from(BASIS_POINTS)).toU64();
  
  if (currentBalance != targetAmount) {
    if (currentBalance < targetAmount) {
      const amountToBuy = targetAmount - currentBalance;
      executeSwap(dexAddress, true, amountToBuy, twap);
    } else {
      const amountToSell = currentBalance - targetAmount;
      executeSwap(dexAddress, false, amountToSell, twap);
    }
  }
  
  const newBalance = balanceOf(Context.contractAddress().toString());
  const newTotalAssets = totalAssets.sub(u128.from(currentBalance)).add(u128.from(newBalance));
  
  const syncArgs = new Args();
  syncArgs.add(newTotalAssets);
  callContract(vaultAddress, "sync", syncArgs.serialize(), 0);
  
  const eventData = new Map<string, string>();
  eventData.set("action", action);
  eventData.set("targetAllocation", targetAllocation.toString());
  eventData.set("newBalance", newBalance.toString());
  eventData.set("gasUsed", Context.remainingGas().toString());
  emitEvent("Rebalanced", eventData);
}

export function emergencyWithdraw(argsData: StaticArray<u8>): void {
  const owner = getString(STORAGE_KEYS.OWNER);
  requireAuth(owner);
  
  const args = new Args(argsData);
  const recipient = args.nextString().expect("Recipient required");
  
  const balance = balanceOf(Context.contractAddress().toString());
  if (balance > 0) {
    transferCoins(recipient, balance);
  }
  
  const eventData = new Map<string, string>();
  eventData.set("recipient", recipient);
  eventData.set("amount", balance.toString());
  emitEvent("EmergencyWithdraw", eventData);
}

function executeSwap(
  dexAddress: string, 
  isBuy: bool, 
  amount: u64, 
  expectedPrice: u64
): void {
  const slippageTolerance = MAX_SLIPPAGE;
  const minAmountOut = isBuy 
    ? amount * (BASIS_POINTS - slippageTolerance) / BASIS_POINTS / expectedPrice
    : amount * expectedPrice * (BASIS_POINTS - slippageTolerance) / BASIS_POINTS;
  
  const swapArgs = new Args();
  swapArgs.add(isBuy);
  swapArgs.add(amount);
  swapArgs.add(minAmountOut);
  
  const amountOut = callContract(dexAddress, "swap", swapArgs.serialize(), amount);
  const actualOut = new Args(amountOut).nextU64().unwrap();
  
  assert(actualOut >= minAmountOut, ERROR_MESSAGES.SLIPPAGE_EXCEEDED);
  
  const eventData = new Map<string, string>();
  eventData.set("type", isBuy ? "buy" : "sell");
  eventData.set("amountIn", amount.toString());
  eventData.set("amountOut", actualOut.toString());
  emitEvent("SwapExecuted", eventData);
}