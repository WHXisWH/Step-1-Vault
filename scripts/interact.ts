import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  Account,
  Args,
  SmartContract,
  JsonRpcProvider,
  Mas,
  U128,
  bytesToStr
} from '@massalabs/massa-web3';

async function main() {
  console.log('Step-1 Vault Interaction Script');
  console.log('==============================\n');
  
  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  
  const addresses = JSON.parse(
    readFileSync(resolve(__dirname, '../addresses.json'), 'utf-8')
  );
  
  const vaultContract = new SmartContract(provider, addresses.vault);
  const strategyContract = new SmartContract(provider, addresses.strategy);
  const oracleContract = new SmartContract(provider, addresses.oracle);
  
  const action = process.argv[2];
  
  switch (action) {
    case 'deposit': {
      const amount = Mas.fromString(process.argv[3] || '100');
      console.log(`Depositing ${Mas.toString(amount)} MAS...`);
      
      const op = await vaultContract.call(
        'deposit',
        new Args().addU64(BigInt(amount)),
        { coins: amount }
      );
      
      await op.waitFinalExecution();
      console.log('✅ Deposit successful!');
      break;
    }
    
    case 'withdraw': {
      const shares = BigInt(process.argv[3] || '100');
      console.log(`Withdrawing ${shares} shares...`);
      
      const op = await vaultContract.call(
        'withdraw',
        new Args().addU64(shares)
      );
      
      await op.waitFinalExecution();
      console.log('✅ Withdrawal successful!');
      break;
    }
    
    case 'start-strategy': {
      console.log('Starting automated strategy...');
      
      const op = await strategyContract.call(
        'startStrategy',
        new Args().serialize()
      );
      
      await op.waitFinalExecution();
      console.log('✅ Strategy started!');
      break;
    }
    
    case 'stop-strategy': {
      console.log('Stopping automated strategy...');
      
      const op = await strategyContract.call(
        'stopStrategy',
        new Args().serialize()
      );
      
      await op.waitFinalExecution();
      console.log('✅ Strategy stopped!');
      break;
    }
    
    case 'info': {
      console.log('Fetching vault information...\n');
      
      const totalAssetsResult = await vaultContract.read('totalAssets');
      const totalAssets = new Args(totalAssetsResult.value).nextU128().unwrap();
      
      const totalSharesResult = await vaultContract.read('totalShares');
      const totalShares = new Args(totalSharesResult.value).nextU128().unwrap();
      
      const sharePriceResult = await vaultContract.read('sharePrice');
      const sharePrice = new Args(sharePriceResult.value).nextU64().unwrap();
      
      const twapResult = await oracleContract.read('getTwap');
      const twap = new Args(twapResult.value).nextU64().unwrap();
      
      console.log('Vault Information:');
      console.log('==================');
      console.log(`Total Assets: ${totalAssets.toString()}`);
      console.log(`Total Shares: ${totalShares.toString()}`);
      console.log(`Share Price: ${Number(sharePrice) / 1_000_000}`);
      console.log(`Current TWAP: ${Number(twap) / 1_000_000}`);
      break;
    }
    
    case 'balance': {
      const user = process.argv[3] || account.address.toString();
      console.log(`Checking balance for ${user}...\n`);
      
      const sharesResult = await vaultContract.read(
        'balanceOfShares',
        new Args().addString(user)
      );
      const shares = new Args(sharesResult.value).nextU128().unwrap();
      
      console.log(`User Shares: ${shares.toString()}`);
      
      if (shares > U128.Zero) {
        const totalAssetsResult = await vaultContract.read('totalAssets');
        const totalAssets = new Args(totalAssetsResult.value).nextU128().unwrap();
        
        const totalSharesResult = await vaultContract.read('totalShares');
        const totalShares = new Args(totalSharesResult.value).nextU128().unwrap();
        
        const userValue = shares.mul(totalAssets).div(totalShares);
        console.log(`Estimated Value: ${userValue.toString()}`);
      }
      break;
    }
    
    case 'simulate-price': {
      if (!addresses.dex) {
        console.error('❌ DEX not deployed in production mode');
        break;
      }
      
      const direction = process.argv[3] || 'up';
      const magnitude = BigInt(process.argv[4] || '10');
      
      console.log(`Simulating price movement ${direction} by ${magnitude}%...`);
      
      const dexContract = new SmartContract(provider, addresses.dex);
      
      const swapAmount = 1_000_000n;
      const isBuyingA = direction === 'up';
      
      const op = await dexContract.call(
        'swap',
        new Args()
          .addBool(isBuyingA)
          .addU64(swapAmount)
          .addU64(0n),
        { coins: Mas.fromString('1') }
      );
      
      await op.waitFinalExecution();
      console.log('✅ Price simulation complete!');
      break;
    }
    
    default: {
      console.log('Usage: npm run interact <command> [args]');
      console.log('\nCommands:');
      console.log('  deposit <amount>     - Deposit MAS into vault');
      console.log('  withdraw <shares>    - Withdraw shares from vault');
      console.log('  start-strategy       - Start automated strategy');
      console.log('  stop-strategy        - Stop automated strategy');
      console.log('  info                 - Show vault information');
      console.log('  balance [address]    - Check user balance');
      console.log('  simulate-price <up|down> [%] - Simulate price movement (dev only)');
    }
  }
}

main().catch(error => {
  console.error('Interaction failed:', error);
  process.exit(1);
});