import { Args, u128 } from "@massalabs/as-types";
import { Storage, Context } from "@massalabs/massa-as-sdk";
import { deposit, withdraw, balanceOfShares, totalAssets, totalShares } from "../assembly/contracts/Vault";

describe("Vault Contract", () => {
  beforeEach(() => {
    Storage.clear();
    
    const constructorArgs = new Args()
      .addString("AS1TestOwner")
      .addString("AS1TestStrategy")
      .addString("AS1TestExecutor");
    
    Context.setDeployingContract(true);
    constructor(constructorArgs.serialize());
    Context.setDeployingContract(false);
  });
  
  it("should handle deposits correctly", () => {
    const depositAmount = 1000000;
    Context.setCaller("AS1TestUser");
    Context.setBalance(10000000);
    
    const depositArgs = new Args().addU64(depositAmount);
    const result = deposit(depositArgs.serialize());
    
    const shares = new Args(result).nextU64();
    expect(shares).toBe(depositAmount);
    
    const totalAssetsResult = totalAssets(new StaticArray<u8>(0));
    const totalAssetsValue = new Args(totalAssetsResult).nextU128();
    expect(totalAssetsValue).toBe(u128.from(depositAmount));
    
    const userSharesArgs = new Args().addString("AS1TestUser");
    const userSharesResult = balanceOfShares(userSharesArgs.serialize());
    const userShares = new Args(userSharesResult).nextU128();
    expect(userShares).toBe(u128.from(depositAmount));
  });
  
  it("should handle withdrawals correctly", () => {
    const depositAmount = 1000000;
    Context.setCaller("AS1TestUser");
    Context.setBalance(10000000);
    
    const depositArgs = new Args().addU64(depositAmount);
    deposit(depositArgs.serialize());
    
    const withdrawAmount = 500000;
    const withdrawArgs = new Args().addU64(withdrawAmount);
    const result = withdraw(withdrawArgs.serialize());
    
    const assets = new Args(result).nextU64();
    expect(assets).toBe(withdrawAmount);
    
    const totalAssetsResult = totalAssets(new StaticArray<u8>(0));
    const totalAssetsValue = new Args(totalAssetsResult).nextU128();
    expect(totalAssetsValue).toBe(u128.from(depositAmount - withdrawAmount));
    
    const userSharesArgs = new Args().addString("AS1TestUser");
    const userSharesResult = balanceOfShares(userSharesArgs.serialize());
    const userShares = new Args(userSharesResult).nextU128();
    expect(userShares).toBe(u128.from(depositAmount - withdrawAmount));
  });
  
  it("should calculate share price correctly", () => {
    Context.setCaller("AS1TestUser1");
    Context.setBalance(10000000);
    
    const deposit1 = new Args().addU64(1000000);
    deposit(deposit1.serialize());
    
    const syncArgs = new Args().addU128(u128.from(1200000));
    Context.setCaller("AS1TestExecutor");
    sync(syncArgs.serialize());
    
    Context.setCaller("AS1TestUser2");
    Context.setBalance(10000000);
    
    const deposit2 = new Args().addU64(1000000);
    const result = deposit(deposit2.serialize());
    
    const shares = new Args(result).nextU64();
    expect(shares).toBeLessThan(1000000);
    expect(shares).toBeGreaterThan(800000);
  });
  
  it("should prevent unauthorized sync", () => {
    Context.setCaller("AS1UnauthorizedUser");
    
    const syncArgs = new Args().addU128(u128.from(1000000));
    
    expect(() => {
      sync(syncArgs.serialize());
    }).toThrow();
  });
  
  it("should handle zero deposits", () => {
    Context.setCaller("AS1TestUser");
    Context.setBalance(10000000);
    
    const depositArgs = new Args().addU64(0);
    
    expect(() => {
      deposit(depositArgs.serialize());
    }).toThrow();
  });
  
  it("should handle insufficient balance", () => {
    Context.setCaller("AS1TestUser");
    Context.setBalance(100);
    
    const depositArgs = new Args().addU64(1000000);
    
    expect(() => {
      deposit(depositArgs.serialize());
    }).toThrow();
  });
});