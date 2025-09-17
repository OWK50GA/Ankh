import { sepolia, mainnet } from '@starknet-react/chains';
import { 
// alchemyProvider,
argent, braavos, 
// infuraProvider,
// lavaProvider,
// nethermindProvider,
// reddioProvider,
StarknetConfig, starkscan, useInjectedConnectors, jsonRpcProvider, } from '@starknet-react/core';
import { CairoTesterProvider } from './cairoTesterContext';
export function StarknetProvider({ children }) {
    const { connectors: injected } = useInjectedConnectors({
        recommended: [argent(), braavos()],
        includeRecommended: 'always',
    });
    // const apiKey = process.env.NEXT_PUBLIC_API_KEY!;
    // const nodeProvider = process.env.NEXT_PUBLIC_PROVIDER!;
    return (<StarknetConfig connectors={injected} chains={[mainnet, sepolia]} provider={jsonRpcProvider({
            rpc: () => ({
                nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
            }),
        })} explorer={starkscan} autoConnect>
            <CairoTesterProvider>
                {children}
            </CairoTesterProvider>
        </StarknetConfig>);
}
//# sourceMappingURL=StarknetProvider.js.map