import { Args, stringToBytes, u128 } from "@massalabs/as-types";
import { Storage, Context, generateEvent } from "@massalabs/massa-as-sdk";
import { 
  STORAGE_KEYS, 
  ERROR_MESSAGES,
  TWAP_WINDOW 
} from "../utils/Constants";
import {
  getU64,
  setU64,
  getU128,
  setU128,
  getString,
  setString,
  emitEvent
} from "../utils/Helpers";

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const dexAddress = args.nextString().expect("DEX address required");
  const initialPrice = args.nextU64().expect("Initial price required");
  
  setString(STORAGE_KEYS.DEX_ADDRESS, dexAddress);
  setU128(STORAGE_KEYS.PRICE_SUM, u128.from(initialPrice));
  setU64(STORAGE_KEYS.SAMPLE_COUNT, 1);
  setU64(STORAGE_KEYS.LAST_UPDATE, Context.timestamp());
}

export function update(argsData: StaticArray<u8>): void {
  const dexAddress = getString(STORAGE_KEYS.DEX_ADDRESS);
  const caller = Context.caller().toString();
  
  assert(caller == dexAddress, ERROR_MESSAGES.UNAUTHORIZED);
  
  const args = new Args(argsData);
  const newPrice = args.nextU64().expect("Price required");
  
  const currentTime = Context.timestamp();
  const lastUpdate = getU64(STORAGE_KEYS.LAST_UPDATE);
  const timeDelta = currentTime - lastUpdate;
  
  let priceSum = getU128(STORAGE_KEYS.PRICE_SUM);
  let sampleCount = getU64(STORAGE_KEYS.SAMPLE_COUNT);
  
  if (timeDelta >= TWAP_WINDOW) {
    priceSum = u128.from(newPrice);
    sampleCount = 1;
  } else {
    priceSum = priceSum.add(u128.from(newPrice));
    sampleCount += 1;
    
    const maxSamples = TWAP_WINDOW / 16;
    if (sampleCount > maxSamples) {
      const avgPrice = priceSum.div(u128.from(sampleCount));
      priceSum = avgPrice.mul(u128.from(maxSamples));
      sampleCount = maxSamples;
    }
  }
  
  setU128(STORAGE_KEYS.PRICE_SUM, priceSum);
  setU64(STORAGE_KEYS.SAMPLE_COUNT, sampleCount);
  setU64(STORAGE_KEYS.LAST_UPDATE, currentTime);
  
  const eventData = new Map<string, string>();
  eventData.set("price", newPrice.toString());
  eventData.set("twap", getTwapInternal().toString());
  eventData.set("timestamp", currentTime.toString());
  emitEvent("PriceUpdate", eventData);
}

export function getTwap(_: StaticArray<u8>): StaticArray<u8> {
  const twap = getTwapInternal();
  
  const result = new Args();
  result.add(twap);
  return result.serialize();
}

export function getSigma(_: StaticArray<u8>): StaticArray<u8> {
  const priceSum = getU128(STORAGE_KEYS.PRICE_SUM);
  const sampleCount = getU64(STORAGE_KEYS.SAMPLE_COUNT);
  
  if (sampleCount < 2) {
    const result = new Args();
    result.add<u64>(0);
    return result.serialize();
  }
  
  const mean = priceSum.div(u128.from(sampleCount)).toU64();
  
  let variance: u64 = 0;
  const recentPrices = getRecentPrices();
  for (let i = 0; i < recentPrices.length; i++) {
    const diff = recentPrices[i] > mean ? recentPrices[i] - mean : mean - recentPrices[i];
    variance += diff * diff;
  }
  
  variance = variance / sampleCount;
  const sigma = sqrt(variance);
  
  const result = new Args();
  result.add(sigma);
  return result.serialize();
}

export function isStale(_: StaticArray<u8>): StaticArray<u8> {
  const currentTime = Context.timestamp();
  const lastUpdate = getU64(STORAGE_KEYS.LAST_UPDATE);
  const isStale = (currentTime - lastUpdate) > (TWAP_WINDOW * 2);
  
  const result = new Args();
  result.add(isStale);
  return result.serialize();
}

function getTwapInternal(): u64 {
  const priceSum = getU128(STORAGE_KEYS.PRICE_SUM);
  const sampleCount = getU64(STORAGE_KEYS.SAMPLE_COUNT);
  
  if (sampleCount == 0) {
    return 0;
  }
  
  return priceSum.div(u128.from(sampleCount)).toU64();
}

function getRecentPrices(): Array<u64> {
  const prices = new Array<u64>();
  const priceSum = getU128(STORAGE_KEYS.PRICE_SUM);
  const sampleCount = getU64(STORAGE_KEYS.SAMPLE_COUNT);
  
  if (sampleCount > 0) {
    const avgPrice = priceSum.div(u128.from(sampleCount)).toU64();
    for (let i = 0; i < min(sampleCount, 10); i++) {
      prices.push(avgPrice);
    }
  }
  
  return prices;
}

function sqrt(n: u64): u64 {
  if (n == 0) return 0;
  
  let x = n;
  let y = (x + 1) / 2;
  
  while (y < x) {
    x = y;
    y = (x + n / x) / 2;
  }
  
  return x;
}

function min(a: u64, b: u64): u64 {
  return a < b ? a : b;
}