import { Args, stringToBytes } from "@massalabs/as-types";
import { 
  Storage, 
  Context, 
  generateEvent,
  deferredCallRegister,
  deferredCallQuote,
  findCheapestSlot,
  Slot,
  callContract
} from "@massalabs/massa-as-sdk";
import { 
  STORAGE_KEYS, 
  ERROR_MESSAGES,
  DEFAULT_STRATEGY_INTERVAL,
  DEFAULT_REBALANCE_THRESHOLD,
  GAS_RESERVE
} from "../utils/Constants";
import {
  requireAuth,
  requireNotPaused,
  getU64,
  setU64,
  getString,
  setString,
  emitEvent
} from "../utils/Helpers";

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const owner = args.nextString().expect("Owner address required");
  const oracleAddress = args.nextString().expect("Oracle address required");
  const executorAddress = args.nextString().expect("Executor address required");
  
  setString(STORAGE_KEYS.OWNER, owner);
  setString(STORAGE_KEYS.ORACLE_ADDRESS, oracleAddress);
  setString(STORAGE_KEYS.EXECUTOR_ADDRESS, executorAddress);
  setU64(STORAGE_KEYS.TWAP_THRESHOLD, DEFAULT_REBALANCE_THRESHOLD);
  setU64(STORAGE_KEYS.SIGMA_THRESHOLD, 100);
  setU64(STORAGE_KEYS.STRATEGY_ACTIVE, 0);
}

export function startStrategy(_: StaticArray<u8>): void {
  requireNotPaused();
  const owner = getString(STORAGE_KEYS.OWNER);
  requireAuth(owner);
  
  const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
  assert(isActive == 0, "Strategy already active");
  
  setU64(STORAGE_KEYS.STRATEGY_ACTIVE, 1);
  
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();
  const nextPeriod = currentPeriod + DEFAULT_STRATEGY_INTERVAL;
  const nextSlot = new Slot(nextPeriod, currentThread);
  
  scheduleNextExecution(nextSlot);
  
  const eventData = new Map<string, string>();
  eventData.set("status", "started");
  eventData.set("nextExecution", nextPeriod.toString());
  emitEvent("StrategyStatusChanged", eventData);
}

export function stopStrategy(_: StaticArray<u8>): void {
  const owner = getString(STORAGE_KEYS.OWNER);
  requireAuth(owner);
  
  setU64(STORAGE_KEYS.STRATEGY_ACTIVE, 0);
  
  const eventData = new Map<string, string>();
  eventData.set("status", "stopped");
  emitEvent("StrategyStatusChanged", eventData);
}

export function evaluate(_: StaticArray<u8>): void {
  const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
  if (isActive == 0) {
    return;
  }
  
  const oracleAddress = getString(STORAGE_KEYS.ORACLE_ADDRESS);
  
  const twapResult = callContract(oracleAddress, "getTwap", new StaticArray<u8>(0), 0);
  const twap = new Args(twapResult).nextU64().unwrap();
  
  const sigmaResult = callContract(oracleAddress, "getSigma", new StaticArray<u8>(0), 0);
  const sigma = new Args(sigmaResult).nextU64().unwrap();
  
  const staleResult = callContract(oracleAddress, "isStale", new StaticArray<u8>(0), 0);
  const isStale = new Args(staleResult).nextBool().unwrap();
  
  assert(!isStale, ERROR_MESSAGES.ORACLE_STALE);
  
  const twapThreshold = getU64(STORAGE_KEYS.TWAP_THRESHOLD);
  const sigmaThreshold = getU64(STORAGE_KEYS.SIGMA_THRESHOLD);
  
  let action = "hold";
  let shouldRebalance = false;
  
  if (sigma > sigmaThreshold) {
    shouldRebalance = true;
    action = "rebalance_volatility";
  } else if (twap > twapThreshold * 110 / 100) {
    shouldRebalance = true;
    action = "rebalance_price_up";
  } else if (twap < twapThreshold * 90 / 100) {
    shouldRebalance = true;
    action = "rebalance_price_down";
  }
  
  if (shouldRebalance) {
    const executorAddress = getString(STORAGE_KEYS.EXECUTOR_ADDRESS);
    const rebalanceArgs = new Args();
    rebalanceArgs.add(twap);
    rebalanceArgs.add(sigma);
    rebalanceArgs.add(action);
    
    callContract(executorAddress, "rebalance", rebalanceArgs.serialize(), 0);
  }
  
  const eventData = new Map<string, string>();
  eventData.set("twap", twap.toString());
  eventData.set("sigma", sigma.toString());
  eventData.set("action", action);
  eventData.set("timestamp", Context.timestamp().toString());
  emitEvent("StrategyExecuted", eventData);
  
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();
  const nextPeriod = currentPeriod + DEFAULT_STRATEGY_INTERVAL;
  const nextSlot = new Slot(nextPeriod, currentThread);
  
  scheduleNextExecution(nextSlot);
}

export function updateThresholds(argsData: StaticArray<u8>): void {
  const owner = getString(STORAGE_KEYS.OWNER);
  requireAuth(owner);
  
  const args = new Args(argsData);
  const twapThreshold = args.nextU64().expect("TWAP threshold required");
  const sigmaThreshold = args.nextU64().expect("Sigma threshold required");
  
  setU64(STORAGE_KEYS.TWAP_THRESHOLD, twapThreshold);
  setU64(STORAGE_KEYS.SIGMA_THRESHOLD, sigmaThreshold);
  
  const eventData = new Map<string, string>();
  eventData.set("twapThreshold", twapThreshold.toString());
  eventData.set("sigmaThreshold", sigmaThreshold.toString());
  emitEvent("ThresholdsUpdated", eventData);
}

function scheduleNextExecution(targetSlot: Slot): void {
  const maxGas = 5_000_000;
  const paramsSize = 0;
  
  const startSearch = targetSlot.period;
  const endSearch = targetSlot.period + 100;
  
  const cheapestSlot = findCheapestSlot(
    startSearch,
    endSearch,
    maxGas,
    paramsSize
  );
  
  const quote = deferredCallQuote(cheapestSlot, maxGas, paramsSize);
  
  const balance = Context.balance();
  assert(balance > quote + GAS_RESERVE, "Insufficient balance for next execution");
  
  const callId = deferredCallRegister(
    Context.contractAddress().toString(),
    "evaluate",
    cheapestSlot,
    maxGas,
    new StaticArray<u8>(0),
    quote
  );
  
  setU64(STORAGE_KEYS.NEXT_EXEC_SLOT, cheapestSlot.period);
  
  const eventData = new Map<string, string>();
  eventData.set("callId", callId);
  eventData.set("nextSlot", cheapestSlot.period.toString());
  eventData.set("fee", quote.toString());
  emitEvent("ExecutionScheduled", eventData);
}