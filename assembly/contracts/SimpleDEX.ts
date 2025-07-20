import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

const RESERVE_A_KEY = stringToBytes('RA');
const RESERVE_B_KEY = stringToBytes('RB');

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const initialReserve = 1000000000;
  
  Storage.set(RESERVE_A_KEY, u64ToBytes(initialReserve));
  Storage.set(RESERVE_B_KEY, u64ToBytes(initialReserve));
  
  generateEvent('DEX deployed');
}

export function swap(_: StaticArray<u8>): StaticArray<u8> {
  const amountIn = 1000000;
  
  const reserveA = bytesToU64(Storage.get(RESERVE_A_KEY));
  const reserveB = bytesToU64(Storage.get(RESERVE_B_KEY));
  
  const amountOut = (amountIn * reserveA) / reserveB;
  
  const newReserveA = reserveA - amountOut;
  const newReserveB = reserveB + amountIn;
  
  Storage.set(RESERVE_A_KEY, u64ToBytes(newReserveA));
  Storage.set(RESERVE_B_KEY, u64ToBytes(newReserveB));
  
  generateEvent('Swap completed');
  
  return u64ToBytes(amountOut);
}

export function getPrice(_: StaticArray<u8>): StaticArray<u8> {
  const reserveA = bytesToU64(Storage.get(RESERVE_A_KEY));
  const reserveB = bytesToU64(Storage.get(RESERVE_B_KEY));
  
  const price = (reserveB * 1000000) / reserveA;
  
  return u64ToBytes(price);
}