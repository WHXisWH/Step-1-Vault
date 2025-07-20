import React, { useState, useEffect } from "react";
import * as massa from "@massalabs/massa-web3";
import * as wallet from "@massalabs/wallet-provider";
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
      const wallets = await wallet.getWallets();
      const selectedWallet = wallets[0];
      await selectedWallet.connect();
      
      const accounts = await selectedWallet.accounts();
      const account = accounts[0];

      const fn = running ? "stopStrategy" : "startStrategy";
      const opId = await account.callSC({
          targetAddress: addresses.strategy,
          functionName: fn,
          parameter: new massa.Args().serialize(),
          coins: 0n,
          fee: 1000000n,
          maxGas: 1000000n,
      });

      // This part requires a client, which we get from the provider
      const client = new massa.Client({
          providers: [provider],
          periodOffset: null,
      });

      await client.smartContracts().awaitRequiredOperationConfirmation(opId);
      setRunning(!running);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="stats">
          <div className="stat-card">
            <div>Total Value Locked</div>
            <div>{Number(vault.totalAssets) / 1_000_000} MAS</div>
          </div>
          <div className="stat-card">
            <div>Your Balance</div>
            <div>{Number(vault.userShares) / 1_000_000} shares</div>
          </div>
        </div>
        <button onClick={() => setShowDeposit(true)}>Deposit</button>
        <button onClick={() => setShowWithdraw(true)} disabled={vault.userShares === "0"}>
          Withdraw
        </button>
        <button onClick={toggleStrategy} disabled={busy}>
          {busy ? "..." : running ? "Stop Strategy" : "Start Strategy"}
        </button>
        <StrategyChart provider={provider} addresses={addresses} isActive={running} />
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