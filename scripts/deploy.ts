import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  Account,
  SmartContract,
  JsonRpcProvider,
  Mas
} from '@massalabs/massa-web3';

async function main() {
  console.log('Step-1 Vault Deployment Script');
  console.log('==============================');
  

  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  
  console.log(`Deploying from account: ${account.address.toString()}`);
  

  const balance = await provider.balance(true);
  console.log(`Account balance: ${Mas.toString(balance)} MAS`);
  
  const addresses: Record<string, string> = {};
  

  console.log('\nDeploying Vault contract...');
  const vaultBytecode = readFileSync('./build/Vault.wasm');
  
  try {
    const vaultContract = await SmartContract.deploy(
      provider,
      vaultBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.vault = vaultContract.address;
    console.log(`✅ Vault deployed at: ${addresses.vault}`);
  } catch (error) {
    console.error('Failed to deploy Vault:', error);
    throw error;
  }
  

  console.log('\nDeploying PriceOracle contract...');
  const oracleBytecode = readFileSync('./build/PriceOracle.wasm');
  
  try {
    const oracleContract = await SmartContract.deploy(
      provider,
      oracleBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.oracle = oracleContract.address;
    console.log(`✅ PriceOracle deployed at: ${addresses.oracle}`);
  } catch (error) {
    console.error('Failed to deploy PriceOracle:', error);
    throw error;
  }


  console.log('\nDeploying Governance contract...');
  const governanceBytecode = readFileSync('./build/Governance.wasm');
  
  try {
    const governanceContract = await SmartContract.deploy(
      provider,
      governanceBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.governance = governanceContract.address;
    console.log(`✅ Governance deployed at: ${addresses.governance}`);
  } catch (error) {
    console.error('Failed to deploy Governance:', error);
    throw error;
  }


  console.log('\nDeploying StrategyEngine contract...');
  const strategyBytecode = readFileSync('./build/StrategyEngine.wasm');
  
  try {
    const strategyContract = await SmartContract.deploy(
      provider,
      strategyBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.strategy = strategyContract.address;
    console.log(`✅ StrategyEngine deployed at: ${addresses.strategy}`);
  } catch (error) {
    console.error('Failed to deploy StrategyEngine:', error);
    throw error;
  }


  console.log('\nDeploying TradeExecutor contract...');
  const executorBytecode = readFileSync('./build/TradeExecutor.wasm');
  
  try {
    const executorContract = await SmartContract.deploy(
      provider,
      executorBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.executor = executorContract.address;
    console.log(`✅ TradeExecutor deployed at: ${addresses.executor}`);
  } catch (error) {
    console.error('Failed to deploy TradeExecutor:', error);
    throw error;
  }
  console.log('\nDeploying SimpleDEX contract...');
  const dexBytecode = readFileSync('./build/SimpleDEX.wasm');
  
  try {
    const dexContract = await SmartContract.deploy(
      provider,
      dexBytecode,
      new Uint8Array(0),
      {
        coins: Mas.fromString('1'),
        fee: Mas.fromString('0.01')
      }
    );
    
    addresses.dex = dexContract.address;
    console.log(`✅ SimpleDEX deployed at: ${addresses.dex}`);
  } catch (error) {
    console.error('Failed to deploy SimpleDEX:', error);
    throw error;
  }
  

  writeFileSync(
    resolve(process.cwd(), 'addresses.json'),
    JSON.stringify(addresses, null, 2)
  );
  
  console.log('\n✅ Deployment complete!');
  console.log('\nContract addresses saved to addresses.json:');
  console.log(JSON.stringify(addresses, null, 2));
  
  console.log('\n📝 Next steps:');
  console.log('1. Test contracts: npm run interact info');
  console.log('2. Make a deposit: npm run interact deposit 1');
}

main().catch(error => {
  console.error('❌ Deployment failed:', error);
  console.error('\n💡 Troubleshooting tips:');
  console.error('1. Check if your PRIVATE_KEY is correct in .env file');
  console.error('2. Make sure you have enough MAS for deployment fees');
  console.error('3. Check the contract bytecode exists in build/ directory');
  process.exit(1);
});