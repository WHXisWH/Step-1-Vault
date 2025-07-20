import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, bytesToString, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

const OWNER_KEY = stringToBytes('OWNER');
const STRATEGY_ADDRESS_KEY = stringToBytes('STRATEGY');
const VAULT_ADDRESS_KEY = stringToBytes('VAULT');
const DEX_ADDRESS_KEY = stringToBytes('DEX');
const LAST_TRADE_KEY = stringToBytes('LAST_TRADE');

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const owner = Context.caller().toString();
  Storage.set(OWNER_KEY, stringToBytes(owner));
  
  generateEvent('TradeExecutor deployed');
}

export function setStrategy(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can set strategy");
  
  const strategyAddress = bytesToString(argsData);
  Storage.set(STRATEGY_ADDRESS_KEY, stringToBytes(strategyAddress));
  
  generateEvent('Strategy address updated');
}

export function setVault(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can set vault");
  
  const vaultAddress = bytesToString(argsData);
  Storage.set(VAULT_ADDRESS_KEY, stringToBytes(vaultAddress));
  
  generateEvent('Vault address updated');
}

export function setDex(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can set DEX");
  
  const dexAddress = bytesToString(argsData);
  Storage.set(DEX_ADDRESS_KEY, stringToBytes(dexAddress));
  
  generateEvent('DEX address updated');
}

export function rebalance(_: StaticArray<u8>): void {
  const strategyAddress = Storage.has(STRATEGY_ADDRESS_KEY) 
    ? bytesToString(Storage.get(STRATEGY_ADDRESS_KEY))
    : '';
  const caller = Context.caller().toString();
  
  if (strategyAddress != '' && caller == strategyAddress) {
    Storage.set(LAST_TRADE_KEY, u64ToBytes(Context.timestamp()));
    generateEvent('Rebalance executed');
  } else {
    const owner = bytesToString(Storage.get(OWNER_KEY));
    assert(caller == owner, "Only strategy or owner can rebalance");
    
    Storage.set(LAST_TRADE_KEY, u64ToBytes(Context.timestamp()));
    generateEvent('Manual rebalance executed');
  }
}

export function getLastTradeTime(_: StaticArray<u8>): StaticArray<u8> {
  const lastTrade = Storage.has(LAST_TRADE_KEY) 
    ? bytesToU64(Storage.get(LAST_TRADE_KEY))
    : 0;
  
  return u64ToBytes(lastTrade);
}