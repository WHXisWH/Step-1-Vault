import { Args, stringToBytes } from "@massalabs/as-types";
import { Storage, Context, generateEvent } from "@massalabs/massa-as-sdk";
import { 
  STORAGE_KEYS, 
  ERROR_MESSAGES 
} from "../utils/Constants";
import {
  requireAuth,
  getString,
  setString,
  emitEvent
} from "../utils/Helpers";

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const owner = args.nextString().expect("Owner address required");
  const daoMultisig = args.nextString().expect("DAO multisig address required");
  
  setString(STORAGE_KEYS.OWNER, owner);
  setString(STORAGE_KEYS.DAO_MULTISIG, daoMultisig);
}

export function transferOwnership(argsData: StaticArray<u8>): void {
  const owner = getString(STORAGE_KEYS.OWNER);
  requireAuth(owner);
  
  const args = new Args(argsData);
  const newOwner = args.nextString().expect("New owner address required");
  
  setString(STORAGE_KEYS.OWNER, newOwner);
  
  const eventData = new Map<string, string>();
  eventData.set("previousOwner", owner);
  eventData.set("newOwner", newOwner);
  emitEvent("OwnershipTransferred", eventData);
}

export function updateDaoMultisig(argsData: StaticArray<u8>): void {
  const daoMultisig = getString(STORAGE_KEYS.DAO_MULTISIG);
  requireAuth(daoMultisig);
  
  const args = new Args(argsData);
  const newMultisig = args.nextString().expect("New multisig address required");
  
  setString(STORAGE_KEYS.DAO_MULTISIG, newMultisig);
  
  const eventData = new Map<string, string>();
  eventData.set("previousMultisig", daoMultisig);
  eventData.set("newMultisig", newMultisig);
  emitEvent("MultisigUpdated", eventData);
}

export function pause(_: StaticArray<u8>): void {
  const owner = getString(STORAGE_KEYS.OWNER);
  const daoMultisig = getString(STORAGE_KEYS.DAO_MULTISIG);
  const caller = Context.caller().toString();
  
  assert(caller == owner || caller == daoMultisig, ERROR_MESSAGES.UNAUTHORIZED);
  
  Storage.set(stringToBytes(STORAGE_KEYS.PAUSED), new StaticArray<u8>(1));
  
  const eventData = new Map<string, string>();
  eventData.set("paused", "true");
  eventData.set("pausedBy", caller);
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("Paused", eventData);
}

export function unpause(_: StaticArray<u8>): void {
  const daoMultisig = getString(STORAGE_KEYS.DAO_MULTISIG);
  requireAuth(daoMultisig);
  
  Storage.del(stringToBytes(STORAGE_KEYS.PAUSED));
  
  const eventData = new Map<string, string>();
  eventData.set("paused", "false");
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("Unpaused", eventData);
}

export function updateContractAddress(argsData: StaticArray<u8>): void {
  const daoMultisig = getString(STORAGE_KEYS.DAO_MULTISIG);
  requireAuth(daoMultisig);
  
  const args = new Args(argsData);
  const contractType = args.nextString().expect("Contract type required");
  const newAddress = args.nextString().expect("New address required");
  
  let storageKey: string = "";
  if (contractType == "strategy") {
    storageKey = STORAGE_KEYS.STRATEGY_ADDRESS;
  } else if (contractType == "executor") {
    storageKey = STORAGE_KEYS.EXECUTOR_ADDRESS;
  } else if (contractType == "oracle") {
    storageKey = STORAGE_KEYS.ORACLE_ADDRESS;
  } else if (contractType == "dex") {
    storageKey = STORAGE_KEYS.DEX_ADDRESS;
  } else {
    assert(false, "Invalid contract type");
  }
  
  const previousAddress = getString(storageKey);
  setString(storageKey, newAddress);
  
  const eventData = new Map<string, string>();
  eventData.set("contractType", contractType);
  eventData.set("previousAddress", previousAddress);
  eventData.set("newAddress", newAddress);
  emitEvent("ContractUpdated", eventData);
}

export function getOwner(_: StaticArray<u8>): StaticArray<u8> {
  const owner = getString(STORAGE_KEYS.OWNER);
  
  const result = new Args();
  result.add(owner);
  return result.serialize();
}

export function getDaoMultisig(_: StaticArray<u8>): StaticArray<u8> {
  const multisig = getString(STORAGE_KEYS.DAO_MULTISIG);
  
  const result = new Args();
  result.add(multisig);
  return result.serialize();
}

export function isPaused(_: StaticArray<u8>): StaticArray<u8> {
  const paused = Storage.has(stringToBytes(STORAGE_KEYS.PAUSED));
  
  const result = new Args();
  result.add(paused);
  return result.serialize();
}