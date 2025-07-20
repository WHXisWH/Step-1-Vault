import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, bytesToString } from '@massalabs/as-types';

const OWNER_KEY = stringToBytes('OWNER');
const PAUSED_KEY = stringToBytes('PAUSED');

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const owner = Context.caller().toString();
  Storage.set(OWNER_KEY, stringToBytes(owner));
  
  generateEvent('Governance deployed');
}

export function pause(_: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can pause");
  
  Storage.set(PAUSED_KEY, stringToBytes('true'));
  
  generateEvent('System paused');
}

export function unpause(_: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can unpause");
  
  Storage.del(PAUSED_KEY);
  
  generateEvent('System unpaused');
}

export function isPaused(_: StaticArray<u8>): StaticArray<u8> {
  const paused = Storage.has(PAUSED_KEY);
  
  if (paused) {
    return stringToBytes('true');
  } else {
    return stringToBytes('false');
  }
}

export function getOwner(_: StaticArray<u8>): StaticArray<u8> {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  return stringToBytes(owner);
}

export function transferOwnership(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can transfer ownership");
  
  const newOwner = bytesToString(argsData);
  Storage.set(OWNER_KEY, stringToBytes(newOwner));
  
  generateEvent('Ownership transferred');
}