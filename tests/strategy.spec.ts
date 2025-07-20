import { Args } from "@massalabs/as-types";
import { Storage, Context } from "@massalabs/massa-as-sdk";
import { 
  constructor,
  startStrategy, 
  stopStrategy, 
  updateThresholds 
} from "../assembly/contracts/StrategyEngine";
import { getU64 } from "../assembly/utils/Helpers";
import { STORAGE_KEYS } from "../assembly/utils/Constants";

describe("StrategyEngine Contract", () => {
  beforeEach(() => {
    Storage.clear();
    
    const constructorArgs = new Args()
      .addString("AS1TestOwner")
      .addString("AS1TestOracle")
      .addString("AS1TestExecutor");
    
    Context.setDeployingContract(true);
    constructor(constructorArgs.serialize());
    Context.setDeployingContract(false);
  });
  
  it("should initialize with correct parameters", () => {
    const twapThreshold = getU64(STORAGE_KEYS.TWAP_THRESHOLD);
    expect(twapThreshold).toBe(500u64);
    
    const sigmaThreshold = getU64(STORAGE_KEYS.SIGMA_THRESHOLD);
    expect(sigmaThreshold).toBe(100u64);
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(0u64);
  });
  
  it("should start strategy correctly", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10_000_000u64);
    Context.setPeriod(1000u64);
    Context.setThread(0u8);
    
    startStrategy(new StaticArray<u8>(0));
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(1u64);
    
    const nextExec = getU64(STORAGE_KEYS.NEXT_EXEC_SLOT);
    expect(nextExec).toBeGreaterThan(1000u64);
  });
  
  it("should stop strategy correctly", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10_000_000u64);
    
    startStrategy(new StaticArray<u8>(0));
    stopStrategy(new StaticArray<u8>(0));
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(0u64);
  });
  
  it("should update thresholds correctly", () => {
    Context.setCaller("AS1TestOwner");
    
    const updateArgs = new Args()
      .addU64(1000u64)
      .addU64(200u64);
    
    updateThresholds(updateArgs.serialize());
    
    const twapThreshold = getU64(STORAGE_KEYS.TWAP_THRESHOLD);
    expect(twapThreshold).toBe(1000u64);
    
    const sigmaThreshold = getU64(STORAGE_KEYS.SIGMA_THRESHOLD);
    expect(sigmaThreshold).toBe(200u64);
  });
  
  it("should prevent unauthorized strategy start", () => {
    Context.setCaller("AS1UnauthorizedUser");
    
    expect(() => {
      startStrategy(new StaticArray<u8>(0));
    }).toThrow();
  });
  
  it("should prevent unauthorized threshold updates", () => {
    Context.setCaller("AS1UnauthorizedUser");
    
    const updateArgs = new Args()
      .addU64(1000u64)
      .addU64(200u64);
    
    expect(() => {
      updateThresholds(updateArgs.serialize());
    }).toThrow();
  });
  
  it("should prevent starting already active strategy", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10_000_000u64);
    
    startStrategy(new StaticArray<u8>(0));
    
    expect(() => {
      startStrategy(new StaticArray<u8>(0));
    }).toThrow();
  });
});