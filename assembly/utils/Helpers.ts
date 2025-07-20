import { Args, stringToBytes, bytesToString } from "@massalabs/as-types";
import { Storage, generateEvent, Context } from "@massalabs/massa-as-sdk";
import { STORAGE_KEYS, ERROR_MESSAGES } from "./Constants";

export function requireAuth(requiredAddress: string): void {
  const caller = Context.caller().toString();
  assert(caller == requiredAddress, ERROR_MESSAGES.UNAUTHORIZED);
}

export function requireNotPaused(): void {
  const paused = Storage.has(stringToBytes(STORAGE_KEYS.PAUSED));
  assert(!paused, ERROR_MESSAGES.PAUSED);
}

export function getU64(key: string, defaultValue: u64 = 0): u64 {
  if (!Storage.has(stringToBytes(key))) {
    return defaultValue;
  }
  const data = Storage.get(stringToBytes(key));
  return new Args(data).nextU64().unwrap();
}

export function setU64(key: string, value: u64): void {
  const args = new Args();
  args.add(value);
  Storage.set(stringToBytes(key), args.serialize());
}

export function getU128(key: string, defaultValue: u128 = u128.Zero): u128 {
  if (!Storage.has(stringToBytes(key))) {
    return defaultValue;
  }
  const data = Storage.get(stringToBytes(key));
  return new Args(data).nextU128().unwrap();
}

export function setU128(key: string, value: u128): void {
  const args = new Args();
  args.add(value);
  Storage.set(stringToBytes(key), args.serialize());
}

export function getString(key: string, defaultValue: string = ""): string {
  if (!Storage.has(stringToBytes(key))) {
    return defaultValue;
  }
  return bytesToString(Storage.get(stringToBytes(key)));
}

export function setString(key: string, value: string): void {
  Storage.set(stringToBytes(key), stringToBytes(value));
}

export function min(a: u64, b: u64): u64 {
  return a < b ? a : b;
}

export function max(a: u64, b: u64): u64 {
  return a > b ? a : b;
}

export function calculateShares(amount: u64, totalAssets: u128, totalShares: u128): u64 {
  if (totalShares == u128.Zero || totalAssets == u128.Zero) {
    return amount;
  }
  const shares = u128.from(amount).mul(totalShares).div(totalAssets);
  return shares.toU64();
}

export function calculateAssets(shares: u64, totalAssets: u128, totalShares: u128): u64 {
  if (totalShares == u128.Zero) {
    return 0;
  }
  const assets = u128.from(shares).mul(totalAssets).div(totalShares);
  return assets.toU64();
}

export function emitEvent(eventName: string, data: Map<string, string>): void {
  let eventData = eventName + ":";
  const keys = data.keys();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = data.get(key);
    eventData += key + "=" + value;
    if (i < keys.length - 1) {
      eventData += ",";
    }
  }
  generateEvent(eventData);
}