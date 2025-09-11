import { sepolia, mainnet } from '@starknet-react/chains';
import {
    // alchemyProvider,
    argent,
    braavos,
    // infuraProvider,
    // lavaProvider,
    // nethermindProvider,
    // reddioProvider,
    StarknetConfig,
    starkscan,
    useInjectedConnectors,
    jsonRpcProvider,
} from '@starknet-react/core';

interface StarknetProviderProps {
    children: React.ReactNode;
}

export function StarknetProvider({ children }: StarknetProviderProps) {
    const { connectors: injected } = useInjectedConnectors({
        recommended: [argent(), braavos()],
        includeRecommended: 'always',
    });

    // const apiKey = process.env.NEXT_PUBLIC_API_KEY!;
    // const nodeProvider = process.env.NEXT_PUBLIC_PROVIDER!;


    return (
        <StarknetConfig
            connectors={injected}
            chains={[mainnet, sepolia]}
            provider={jsonRpcProvider({
                rpc: () => ({
                    nodeUrl: process.env.NEXT_PUBLIC_RPC_URL,
                }),
            })}
            explorer={starkscan}
            autoConnect
        >
            {children}
        </StarknetConfig>
    );
}
