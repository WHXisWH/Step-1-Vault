import React, { useState, useEffect } from "react";
import * as massa from "@massalabs/massa-web3";
import { getWallets } from "@massalabs/wallet-provider";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";
import StrategyChart from "./StrategyChart";
import { useVault } from "../hooks/useVault";

interface DashboardProps {
  provider: massa.JsonRpcProvider;
  addresses: Record<string, string>;
}

export default function Dashboard({ provider, addresses }: DashboardProps) {
  const vault = useVault(provider, addresses);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => vault.refreshData(), 10_000);
    return () => clearInterval(id);
  }, [vault]);

  const toggleStrategy = async () => {
    if (!addresses.strategy) return;
    setBusy(true);
    try {
      const wallets = await getWallets();
      if (wallets.length === 0) {
        throw new Error("No wallet found");
      }
      
      const selectedWallet = wallets[0];
      await selectedWallet.connect();
      
      const accounts = await selectedWallet.accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }
      
      const account = accounts[0];
      const fn = running ? "stopStrategy" : "startStrategy";
      
      const operation = await account.callSC({
        target: addresses.strategy,
        func: fn,
        parameter: new massa.Args().serialize()
      });

      const status = await operation.waitSpeculativeExecution();
      
      if (status !== massa.OperationStatus.SpeculativeSuccess) {
        throw new Error("Strategy toggle failed");
      }
      
      setRunning(!running);
    } catch (error) {
      console.error('Strategy toggle failed:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Total Value Locked</div>
            <div className="stat-value">{Number(vault.totalAssets) / 1_000_000} MAS</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Your Balance</div>
            <div className="stat-value">{Number(vault.userShares) / 1_000_000} shares</div>
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setShowDeposit(true)}>
            Deposit
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowWithdraw(true)} 
            disabled={vault.userShares === "0"}
          >
            Withdraw
          </button>
          <button 
            className="btn btn-primary" 
            onClick={toggleStrategy} 
            disabled={busy}
          >
            {busy ? "..." : running ? "Stop Strategy" : "Start Strategy"}
          </button>
        </div>

        <div className="section">
          <div className="section-title">Strategy Performance</div>
          <StrategyChart provider={provider} addresses={addresses} isActive={running} />
        </div>

        {showDeposit && (
          <DepositModal
            provider={provider}
            vaultAddress={addresses.vault}
            onClose={() => setShowDeposit(false)}
            onSuccess={() => {
              setShowDeposit(false);
              vault.refreshData();
            }}
          />
        )}
        {showWithdraw && (
          <WithdrawModal
            provider={provider}
            vaultAddress={addresses.vault}
            userShares={vault.userShares}
            sharePrice={vault.sharePrice}
            onClose={() => setShowWithdraw(false)}
            onSuccess={() => {
              setShowWithdraw(false);
              vault.refreshData();
            }}
          />
        )}
      </div>
    </div>
  );
}