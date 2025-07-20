import { Storage, generateEvent, Context, stringToBytes, bytesToString } from "@massalabs/massa-as-sdk";
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
  const dataStr = bytesToString(data);
  return U64.parseInt(dataStr);
}

export function setU64(key: string, value: u64): void {
  Storage.set(stringToBytes(key), stringToBytes(value.toString()));
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

export function calculateShares(amount: u64, totalAssets: u64, totalShares: u64): u64 {
  if (totalShares == 0 || totalAssets == 0) {
    return amount;
  }
  const shares = amount * totalShares / totalAssets;
  return shares;
}

export function calculateAssets(shares: u64, totalAssets: u64, totalShares: u64): u64 {
  if (totalShares == 0) {
    return 0;
  }
  const assets = shares * totalAssets / totalShares;
  return assets;
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