import { Args, stringToBytes, u128 } from "@massalabs/as-types";
import { Storage, Context, transferCoins, generateEvent, balanceOf } from "@massalabs/massa-as-sdk";
import { 
  STORAGE_KEYS, 
  ERROR_MESSAGES, 
  MIN_DEPOSIT,
  PRECISION 
} from "../utils/Constants";
import {
  requireNotPaused,
  getU128,
  setU128,
  getString,
  setString,
  calculateShares,
  calculateAssets,
  emitEvent
} from "../utils/Helpers";

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const owner = args.nextString().expect("Owner address required");
  const strategyAddress = args.nextString().expect("Strategy address required");
  const executorAddress = args.nextString().expect("Executor address required");
  
  setString(STORAGE_KEYS.OWNER, owner);
  setString(STORAGE_KEYS.STRATEGY_ADDRESS, strategyAddress);
  setString(STORAGE_KEYS.EXECUTOR_ADDRESS, executorAddress);
  setU128(STORAGE_KEYS.TOTAL_ASSETS, u128.Zero);
  setU128(STORAGE_KEYS.TOTAL_SHARES, u128.Zero);
  setU128(STORAGE_KEYS.ACCUMULATED_FEES, u128.Zero);
}

export function deposit(argsData: StaticArray<u8>): StaticArray<u8> {
  requireNotPaused();
  
  const args = new Args(argsData);
  const amount = args.nextU64().expect("Amount required");
  
  assert(amount >= MIN_DEPOSIT, ERROR_MESSAGES.ZERO_AMOUNT);
  
  const caller = Context.caller().toString();
  const userBalance = balanceOf(caller);
  assert(userBalance >= amount, ERROR_MESSAGES.INSUFFICIENT_BALANCE);
  
  const totalAssets = getU128(STORAGE_KEYS.TOTAL_ASSETS);
  const totalShares = getU128(STORAGE_KEYS.TOTAL_SHARES);
  
  const shares = calculateShares(amount, totalAssets, totalShares);
  
  transferCoins(Context.contractAddress(), amount);
  
  const userSharesKey = STORAGE_KEYS.USER_SHARES_PREFIX + caller;
  const currentShares = getU128(userSharesKey);
  const newShares = currentShares.add(u128.from(shares));
  
  setU128(userSharesKey, newShares);
  setU128(STORAGE_KEYS.TOTAL_SHARES, totalShares.add(u128.from(shares)));
  setU128(STORAGE_KEYS.TOTAL_ASSETS, totalAssets.add(u128.from(amount)));
  
  const eventData = new Map<string, string>();
  eventData.set("user", caller);
  eventData.set("amount", amount.toString());
  eventData.set("shares", shares.toString());
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("Deposit", eventData);
  
  const result = new Args();
  result.add(shares);
  return result.serialize();
}

export function withdraw(argsData: StaticArray<u8>): StaticArray<u8> {
  requireNotPaused();
  
  const args = new Args(argsData);
  const shares = args.nextU64().expect("Shares required");
  
  assert(shares > 0, ERROR_MESSAGES.ZERO_AMOUNT);
  
  const caller = Context.caller().toString();
  const userSharesKey = STORAGE_KEYS.USER_SHARES_PREFIX + caller;
  const userShares = getU128(userSharesKey);
  
  assert(userShares >= u128.from(shares), ERROR_MESSAGES.INSUFFICIENT_BALANCE);
  
  const totalAssets = getU128(STORAGE_KEYS.TOTAL_ASSETS);
  const totalShares = getU128(STORAGE_KEYS.TOTAL_SHARES);
  
  const assets = calculateAssets(shares, totalAssets, totalShares);
  
  const newUserShares = userShares.sub(u128.from(shares));
  setU128(userSharesKey, newUserShares);
  setU128(STORAGE_KEYS.TOTAL_SHARES, totalShares.sub(u128.from(shares)));
  setU128(STORAGE_KEYS.TOTAL_ASSETS, totalAssets.sub(u128.from(assets)));
  
  transferCoins(caller, assets);
  
  const eventData = new Map<string, string>();
  eventData.set("user", caller);
  eventData.set("shares", shares.toString());
  eventData.set("assets", assets.toString());
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("Withdraw", eventData);
  
  const result = new Args();
  result.add(assets);
  return result.serialize();
}

export function sync(argsData: StaticArray<u8>): void {
  const executorAddress = getString(STORAGE_KEYS.EXECUTOR_ADDRESS);
  const caller = Context.caller().toString();
  
  assert(caller == executorAddress, ERROR_MESSAGES.UNAUTHORIZED);
  
  const args = new Args(argsData);
  const newTotalAssets = args.nextU128().expect("New total assets required");
  
  setU128(STORAGE_KEYS.TOTAL_ASSETS, newTotalAssets);
  
  const eventData = new Map<string, string>();
  eventData.set("totalAssets", newTotalAssets.toString());
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("Sync", eventData);
}

export function balanceOfShares(argsData: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(argsData);
  const user = args.nextString().expect("User address required");
  
  const userSharesKey = STORAGE_KEYS.USER_SHARES_PREFIX + user;
  const shares = getU128(userSharesKey);
  
  const result = new Args();
  result.add(shares);
  return result.serialize();
}

export function totalAssets(_: StaticArray<u8>): StaticArray<u8> {
  const assets = getU128(STORAGE_KEYS.TOTAL_ASSETS);
  
  const result = new Args();
  result.add(assets);
  return result.serialize();
}

export function totalShares(_: StaticArray<u8>): StaticArray<u8> {
  const shares = getU128(STORAGE_KEYS.TOTAL_SHARES);
  
  const result = new Args();
  result.add(shares);
  return result.serialize();
}

export function sharePrice(_: StaticArray<u8>): StaticArray<u8> {
  const totalAssets = getU128(STORAGE_KEYS.TOTAL_ASSETS);
  const totalShares = getU128(STORAGE_KEYS.TOTAL_SHARES);
  
  let price: u64 = PRECISION;
  if (totalShares > u128.Zero && totalAssets > u128.Zero) {
    price = totalAssets.mul(u128.from(PRECISION)).div(totalShares).toU64();
  }
  
  const result = new Args();
  result.add(price);
  return result.serialize();
}