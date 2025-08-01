import { useState, useEffect } from 'react';
import * as massa from '@massalabs/massa-web3';
import { getWallets } from '@massalabs/wallet-provider';
import Dashboard from './components/Dashboard';
import { loadAddresses } from './utils/massa';

interface AppState {
  provider: any | null;
  account: massa.Account | null;
  wallet: any;
  addresses: Record<string, string>;
  balance: string;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

function App() {
  const [state, setState] = useState<AppState>({
    provider: null,
    account: null,
    wallet: null,
    addresses: {},
    balance: '0',
    isConnected: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const addresses = await loadAddresses();
      setState(prev => ({ ...prev, addresses, isLoading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to load contract addresses', 
        isLoading: false 
      }));
    }
  };

  const connectWallet = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const wallets = await getWallets();
      
      if (wallets.length === 0) {
        throw new Error('No wallet found. Please install MassaStation or Bearby.');
      }
      
      const selectedWallet = wallets[0];
      const connected = await selectedWallet.connect();
      
      if (!connected) {
        throw new Error('Failed to connect to wallet');
      }
      
      const accounts = await selectedWallet.accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }
      
      const provider = accounts[0];
      const balance = await provider.balance(true);
      
      setState(prev => ({
        ...prev,
        provider,
        wallet: selectedWallet,
        balance: massa.Mas.toString(balance),
        isConnected: true,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      
      try {
        if (process.env.NODE_ENV === 'development' && (import.meta as any).env?.VITE_PRIVATE_KEY) {
          const account = await massa.Account.fromEnv();
          const provider = massa.JsonRpcProvider.buildnet(account);
          const balance = await provider.balance(true);
          
          setState(prev => ({
            ...prev,
            provider,
            account,
            balance: massa.Mas.toString(balance),
            isConnected: true,
            isLoading: false
          }));
        } else {
          throw new Error('No wallet found and no private key configured');
        }
      } catch (envError) {
        setState(prev => ({
          ...prev,
          error: 'Failed to connect wallet. Please install a wallet or configure private key.',
          isLoading: false
        }));
      }
    }
  };

  const disconnectWallet = async () => {
    if (state.wallet) {
      await state.wallet.disconnect();
    }
    
    setState(prev => ({
      ...prev,
      provider: null,
      account: null,
      wallet: null,
      balance: '0',
      isConnected: false
    }));
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <div className="logo">Step-1 Vault</div>
            <div className="wallet-info">
              {state.isConnected && (
                <div className="balance">
                  Balance: {state.balance} MAS
                </div>
              )}
              <button
                className={`btn ${state.isConnected ? 'btn-secondary' : 'btn-primary'}`}
                onClick={state.isConnected ? disconnectWallet : connectWallet}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <span className="loading-spinner"></span>
                ) : state.isConnected ? (
                  'Disconnect'
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {!state.isConnected ? (
          <div className="hero">
            <div className="container">
              <h1>Autonomous DeFi on Massa</h1>
              <p>
                Experience the future of decentralized finance with self-running strategies, 
                on-chain execution, and unstoppable frontend hosting.
              </p>
              {state.error && (
                <div className="error-message">{state.error}</div>
              )}
              <button 
                className="btn btn-primary" 
                onClick={connectWallet}
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Loading...' : 'Get Started'}
              </button>
            </div>
          </div>
        ) : (
          <Dashboard 
            provider={state.provider} 
            addresses={state.addresses}
          />
        )}
      </main>
    </div>
  );
}

export default App;
