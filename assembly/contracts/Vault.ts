import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, bytesToString, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

const TOTAL_ASSETS_KEY = stringToBytes('TA');
const TOTAL_SHARES_KEY = stringToBytes('TS');
const USER_SHARES_PREFIX = 'SH_';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  Storage.set(TOTAL_ASSETS_KEY, u64ToBytes(0));
  Storage.set(TOTAL_SHARES_KEY, u64ToBytes(0));
  
  generateEvent('Vault deployed');
}

export function deposit(_: StaticArray<u8>): StaticArray<u8> {
  const caller = Context.caller().toString();
  const amount = 1000000;
  
  const totalAssets = Storage.has(TOTAL_ASSETS_KEY) 
    ? bytesToU64(Storage.get(TOTAL_ASSETS_KEY)) 
    : 0;
  const totalShares = Storage.has(TOTAL_SHARES_KEY) 
    ? bytesToU64(Storage.get(TOTAL_SHARES_KEY)) 
    : 0;
  
  let shares: u64;
  if (totalShares === 0) {
    shares = amount;
  } else {
    shares = (amount * totalShares) / totalAssets;
  }
  
  const userSharesKey = stringToBytes(USER_SHARES_PREFIX + caller);
  const currentShares = Storage.has(userSharesKey) 
    ? bytesToU64(Storage.get(userSharesKey)) 
    : 0;
  
  Storage.set(userSharesKey, u64ToBytes(currentShares + shares));
  Storage.set(TOTAL_SHARES_KEY, u64ToBytes(totalShares + shares));
  Storage.set(TOTAL_ASSETS_KEY, u64ToBytes(totalAssets + amount));
  
  generateEvent('Deposit completed');
  
  return u64ToBytes(shares);
}

export function balanceOf(argsData: StaticArray<u8>): StaticArray<u8> {
  const user = bytesToString(argsData);
  const userSharesKey = stringToBytes(USER_SHARES_PREFIX + user);
  
  const shares = Storage.has(userSharesKey) 
    ? bytesToU64(Storage.get(userSharesKey)) 
    : 0;
  
  return u64ToBytes(shares);
}

export function totalAssets(_: StaticArray<u8>): StaticArray<u8> {
  const assets = Storage.has(TOTAL_ASSETS_KEY) 
    ? bytesToU64(Storage.get(TOTAL_ASSETS_KEY)) 
    : 0;
  
  return u64ToBytes(assets);
}