export async function loadAddresses(): Promise<Record<string, string>> {
  
  const envAddresses = {
    vault: (import.meta as any).env?.VITE_VAULT_ADDRESS || '',
    oracle: (import.meta as any).env?.VITE_ORACLE_ADDRESS || '',
    strategy: (import.meta as any).env?.VITE_STRATEGY_ADDRESS || '',
    executor: (import.meta as any).env?.VITE_EXECUTOR_ADDRESS || '',
    governance: (import.meta as any).env?.VITE_GOVERNANCE_ADDRESS || '',
    dex: (import.meta as any).env?.VITE_DEX_ADDRESS || ''
  };

  const hasEnvAddresses = Object.values(envAddresses).some(addr => addr !== '');
  if (hasEnvAddresses) {
    console.log('Loading addresses from environment variables');
    return envAddresses;
  }

  try {
    const response = await fetch('/addresses.json');
    if (!response.ok) {
      console.warn('addresses.json not found, using empty addresses');
      return envAddresses;
    }
    const fileAddresses = await response.json();
    console.log('Loading addresses from addresses.json');
    return fileAddresses;
  } catch (error) {
    console.error('Failed to load addresses:', error);
    return envAddresses;
  }
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(amount: bigint | string, decimals: number = 6): string {
  const value = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const decimal = remainder.toString().padStart(decimals, '0');
  const trimmed = decimal.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

export function parseAmount(amount: string, decimals: number = 6): bigint {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedDecimal);
}

export function calculateAPY(
  currentPrice: number, 
  initialPrice: number, 
  daysElapsed: number
): number {
  if (initialPrice === 0 || daysElapsed === 0) return 0;
  
  const totalReturn = (currentPrice - initialPrice) / initialPrice;
  const annualizedReturn = totalReturn * (365 / daysElapsed);
  
  return annualizedReturn * 100;
}
