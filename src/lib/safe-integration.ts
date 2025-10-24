// src/lib/safe-integration.ts
import { S2S_PUBLICATION_ABI, S2S_RECORDS_ABI } from '@/constants';
import type { SafeInfo, EthersContract } from '@/types';
import SafeAppsSDK from '@safe-global/safe-apps-sdk';

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
      if (typeof SafeAppsSDK === 'undefined') {
        throw new Error('SafeAppsSDK not available');
      }

      const opts = {
        allowedDomains: [/app\.safe\.global$/],
        debug: false
      };

      this.safeSdk = new SafeAppsSDK(opts);
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
      const NAME_ABI = [
        "function NAME() view returns (string)"
      ];

      for (const moduleAddress of this.safeInfo.modules) {
        try {
          // Check for NAME function with minimal ABI
          const moduleChecker = new window.ethers.Contract(
            moduleAddress,
            NAME_ABI,
            provider
          );
          
          const name = await moduleChecker.NAME();
          console.log(`Module ${moduleAddress} has NAME:`, name);
          
          if (name === "S2S Records Module") {
            // Create full contract instance with complete ABI
            this.recordsModule = new window.ethers.Contract(
              moduleAddress,
              S2S_RECORDS_ABI,
              provider
            );
            this.safeInfo.s2sRecords = moduleAddress;
            console.log("Found Records Module:", moduleAddress);
            
          } else if (name === "S2S Publication Module") {
            // Create full contract instance with complete ABI
            this.publicationModule = new window.ethers.Contract(
              moduleAddress,
              S2S_PUBLICATION_ABI,
              provider
            );
            this.safeInfo.s2sPublication = moduleAddress;
            console.log("Found Publication Module:", moduleAddress);
          }
          
        } catch (error) {
          // Module doesn't have NAME() function, skip it
          console.log(`Module ${moduleAddress} doesn't have NAME(), skipping`);
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
  
  async getAllDeals(): Promise<{
      activeDeals: Array<{ streamId: string; author: string; status: "active" | "pending" }>;
      pendingDeals: Array<{ streamId: string; author: string; status: "active" | "pending" }>;
    }> {
      if (!this.publicationModule) {
        throw new Error('Publication module not initialized');
      }

      try {
        const streamIds = await this.publicationModule.getAllStreamIds();
        
        const [dealStatuses, pendingStatuses] = await Promise.all([
          this.publicationModule.hasDealBulk(streamIds),
          Promise.all(streamIds.map((id: string) => this.publicationModule.hasPendingDeal(id)))
        ]);
        
        // Get active deals with authors
        const activeStreamIds = streamIds.filter((_: string, i: number) => dealStatuses[i]);
        const activeAuthors = await Promise.all(
          activeStreamIds.map((id: string) => this.publicationModule.getDealAuthor(id))
        );
        
        const activeDeals = activeStreamIds.map((streamId: string, i: number) => ({ 
          streamId, 
          author: activeAuthors[i] || 'Unknown',
          status: 'active' as const 
        }));
        
        // Get pending deals with authors
        const pendingStreamIds = streamIds.filter((_: string, i: number) => pendingStatuses[i]);
        const pendingDealInfos = await Promise.all(
          pendingStreamIds.map((id: string) => this.publicationModule.getPendingDeal(id))
        );
        
        const pendingDeals = pendingStreamIds.map((streamId: string, i: number) => ({ 
          streamId,
          author: pendingDealInfos[i].author || 'Unknown',
          status: 'pending' as const 
        }));
          
        return { activeDeals, pendingDeals };
        
      } catch (error) {

          return { activeDeals: [], pendingDeals: [] } 
      }
    }

  async getPendingDeals(): Promise<Array<{ streamId: string; author: string; status: "active" | "pending" }>> {
    const { pendingDeals } = await this.getAllDeals();
    return pendingDeals;
  }

  async getActiveDeals(): Promise<Array<{ streamId: string; author: string; status: "active" | "pending" }>> {
    const { activeDeals } = await this.getAllDeals();
    return activeDeals;
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