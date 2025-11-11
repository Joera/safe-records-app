// protocol-info.ts

import { ethers } from 'ethers';
import type { SafeIntegration } from './safe-integration';
import { fetchFromIPFS } from './ipfs.factory';
import { evmRead } from './evm'

interface PKP {
  tokenId: string;
  publicKey: string;
  addr: string;
}

interface ProtocolInfo {
  addr: string;
  pkp: PKP;
  config: any;
  lit_action_main: string;
  lit_action_root_update: string;
  lit_action_renderer: string;
  publication_implementation: string;
}

const ensRegistryABI = [
  "function resolver(bytes32 node) view returns (address)"
];

const resolverABI = [
  "function text(bytes32 node, string key) view returns (string)"
];

	const s2sRecordsAbi = JSON.stringify([{
      "inputs": [
        {
          "internalType": "string[]",
          "name": "keys",
          "type": "string[]"
        }
      ],
      "name": "getRecords",
      "outputs": [
        {
          "internalType": "string[]",
          "name": "values",
          "type": "string[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }]);

const ENS_NAMEWRAPPER = "0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401";

export class ProtocolInfoService {
  private safeIntegration: SafeIntegration;
  private ipfsGateway: string;

  constructor(safeIntegration: SafeIntegration, ipfsGateway: string = 'https://gateway.pinata.cloud') {
    this.safeIntegration = safeIntegration;
    this.ipfsGateway = ipfsGateway;
  }

  // Get provider for a specific chain using Safe's RPC URLs
  getProviderForChain(chainId: string): ethers.providers.JsonRpcProvider {
    const rpcUrl = this.safeIntegration.getRpcUrl(parseInt(chainId));
    return new window.ethers.providers.JsonRpcProvider(rpcUrl);
  }

  async getProtocolContractAddress(ensName: string): Promise<{ addr: string; chainId: string }> {
    const node = ethers.utils.namehash(ensName);

    // Use Sepolia provider for ENS resolution (ENS is on Sepolia testnet)
    const sepoliaProvider = this.getProviderForChain('11155111');

    // Get resolver address from ENS Registry
    const ensRegistry = new window.ethers.Contract(
      "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", // ENS Registry on Sepolia
      ensRegistryABI,
      sepoliaProvider
    );

    const resolverAddress = await ensRegistry.resolver(node);
    console.log("Resolver address:", resolverAddress);

    if (resolverAddress === ethers.constants.AddressZero) {
      throw new Error(`No resolver found for ${ensName}`);
    }

    // Get contract.address and chainId from resolver
    const resolver = new window.ethers.Contract(
      resolverAddress,
      resolverABI,
      sepoliaProvider
    );

    const [addr, chainId] = await Promise.all([
      resolver.text(node, "contract.address"),
      resolver.text(node, "contract.chainId")
    ]);

    console.log("Protocol contract address:", addr);
    console.log("Protocol chainId:", chainId);

    if (!addr || !chainId) {
      throw new Error(`Missing contract.address or contract.chainId for ${ensName}`);
    }

    return { addr, chainId };
  }



  parseChain(chainId: string): string {
    const chains: { [key: string]: string } = {
      '1': 'ETH_MAINNET',
      '11155111': 'SEPOLIA',
      '8453': 'BASE',
      '84532': 'BASE_SEPOLIA',
      '175188': 'CHRONICLE'
    };
    
    return chains[chainId] || 'UNKNOWN';
  }

  async getProtocolInfo () {
  
  try {

    const { multisig, configModule } = await this.getProtocolControllerAndModules();

    const [assets_gateway , data_gateway, ens_records, lens_app, lit_action_main, lit_action_root_update, pkp_tokenId, pkp_publicKey, pkp_ethAddress] = await evmRead(8453, multisig, s2sRecordsAbi, "getRecords", ["assets_gateway","data_gateway","ens_records","lens_app","lit_action_main","lit_action_root_update","pkp_tokenId","pkp_publicKey","pkp_ethAddress"]);

    return {
      addr: multisig,
      recordsModule: configModule,
      data_gateway: data_gateway,
      assets_gateway: assets_gateway,
      lens_app: lens_app,
      ens_records: ens_records,
      pkp: {
        ethAddress: pkp_ethAddress,
        publicKey: pkp_publicKey,
        tokenId: pkp_tokenId
      },
      lit_action_main: lit_action_main,
      lit_action_root_update: lit_action_root_update
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log("Protocol info error:", errorMsg);
    return {};
  }
};

async getProtocolControllerAndModules () {

     try {
  
        const subdomainNode = ethers.utils.namehash("soul2soul.eth");
        const customRegistry = await this.safeIntegration.evmRead(1, ENS_NAMEWRAPPER, ["function ownerOf(uint256 id) view returns (address)"], "ownerOf", [subdomainNode])
        const controller = await this.safeIntegration.evmRead(1, customRegistry, ["function parentDomainController() view returns (address)"], "parentDomainController", [])
        const modules: any = await this.safeIntegration.evmRead(8453, controller, ["function getModulesPaginated(address start, uint256 pageSize) view returns (address[] memory array, address next)"], "getModulesPaginated", [ "0x0000000000000000000000000000000000000001", 10])
        
        console.log("Modules found:", modules);

        let configModule = null;
        let publicationModule = null;

        for (const moduleAddress of modules[0]) {
            try {
          
                const name = await this.safeIntegration.evmRead( 8453, moduleAddress, ["function NAME() view returns (string)"], "NAME", [] )
                
                if (name === "S2S Records Module") {
                    configModule = moduleAddress;
                } else if (name === "S2S Publication Module") {
                    publicationModule = moduleAddress;
                }

            } catch (error) {
                // Module doesn't have NAME function, skip
                // console.log(`Module ${moduleAddress} has no NAME function`);
            }
        }

        return {
            multisig : controller,
            configModule,
            publicationModule
        };

    } catch (error) {
        console.error("Error getting publication addresses:", error);
        return {
            multisig: null,
            configModule: null,
            publicationModule: null
        };
    }


}





  // PKP parsing utilities
  tokenIDFromBytes(bytes: string): string {
    // TODO: Implement if needed
    console.log(bytes)
    return "";
  }

  publicKeyFromBytes(bytes: string): string {
    return ethers.utils.hexlify(bytes);
  }

  addressFromBytes(publicKeyBytes: Uint8Array | string): string {
    const pubKeyHex = ethers.utils.hexlify(publicKeyBytes);

    const uncompressedKey = pubKeyHex.startsWith("0x04")
      ? pubKeyHex.slice(4)
      : pubKeyHex.replace(/^0x/, "");

    const hash = ethers.utils.keccak256("0x" + uncompressedKey);
    const rawAddress = "0x" + hash.slice(-40);
    return ethers.utils.getAddress(rawAddress);
  }
}

