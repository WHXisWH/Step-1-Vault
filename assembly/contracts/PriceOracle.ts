import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, bytesToString, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

const CURRENT_PRICE_KEY = stringToBytes('PRICE');
const LAST_UPDATE_KEY = stringToBytes('UPDATED');
const ORACLE_OWNER_KEY = stringToBytes('OWNER');

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const owner = Context.caller().toString();
  Storage.set(ORACLE_OWNER_KEY, stringToBytes(owner));
  Storage.set(CURRENT_PRICE_KEY, u64ToBytes(1000000));
  Storage.set(LAST_UPDATE_KEY, u64ToBytes(Context.timestamp()));
  
  generateEvent('PriceOracle deployed');
}

export function updatePrice(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(ORACLE_OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can update price");
  
  const newPrice = bytesToU64(argsData);
  assert(newPrice > 0, "Price must be greater than 0");
  
  Storage.set(CURRENT_PRICE_KEY, u64ToBytes(newPrice));
  Storage.set(LAST_UPDATE_KEY, u64ToBytes(Context.timestamp()));
  
  generateEvent('Price updated');
}

export function getPrice(_: StaticArray<u8>): StaticArray<u8> {
  const price = Storage.has(CURRENT_PRICE_KEY) 
    ? bytesToU64(Storage.get(CURRENT_PRICE_KEY)) 
    : 1000000;
  
  return u64ToBytes(price);
}

export function getTwap(_: StaticArray<u8>): StaticArray<u8> {

  return getPrice(new StaticArray<u8>(0));
}

export function getSigma(_: StaticArray<u8>): StaticArray<u8> {

  return u64ToBytes(50);
}