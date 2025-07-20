import React, { useState } from "react";
import * as massa from "@massalabs/massa-web3";
import { getWallets } from "@massalabs/wallet-provider";

interface DepositModalProps {
  provider: massa.JsonRpcProvider;
  vaultAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepositModal({
  provider,
  vaultAddress,
  onClose,
  onSuccess
}: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    
    try {
      const wallets = await getWallets();
      if (wallets.length === 0) {
        throw new Error("No wallet found");
      }

      const wallet = wallets[0];
      await wallet.connect();
      
      const accounts = await wallet.accounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const account = accounts[0];
      const coins = massa.Mas.fromString(amount);
      
      console.log("Calling contract:", { vaultAddress, coins: massa.Mas.toString(coins) });
      
      const operation = await account.callSC({
        target: vaultAddress,
        func: "deposit",
        parameter: new massa.Args().serialize(),
        coins: coins
      });

      console.log("Operation result:", operation);

      const status = await operation.waitSpeculativeExecution();
      
      if (status !== massa.OperationStatus.SpeculativeSuccess) {
        throw new Error("Transaction failed");
      }
      
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Deposit MAS</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="input-group">
          <label>Amount (MAS)</label>
          <input
            type="number"
            min="0"
            step="0.000000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            placeholder="Enter amount to deposit"
          />
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleDeposit} 
          disabled={loading || !amount}
        >
          {loading ? "Processing..." : "Deposit"}
        </button>
      </div>
    </div>
  );
}