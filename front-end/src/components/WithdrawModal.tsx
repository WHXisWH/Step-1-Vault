import React, { useState } from "react";
import * as massa from "@massalabs/massa-web3";
import { getWallets } from "@massalabs/wallet-provider";

interface WithdrawModalProps {
  rpcUrl: string;
  publicApi: string;
  vaultAddress: string;
  userShares: string;
  sharePrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WithdrawModal({
  rpcUrl,
  publicApi,
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
      const client = await massa.ClientFactory.createDefaultClient(rpcUrl, publicApi);
      const wallet = (await getWallets())[0];
      await wallet.connect();
      wallet.setClient(client);
      const withdrawShares = BigInt(Math.floor(parseFloat(shares) * 1_000_000));
      const opId = await client
        .smartContracts()
        .callSmartContract(
          wallet,
          vaultAddress,
          "withdraw",
          new massa.Args().addU64(withdrawShares),
          0n,
          0n,
          1_000_000n
        );
      await client.publicApi().waitForOperation(opId, 3, 120_000);
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
        <h3>Withdraw from Vault</h3>
        {error && <div className="error-message">{error}</div>}
        <label>
          Shares to Withdraw
          <button onClick={() => setShares(maxShares.toString())}>MAX</button>
        </label>
        <input
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          disabled={loading}
        />
        <div>~{estimatedMAS} MAS</div>
        <button onClick={handleWithdraw} disabled={loading || !shares}>
          {loading ? "Pending…" : "Withdraw"}
        </button>
      </div>
    </div>
  );
}