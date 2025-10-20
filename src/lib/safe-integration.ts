// src/lib/safe-integration.ts
import { S2S_RECORDS_ABI, S2S_PUBLICATION_ABI } from '@/constants';
import type { SafeInfo, SafeAppsSDK, EthersContract } from '@/types';

export class SafeIntegration {
  private safeSdk: SafeAppsSDK | null = null;
  private recordsModule: EthersContract | null = null;
  private publicationModule: any | null = null;
  private safeInfo: SafeInfo = { 
    safeAddress: '', 
    s2sRecords: '', 
    s2sPublication: '', 
    chainId: 1, 
    network: '', 
    owners: [], 
    threshold: 1, 
    modules: [] 
  };

  async initialize(): Promise<SafeInfo> {
    try {
      if (typeof window.SafeAppsSDK === 'undefined') {
        throw new Error('SafeAppsSDK not available');
      }

      const opts = {
        allowedDomains: [/app\.safe\.global$/],
        debug: false
      };

      this.safeSdk = new window.SafeAppsSDK(opts);
      const safeData: any = await this.safeSdk!.safe.getInfo();
      
      this.safeInfo = {
        safeAddress: safeData.safeAddress,
        s2sRecords: '',
        s2sPublication: '',
        chainId: safeData.chainId,
        network: safeData.network,
        modules: safeData.modules,
        owners: safeData.owners,
        threshold: safeData.threshold
      };

      const rpcUrl = this.getRpcUrl(this.safeInfo!.chainId);
      const provider = new window.ethers.providers.JsonRpcProvider(rpcUrl);

      // Find both modules
      for (const moduleAddress of this.safeInfo.modules) {
        try {
          // Try Records Module
          const recordsModule = new window.ethers.Contract(
            moduleAddress,
            S2S_RECORDS_ABI,
            provider
          );
          const recordsName = await recordsModule.NAME();
          if (recordsName === "S2S Records Module") {
            this.safeInfo.s2sRecords = moduleAddress;
            this.recordsModule = recordsModule;
            console.log("Found Records Module:", moduleAddress);
          }
        } catch (error) {
          // Not a records module, try publication
          try {
            const publicationModule = new window.ethers.Contract(
              moduleAddress,
              S2S_PUBLICATION_ABI,
              provider
            );
            // Check if it has the safe() function (characteristic of publication module)
            const moduleSafe = await publicationModule.safe();
            if (moduleSafe === this.safeInfo.safeAddress) {
              this.safeInfo.s2sPublication = moduleAddress;
              this.publicationModule = publicationModule;
              console.log("Found Publication Module:", moduleAddress);
            }
          } catch (innerError) {
            // Not a publication module either
          }
        }
      }

      return this.safeInfo;
    } catch (error) {
      console.error('Failed to initialize Safe SDK:', error);
      return this.safeInfo;
    }
  }

  // ===== RECORDS MODULE METHODS =====
  
  async getAllRecords(): Promise<[string[], string[]]> {
    if (this.recordsModule) {
      return await this.recordsModule.getAllRecords();
    }
    throw new Error('Records module not initialized');
  }

  async setRecord(key: string, value: string): Promise<void> {
    if (!this.safeSdk || !this.recordsModule) {
      throw new Error('Safe SDK or records module not initialized');
    }

    const txData = this.recordsModule.interface.encodeFunctionData('setRecord', [key, value]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sRecords!,
        value: '0',
        data: txData
      }]
    });
  }

  async deleteRecord(key: string): Promise<void> {
    if (!this.safeSdk || !this.recordsModule) {
      throw new Error('Safe SDK or records module not initialized');
    }

    const txData = this.recordsModule.interface.encodeFunctionData('deleteRecord', [key]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sRecords!,
        value: '0',
        data: txData
      }]
    });
  }

  // ===== PUBLICATION MODULE - DEALS =====
  
  async offerDeal(publication: string, streamId: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('offerDeal', [publication, streamId]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication || "",
        value: '0',
        data: txData
      }]
    });
  }

  async acceptDeal(streamId: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('acceptDeal', [streamId]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async revokeDeal(streamId: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('revokeDeal', [streamId]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async hasDeal(streamId: string): Promise<boolean> {
    if (!this.publicationModule) {
      throw new Error('Publication module not initialized');
    }
    return await this.publicationModule.hasDeal(streamId);
  }

  async getDealAuthor(streamId: string): Promise<string> {
    if (!this.publicationModule) {
      throw new Error('Publication module not initialized');
    }
    return await this.publicationModule.getDealAuthor(streamId);
  }

  // ===== PUBLICATION MODULE - WHITELISTS =====
  
  async whitelistAuthor(author: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('whitelistAuthor', [author]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async removeWhitelistedAuthor(author: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('removeWhitelistedAuthor', [author]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async whitelistDev(dev: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('whitelistDev', [dev]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async removeWhitelistedDev(dev: string): Promise<void> {
    if (!this.safeSdk || !this.publicationModule) {
      throw new Error('Safe SDK or publication module not initialized');
    }

    const txData = this.publicationModule.interface.encodeFunctionData('removeWhitelistedDev', [dev]);
    
    await this.safeSdk.txs.send({
      txs: [{
        to: this.safeInfo.s2sPublication!,
        value: '0',
        data: txData
      }]
    });
  }

  async getWhitelistedAuthors(): Promise<string[]> {
    if (!this.publicationModule) {
      throw new Error('Publication module not initialized');
    }
    return await this.publicationModule.getWhitelistedAuthors();
  }

  async getWhitelistedDevs(): Promise<string[]> {
    if (!this.publicationModule) {
      throw new Error('Publication module not initialized');
    }
    return await this.publicationModule.getWhitelistedDevs();
  }

  async canPublish(address: string): Promise<boolean> {
    if (!this.publicationModule) {
      throw new Error('Publication module not initialized');
    }
    return await this.publicationModule.canPublish(address);
  }

  // ===== UTILITY =====

  getSafeInfo(): SafeInfo {
    return this.safeInfo;
  }

  isConnected(): boolean {
    return this.safeSdk !== null;
  }

  hasRecordsModule(): boolean {
    return this.recordsModule !== null;
  }

  hasPublicationModule(): boolean {
    return this.publicationModule !== null;
  }

  getRpcUrl(chainId: number): string {
    let rpc = '';
    const alchemy_key = "DAfzjixY82ICdLCssh_dTQpoN0I2mthW";

    switch (chainId) {
      case 1:
        rpc = `https://eth-mainnet.g.alchemy.com/v2/${alchemy_key}`;
        break;
      case 11155111:
        rpc = "https://sepolia.infura.io/v3/5588b2f2645b47bf9d9df736ab328181";
        break;
      case 8453:
        rpc = `https://base-mainnet.g.alchemy.com/v2/${alchemy_key}`;
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