import React, { useState } from "react";
import * as massa from "@massalabs/massa-web3";
import { getWallets } from "@massalabs/wallet-provider";

interface WithdrawModalProps {
  provider: massa.JsonRpcProvider;
  vaultAddress: string;
  userShares: string;
  sharePrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WithdrawModal({
  provider,
  vaultAddress,
  userShares,
  sharePrice,
  onClose,
  onSuccess
}: WithdrawModalProps) {
  const [shares, setShares] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maxShares = Number(userShares) / 1_000_000;
  const estimatedMAS = shares ? (parseFloat(shares) * sharePrice).toFixed(6) : "0";

  const handleWithdraw = async () => {
    if (!shares || parseFloat(shares) <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (parseFloat(shares) > maxShares) {
      setError("Insufficient shares");
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
      const withdrawShares = BigInt(Math.floor(parseFloat(shares) * 1_000_000));
      
      const operation = await account.callSC({
        target: vaultAddress,
        func: "withdraw",
        parameter: new massa.Args().addU64(withdrawShares).serialize()
      });

      const status = await operation.waitSpeculativeExecution();
      
      if (status !== massa.OperationStatus.SpeculativeSuccess) {
        throw new Error("Transaction failed");
      }
      
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Withdraw from Vault</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="input-group">
          <label>
            Shares to Withdraw
            <button 
              className="btn btn-secondary" 
              style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setShares(maxShares.toString())}
            >
              MAX
            </button>
          </label>
          <input
            type="number"
            min="0"
            max={maxShares}
            step="0.000001"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            disabled={loading}
            placeholder={`Max: ${maxShares} shares`}
          />
        </div>
        
        <div style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          Estimated return: ~{estimatedMAS} MAS
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleWithdraw} 
          disabled={loading || !shares}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
      </div>
    </div>
  );
}