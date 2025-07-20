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
    expect(twapThreshold).toBe(500);
    
    const sigmaThreshold = getU64(STORAGE_KEYS.SIGMA_THRESHOLD);
    expect(sigmaThreshold).toBe(100);
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(0);
  });
  
  it("should start strategy correctly", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10000000);
    Context.setPeriod(1000);
    Context.setThread(0);
    
    startStrategy(new StaticArray<u8>(0));
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(1);
    
    const nextExec = getU64(STORAGE_KEYS.NEXT_EXEC_SLOT);
    expect(nextExec).toBeGreaterThan(1000);
  });
  
  it("should stop strategy correctly", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10000000);
    
    startStrategy(new StaticArray<u8>(0));
    stopStrategy(new StaticArray<u8>(0));
    
    const isActive = getU64(STORAGE_KEYS.STRATEGY_ACTIVE);
    expect(isActive).toBe(0);
  });
  
  it("should update thresholds correctly", () => {
    Context.setCaller("AS1TestOwner");
    
    const updateArgs = new Args()
      .addU64(1000)
      .addU64(200);
    
    updateThresholds(updateArgs.serialize());
    
    const twapThreshold = getU64(STORAGE_KEYS.TWAP_THRESHOLD);
    expect(twapThreshold).toBe(1000);
    
    const sigmaThreshold = getU64(STORAGE_KEYS.SIGMA_THRESHOLD);
    expect(sigmaThreshold).toBe(200);
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
      .addU64(1000)
      .addU64(200);
    
    expect(() => {
      updateThresholds(updateArgs.serialize());
    }).toThrow();
  });
  
  it("should prevent starting already active strategy", () => {
    Context.setCaller("AS1TestOwner");
    Context.setBalance(10000000);
    
    startStrategy(new StaticArray<u8>(0));
    
    expect(() => {
      startStrategy(new StaticArray<u8>(0));
    }).toThrow();
  });
});