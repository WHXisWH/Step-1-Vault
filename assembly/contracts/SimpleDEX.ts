import { Args, stringToBytes, u128 } from "@massalabs/as-types";
import { 
  Storage, 
  Context, 
  generateEvent,
  transferCoins,
  asyncCall,
  Slot
} from "@massalabs/massa-as-sdk";
import { emitEvent } from "../utils/Helpers";

const RESERVE_A_KEY = "RA";
const RESERVE_B_KEY = "RB";
const ORACLE_ADDRESS_KEY = "ORC";
const K_CONSTANT_KEY = "K";

export function constructor(argsData: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), "Constructor can only be called during deployment");
  
  const args = new Args(argsData);
  const oracleAddress = args.nextString().expect("Oracle address required");
  const initialReserveA = args.nextU128().expect("Initial reserve A required");
  const initialReserveB = args.nextU128().expect("Initial reserve B required");
  
  Storage.set(stringToBytes(ORACLE_ADDRESS_KEY), stringToBytes(oracleAddress));
  
  const reserveArgs = new Args();
  reserveArgs.add(initialReserveA);
  Storage.set(stringToBytes(RESERVE_A_KEY), reserveArgs.serialize());
  
  reserveArgs.clear();
  reserveArgs.add(initialReserveB);
  Storage.set(stringToBytes(RESERVE_B_KEY), reserveArgs.serialize());
  
  const k = initialReserveA.mul(initialReserveB);
  const kArgs = new Args();
  kArgs.add(k);
  Storage.set(stringToBytes(K_CONSTANT_KEY), kArgs.serialize());
}

export function swap(argsData: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(argsData);
  const isBuyingA = args.nextBool().expect("Direction required");
  const amountIn = args.nextU64().expect("Amount in required");
  const minAmountOut = args.nextU64().expect("Min amount out required");
  
  const reserveAData = Storage.get(stringToBytes(RESERVE_A_KEY));
  const reserveA = new Args(reserveAData).nextU128().unwrap();
  
  const reserveBData = Storage.get(stringToBytes(RESERVE_B_KEY));
  const reserveB = new Args(reserveBData).nextU128().unwrap();
  
  let amountOut: u64;
  let newReserveA: u128;
  let newReserveB: u128;
  
  if (isBuyingA) {
    const amountInWithFee = u128.from(amountIn).mul(u128.from(997));
    const numerator = amountInWithFee.mul(reserveA);
    const denominator = reserveB.mul(u128.from(1000)).add(amountInWithFee);
    amountOut = numerator.div(denominator).toU64();
    
    assert(amountOut >= minAmountOut, "Insufficient output amount");
    
    newReserveA = reserveA.sub(u128.from(amountOut));
    newReserveB = reserveB.add(u128.from(amountIn));
  } else {
    const amountInWithFee = u128.from(amountIn).mul(u128.from(997));
    const numerator = amountInWithFee.mul(reserveB);
    const denominator = reserveA.mul(u128.from(1000)).add(amountInWithFee);
    amountOut = numerator.div(denominator).toU64();
    
    assert(amountOut >= minAmountOut, "Insufficient output amount");
    
    newReserveA = reserveA.add(u128.from(amountIn));
    newReserveB = reserveB.sub(u128.from(amountOut));
  }
  
  const newReserveAArgs = new Args();
  newReserveAArgs.add(newReserveA);
  Storage.set(stringToBytes(RESERVE_A_KEY), newReserveAArgs.serialize());
  
  const newReserveBArgs = new Args();
  newReserveBArgs.add(newReserveB);
  Storage.set(stringToBytes(RESERVE_B_KEY), newReserveBArgs.serialize());
  
  const price = calculatePrice(newReserveA, newReserveB);
  updateOracle(price);
  
  const eventData = new Map<string, string>();
  eventData.set("direction", isBuyingA ? "buyA" : "sellA");
  eventData.set("amountIn", amountIn.toString());
  eventData.set("amountOut", amountOut.toString());
  eventData.set("price", price.toString());
  emitEvent("Swap", eventData);
  
  const result = new Args();
  result.add(amountOut);
  return result.serialize();
}

export function addLiquidity(argsData: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(argsData);
  const amountA = args.nextU128().expect("Amount A required");
  const amountB = args.nextU128().expect("Amount B required");
  
  const reserveAData = Storage.get(stringToBytes(RESERVE_A_KEY));
  const reserveA = new Args(reserveAData).nextU128().unwrap();
  
  const reserveBData = Storage.get(stringToBytes(RESERVE_B_KEY));
  const reserveB = new Args(reserveBData).nextU128().unwrap();
  
  const ratio = reserveA.mul(u128.from(1000)).div(reserveB);
  const inputRatio = amountA.mul(u128.from(1000)).div(amountB);
  
  assert(
    ratio.sub(u128.from(10)) <= inputRatio && inputRatio <= ratio.add(u128.from(10)),
    "Invalid liquidity ratio"
  );
  
  const newReserveA = reserveA.add(amountA);
  const newReserveB = reserveB.add(amountB);
  
  const newReserveAArgs = new Args();
  newReserveAArgs.add(newReserveA);
  Storage.set(stringToBytes(RESERVE_A_KEY), newReserveAArgs.serialize());
  
  const newReserveBArgs = new Args();
  newReserveBArgs.add(newReserveB);
  Storage.set(stringToBytes(RESERVE_B_KEY), newReserveBArgs.serialize());
  
  const lpTokens = sqrt(amountA.mul(amountB));
  
  const eventData = new Map<string, string>();
  eventData.set("amountA", amountA.toString());
  eventData.set("amountB", amountB.toString());
  eventData.set("lpTokens", lpTokens.toString());
  emitEvent("LiquidityAdded", eventData);
  
  const result = new Args();
  result.add(lpTokens);
  return result.serialize();
}

export function getReserves(_: StaticArray<u8>): StaticArray<u8> {
  const reserveAData = Storage.get(stringToBytes(RESERVE_A_KEY));
  const reserveA = new Args(reserveAData).nextU128().unwrap();
  
  const reserveBData = Storage.get(stringToBytes(RESERVE_B_KEY));
  const reserveB = new Args(reserveBData).nextU128().unwrap();
  
  const result = new Args();
  result.add(reserveA);
  result.add(reserveB);
  return result.serialize();
}

export function getPrice(_: StaticArray<u8>): StaticArray<u8> {
  const reserveAData = Storage.get(stringToBytes(RESERVE_A_KEY));
  const reserveA = new Args(reserveAData).nextU128().unwrap();
  
  const reserveBData = Storage.get(stringToBytes(RESERVE_B_KEY));
  const reserveB = new Args(reserveBData).nextU128().unwrap();
  
  const price = calculatePrice(reserveA, reserveB);
  
  const result = new Args();
  result.add(price);
  return result.serialize();
}

function calculatePrice(reserveA: u128, reserveB: u128): u64 {
  return reserveB.mul(u128.from(1_000_000)).div(reserveA).toU64();
}

function updateOracle(price: u64): void {
  const oracleData = Storage.get(stringToBytes(ORACLE_ADDRESS_KEY));
  const oracleAddress = new Args(oracleData).nextString().unwrap();
  
  const updateArgs = new Args();
  updateArgs.add(price);
  
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();
  const targetSlot = new Slot(currentPeriod + 1, currentThread);
  
  asyncCall(
    oracleAddress,
    "update",
    targetSlot,
    new Slot(currentPeriod + 10, currentThread),
    1_000_000,
    0,
    updateArgs.serialize(),
    0
  );
}

function sqrt(n: u128): u128 {
  if (n == u128.Zero) return u128.Zero;
  
  let x = n;
  let y = x.add(u128.One).div(u128.from(2));
  
  while (y < x) {
    x = y;
    y = x.add(n.div(x)).div(u128.from(2));
  }
  
  return x;
}