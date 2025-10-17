
// src/lib/safe-integration.ts
import { S2S_RECORDS_ABI } from '@/constants'; // ,SAFE_ABI
import type { SafeInfo, SafeAppsSDK, EthersContract } from '@/types';

// import { validateEthereumAddress } from '@/utils';

export class SafeIntegration {
  private safeSdk: SafeAppsSDK | null = null;
  // private contract: EthersContract | null = null;
  private module: EthersContract | null = null;
  private safeInfo: SafeInfo = { safeAddress: '', s2sRecords: '', chainId: 1, network: '', owners: [], threshold: 1, modules : [] };

  async initialize(): Promise<SafeInfo> {
      try {
        
        // console.log('Initializing Safe integration...');
      
      if (typeof window.SafeAppsSDK === 'undefined') {
        throw new Error('SafeAppsSDK not available');
      }

      const opts = {
        allowedDomains: [/app\.safe\.global$/],
        debug: false
      };

      this.safeSdk = new window.SafeAppsSDK(opts);
      
      const safeData : any = await this.safeSdk!.safe.getInfo();
            
      this.safeInfo = {
        safeAddress: safeData.safeAddress,
        chainId: safeData.chainId,
        network: safeData.network,
        modules: safeData.modules,
        owners: safeData.owners,
        threshold: safeData.threshold
      };

      // this works but requires adding key to code 
      const rpcUrl = this.getRpcUrl(this.safeInfo!.chainId);
      const provider = new window.ethers.providers.JsonRpcProvider(rpcUrl);

      // gives weird warning
      // const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      // does not work 
      // const provider = new window.ethers.providers.Web3Provider(
      //   this.safeSdk?.eth as any
      // );

      // this.contract = new window.ethers.Contract(
      //   this.safeInfo.safeAddress,
      //   SAFE_ABI,
      //   provider
      // );


      for (const moduleAddress of this.safeInfo.modules) {

        try {

            const module = new window.ethers.Contract(
              moduleAddress,
              S2S_RECORDS_ABI,
              provider
            );

            const name = await module.NAME();

            if (name == "S2S Records Module") {
              this.safeInfo.s2sRecords = moduleAddress;
              console.log("found module")
              break;
            }
        } 
        catch(error) {
          // console.log(error);
        }
      }

      if(this.safeInfo.s2sRecords) {

        this.module = new window.ethers.Contract(
          this.safeInfo.s2sRecords,
          S2S_RECORDS_ABI,
          provider
        );
      }

      return this.safeInfo


    } catch (error) {
      console.error('Failed to initialize Safe SDK:', error);
      return this.safeInfo;
    }
    
  }


  // Public methods for contract interaction
  async getAllRecords(): Promise<[string[], string[]]> {
    if (this.module) {
      return await this.module.getAllRecords();
    }
    throw new Error('Module not initialized');
  }

  async setRecord(key: string, value: string): Promise<void> {
    if (!this.safeSdk || !this.module) {
      throw new Error('Safe SDK or contract not initialized');
    }

    const txData = this.module.interface.encodeFunctionData('setRecord', [key, value]);

     // Verify we're on the correct network
      const provider = new window.ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      
      console.log('Wallet network:', network.chainId);
      console.log('Safe network:', this.safeInfo.chainId);
      
      if (network.chainId !== this.safeInfo.chainId) {
        throw new Error(
          `Network mismatch! Please switch your wallet to chain ID ${this.safeInfo.chainId}`
        );
      }
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sRecords || "0x",
        value: '0',
        data: txData
      }]
    });
  }

  async deleteRecord(key: string): Promise<void> {
    if (!this.safeSdk || !this.module) {
      throw new Error('Safe SDK or contract not initialized');
    }

    const txData = this.module.interface.encodeFunctionData('deleteRecord', [key]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sRecords || "0x",
        value: '0',
        data: txData
      }]
    });
  }

  getSafeInfo(): SafeInfo {
    return this.safeInfo;
  }

  isConnected(): boolean {
    return this.safeSdk !== null && this.module !== null; // this.contract !== null && 
  }

  getRpcUrl(chainId: number) : string {

      let rpc = '';
      const alchemy_key = "DAfzjixY82ICdLCssh_dTQpoN0I2mthW"

      switch (chainId) {
        case 1:
          rpc = `https://eth-mainnet.g.alchemy.com/v2/${alchemy_key}`;
          break;

        case 11155111:
          // rpc = `https://eth-sepolia.g.alchemy.com/v2/${alchemy_key}`;
          rpc = "https://sepolia.infura.io/v3/5588b2f2645b47bf9d9df736ab328181";
          break;

        case 8453:
          rpc =  `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;
          break;

        case 84532:
          rpc = `https://base-sepolia.g.alchemy.com/v2/${alchemy_key}`;
          break;

        case 175188:
          rpc = "https://yellowstone-rpc.litprotocol.com/";
          break;

      }

      return rpc;
  }
}