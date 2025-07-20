import React, { useState } from "react";
import * as massa from "@massalabs/massa-web3";
import { getWallets } from "@massalabs/wallet-provider";

interface DepositModalProps {
  rpcUrl: string;
  publicApi: string;
  vaultAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

const masToUMas = (v: string): bigint => {
  const [w, f = ""] = v.split(".");
  const frac = (f + "000000000").slice(0, 9);
  return BigInt(w || "0") * 10n ** 9n + BigInt(frac);
};

export default function DepositModal({
  rpcUrl,
  publicApi,
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
      const client = await massa.ClientFactory.createDefaultClient(rpcUrl, publicApi);
      const wallet = (await getWallets())[0];
      await wallet.connect();
      wallet.setClient(client);
      const coins = masToUMas(amount);
      const opId = await client
        .smartContracts()
        .callSmartContract(
          wallet,
          vaultAddress,
          "deposit",
          new massa.Args().addU64(coins),
          coins,
          0n,
          1_000_000n
        );
      await client.publicApi().waitForOperation(opId, 3, 120_000);
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
        <h3>Deposit MAS</h3>
        {error && <div className="error">{error}</div>}
        <input
          type="number"
          min="0"
          step="0.000000001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleDeposit} disabled={loading || !amount}>
          {loading ? "Pending…" : "Deposit"}
        </button>
      </div>
    </div>
  );
}