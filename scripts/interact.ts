import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  Account,
  SmartContract,
  JsonRpcProvider,
  Mas
} from '@massalabs/massa-web3';

async function main() {
  console.log('Step-1 Vault Interaction Script');
  console.log('===============================\n');
  
  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  
  const addressesFile = readFileSync(resolve(process.cwd(), 'addresses.json'), 'utf-8');
  const addresses = JSON.parse(addressesFile);
  
  const vaultContract = new SmartContract(provider, addresses.vault);
  const dexContract = new SmartContract(provider, addresses.dex);
  const oracleContract = addresses.oracle ? new SmartContract(provider, addresses.oracle) : null;
  const governanceContract = addresses.governance ? new SmartContract(provider, addresses.governance) : null;
  const strategyContract = addresses.strategy ? new SmartContract(provider, addresses.strategy) : null;
  const executorContract = addresses.executor ? new SmartContract(provider, addresses.executor) : null;
  
  const action = process.argv[2];
  
  switch (action) {
    case 'deposit': {
      const amount = Mas.fromString(process.argv[3] || '1');
      console.log(`Depositing ${Mas.toString(amount)} MAS...`);
      
      const op = await vaultContract.call(
        'deposit',
        new Uint8Array(0),  // no args needed
        { coins: amount }
      );
      
      await op.waitFinalExecution();
      console.log('✅ Deposit successful!');
      break;
    }
    
    case 'withdraw': {
      const shares = BigInt(process.argv[3] || '100');
      console.log(`Withdrawing ${shares} shares...`);
      
      const sharesBytes = new ArrayBuffer(8);
      new DataView(sharesBytes).setBigUint64(0, shares, true);
      
      const op = await vaultContract.call(
        'withdraw',
        new Uint8Array(sharesBytes)
      );
      
      await op.waitFinalExecution();
      console.log('✅ Withdrawal successful!');
      break;
    }
    
    case 'balance': {
      const user = process.argv[3] || account.address.toString();
      console.log(`Checking balance for ${user}...`);
      
      const userBytes = new TextEncoder().encode(user);
      const result = await vaultContract.read('balanceOf', userBytes);
      
      const shares = new DataView(result.value.buffer).getBigUint64(0, true);
      console.log(`User shares: ${shares}`);
      break;
    }
    
    case 'info': {
      console.log('Fetching all contract information...\n');
      

      const assetsResult = await vaultContract.read('totalAssets', new Uint8Array(0));
      const totalAssets = new DataView(assetsResult.value.buffer).getBigUint64(0, true);

      const priceResult = await dexContract.read('getPrice', new Uint8Array(0));
      const dexPrice = new DataView(priceResult.value.buffer).getBigUint64(0, true);
      
      console.log('=== Contract Information ===');
      console.log(`📊 Vault Total Assets: ${totalAssets}`);
      console.log(`💱 DEX Price: ${Number(dexPrice) / 1_000_000}`);
      
      if (oracleContract) {
        try {
          const oraclePriceResult = await oracleContract.read('getPrice', new Uint8Array(0));
          const oraclePrice = new DataView(oraclePriceResult.value.buffer).getBigUint64(0, true);
          console.log(`🔮 Oracle Price: ${Number(oraclePrice) / 1_000_000}`);
        } catch (e) {
          console.log(`🔮 Oracle: Deployed but not readable`);
        }
      }
      
      if (strategyContract) {
        try {
          const activeResult = await strategyContract.read('isStrategyActive', new Uint8Array(0));
          const isActive = new TextDecoder().decode(activeResult.value);
          console.log(`⚡ Strategy Active: ${isActive}`);
        } catch (e) {
          console.log(`⚡ Strategy: Deployed but not readable`);
        }
      }
      
      console.log('\n=== Contract Addresses ===');
      Object.entries(addresses).forEach(([name, addr]) => {
        console.log(`${name}: ${addr}`);
      });
      break;
    }
    
    case 'swap': {
      const direction = process.argv[3] || 'true';  // true = buy A
      const amountIn = process.argv[4] || '1000000';  // 1M units
      const minOut = process.argv[5] || '900000';     // 0.9M min out
      
      console.log(`Swapping ${amountIn} units (buy A: ${direction})...`);
      
      const swapArgs = `${direction}|${amountIn}|${minOut}`;
      const argsBytes = new TextEncoder().encode(swapArgs);
      
      const op = await dexContract.call(
        'swap',
        argsBytes,
        { coins: Mas.fromString('0.1') }  // some coins for the swap
      );
      
      await op.waitFinalExecution();
      console.log('✅ Swap successful!');
      break;
    }
    
    default: {
      console.log('Usage: npm run interact <command> [args]');
      console.log('\nCommands:');
      console.log('  deposit <amount>        - Deposit MAS into vault');
      console.log('  withdraw <shares>       - Withdraw shares from vault');
      console.log('  balance [address]       - Check user balance');
      console.log('  info                    - Show vault and DEX information');
      console.log('  swap <buy_a> <in> <min> - Execute a swap on DEX');
    }
  }
}

main().catch(error => {
  console.error('❌ Interaction failed:', error);
  process.exit(1);
});