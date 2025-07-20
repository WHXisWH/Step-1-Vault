import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  Account,
  Args,
  SmartContract,
  JsonRpcProvider,
  Mas,
  U128
} from '@massalabs/massa-web3';

const DEPLOY_CONFIG = {
  gasLimit: 10_000_000n,
  coins: Mas.fromString('1'),
  fee: Mas.fromString('0.01')
};

async function deployContract(
  provider: JsonRpcProvider,
  contractName: string,
  constructorArgs: Args
): Promise<string> {
  console.log(`\nDeploying ${contractName}...`);
  
  const wasmPath = resolve(__dirname, `../build/contracts/${contractName}.wasm`);
  const bytecode = readFileSync(wasmPath);
  
  const op = await SmartContract.deploy(
    provider,
    bytecode,
    constructorArgs,
    DEPLOY_CONFIG
  );

  await op.waitFinalExecution();
  
  console.log(`${contractName} deployed at: ${op.getDeployedAddress()}`);
  return op.getDeployedAddress();
}

async function main() {
  console.log('Step-1 Vault Deployment Script');
  console.log('==============================');
  
  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);
  
  console.log(`Deploying from account: ${account.address.toString()}`);
  
  const balance = await provider.balance(true);
  console.log(`Account balance: ${Mas.toString(balance)} MAS`);
  
  const addresses: Record<string, string> = {};
  const isDev = process.env.DEV_MODE === 'true';
  
  const temporaryOwner = account.address.toString();
  const temporaryMultisig = account.address.toString();
  const initialPrice = 1_000_000n;
  
  if (isDev) {
    addresses.oracle = await deployContract(
      provider,
      'PriceOracle',
      new Args()
        .addString(temporaryOwner)
        .addU64(initialPrice)
    );
    
    addresses.dex = await deployContract(
      provider,
      'SimpleDEX',
      new Args()
        .addString(addresses.oracle)
        .addU128(U128.from(1_000_000_000n)) 
        .addU128(U128.from(1_000_000_000n))
    );
    
    const oracleContract = new SmartContract(provider, addresses.oracle);
    const op = await oracleContract.call('constructor', 
      new Args()
        .addString(addresses.dex)
        .addU64(initialPrice)
    );
    await op.waitFinalExecution();
  } else {
    addresses.oracle = process.env.ORACLE_ADDRESS || '';
    addresses.dex = process.env.DEX_ADDRESS || '';
    
    if (!addresses.oracle || !addresses.dex) {
      throw new Error('ORACLE_ADDRESS and DEX_ADDRESS must be set in production mode');
    }
  }
  
  addresses.governance = await deployContract(
    provider,
    'Governance',
    new Args()
      .addString(temporaryOwner)
      .addString(temporaryMultisig)
  );
  
  addresses.vault = await deployContract(
    provider,
    'Vault',
    new Args()
      .addString(temporaryOwner)
      .addString(temporaryOwner)
      .addString(temporaryOwner)
  );
  
  addresses.executor = await deployContract(
    provider,
    'TradeExecutor',
    new Args()
      .addString(temporaryOwner)
      .addString(temporaryOwner)
      .addString(addresses.vault)
      .addString(addresses.dex)
  );
  
  addresses.strategy = await deployContract(
    provider,
    'StrategyEngine',
    new Args()
      .addString(temporaryOwner)
      .addString(addresses.oracle)
      .addString(addresses.executor)
  );
  
  console.log('\nUpdating contract references...');
  
  const vaultContract = new SmartContract(provider, addresses.vault);
  let op = await vaultContract.call('constructor',
    new Args()
      .addString(temporaryOwner)
      .addString(addresses.strategy)
      .addString(addresses.executor)
  );
  await op.waitFinalExecution();
  
  const executorContract = new SmartContract(provider, addresses.executor);
  op = await executorContract.call('constructor',
    new Args()
      .addString(temporaryOwner)
      .addString(addresses.strategy)
      .addString(addresses.vault)
      .addString(addresses.dex)
  );
  await op.waitFinalExecution();
  
  writeFileSync(
    resolve(__dirname, '../addresses.json'),
    JSON.stringify(addresses, null, 2)
  );
  
  console.log('\n✅ Deployment complete!');
  console.log('\nContract addresses saved to addresses.json:');
  console.log(JSON.stringify(addresses, null, 2));
  
  console.log('\n⚠️  Important: Update the owner and multisig addresses through governance!');
}

main().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});