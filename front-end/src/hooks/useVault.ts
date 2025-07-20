import { useState, useEffect, useCallback } from 'react';
import * as massa from '@massalabs/massa-web3';

interface VaultData {
  totalAssets: string;
  totalShares: string;
  userShares: string;
  sharePrice: number;
  twap: number;
  message: { type: 'success' | 'error'; text: string } | null;
}

export function useVault(provider: massa.JsonRpcProvider, addresses: Record<string, string>) {
  const [data, setData] = useState<VaultData>({
    totalAssets: '0',
    totalShares: '0',
    userShares: '0',
    sharePrice: 1,
    twap: 0,
    message: null
  });

  const refreshData = useCallback(async () => {
    if (!addresses.vault || !provider) return;

    try {
      const vaultContract = new massa.SmartContract(provider, addresses.vault);
      const userAddress = provider.address;

      const [totalAssetsResult, userSharesResult] = await Promise.all([
        vaultContract.read('totalAssets'),
        vaultContract.read('balanceOf', new massa.Args().addString(userAddress).serialize())
      ]);

      const totalAssets = new massa.Args(totalAssetsResult.value).nextU64();
      const userShares = new massa.Args(userSharesResult.value).nextU64();

      let twap = 0;
      if (addresses.oracle) {
        try {
          const oracleContract = new massa.SmartContract(provider, addresses.oracle);
          const twapResult = await oracleContract.read('getTwap');
          const twapValue = new massa.Args(twapResult.value).nextU64();
          twap = Number(twapValue) / 1_000_000;
        } catch (error) {
          console.error('Failed to fetch TWAP:', error);
        }
      }

      setData(prev => ({
        ...prev,
        totalAssets: totalAssets.toString(),
        totalShares: totalAssets.toString(),
        userShares: userShares.toString(),
        sharePrice: 1,
        twap
      }));
    } catch (error) {
      console.error('Failed to refresh vault data:', error);
      setMessage({ type: 'error', text: 'Failed to fetch vault data' });
    }
  }, [provider, addresses]);

  const setMessage = useCallback((message: VaultData['message']) => {
    setData(prev => ({ ...prev, message }));
    if (message) {
      setTimeout(() => {
        setData(prev => ({ ...prev, message: null }));
      }, 5000);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    ...data,
    refreshData,
    setMessage
  };
}