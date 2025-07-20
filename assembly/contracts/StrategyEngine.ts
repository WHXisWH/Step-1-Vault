import { generateEvent, Storage, Context } from '@massalabs/massa-as-sdk';
import { stringToBytes, bytesToString, u64ToBytes, bytesToU64 } from '@massalabs/as-types';

const OWNER_KEY = stringToBytes('OWNER');
const ORACLE_ADDRESS_KEY = stringToBytes('ORACLE');
const EXECUTOR_ADDRESS_KEY = stringToBytes('EXECUTOR');
const STRATEGY_ACTIVE_KEY = stringToBytes('ACTIVE');
const LAST_EXECUTION_KEY = stringToBytes('LAST_EXEC');

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const owner = Context.caller().toString();
  Storage.set(OWNER_KEY, stringToBytes(owner));
  Storage.set(STRATEGY_ACTIVE_KEY, stringToBytes('false'));
  
  generateEvent('StrategyEngine deployed');
}

export function setOracle(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can set oracle");
  
  const oracleAddress = bytesToString(argsData);
  Storage.set(ORACLE_ADDRESS_KEY, stringToBytes(oracleAddress));
  
  generateEvent('Oracle address updated');
}

export function setExecutor(argsData: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can set executor");
  
  const executorAddress = bytesToString(argsData);
  Storage.set(EXECUTOR_ADDRESS_KEY, stringToBytes(executorAddress));
  
  generateEvent('Executor address updated');
}

export function startStrategy(_: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can start strategy");
  
  Storage.set(STRATEGY_ACTIVE_KEY, stringToBytes('true'));
  
  generateEvent('Strategy started');
}

export function stopStrategy(_: StaticArray<u8>): void {
  const owner = bytesToString(Storage.get(OWNER_KEY));
  const caller = Context.caller().toString();
  assert(caller == owner, "Only owner can stop strategy");
  
  Storage.set(STRATEGY_ACTIVE_KEY, stringToBytes('false'));
  
  generateEvent('Strategy stopped');
}

export function isStrategyActive(_: StaticArray<u8>): StaticArray<u8> {
  const active = Storage.has(STRATEGY_ACTIVE_KEY) 
    ? bytesToString(Storage.get(STRATEGY_ACTIVE_KEY))
    : 'false';
  
  return stringToBytes(active);
}

export function executeStrategy(_: StaticArray<u8>): void {
  const active = Storage.has(STRATEGY_ACTIVE_KEY) 
    ? bytesToString(Storage.get(STRATEGY_ACTIVE_KEY))
    : 'false';
  
  if (active != 'true') {
    return;
  }
  

  Storage.set(LAST_EXECUTION_KEY, u64ToBytes(Context.timestamp()));
  
  generateEvent('Strategy executed');
}