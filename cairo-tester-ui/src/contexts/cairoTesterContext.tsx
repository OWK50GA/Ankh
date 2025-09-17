import { createContext, useContext, useState, type Dispatch, type FC, type ReactNode, type SetStateAction } from "react";
import type { AccountInfo, ContractArtifact, ContractFunctionData } from "../types";

type NetworkType = "devnet" | "sepolia" | "mainnnet";

export type CairoTesterContextType = {
    currentNetwork: NetworkType;
    setCurrentNetwork: Dispatch<SetStateAction<NetworkType>>;
    rpcUrl: string;
    setRpcUrl: Dispatch<SetStateAction<string>>;
    classHash?: string;
    setClassHash?: Dispatch<SetStateAction<string>>;
    // contractAddress: Address;
    // setContractAddress: Dispatch<SetStateAction<Address>>
    contractFunctionsData: ContractFunctionData | undefined;
    setContractFunctionsData: Dispatch<SetStateAction<ContractFunctionData | undefined>>;
    contractData: ContractArtifact | undefined;
    setContractData: Dispatch<SetStateAction<ContractArtifact | undefined>>;
    accountInfo: AccountInfo;
    setAccountInfo: Dispatch<SetStateAction<AccountInfo>>;
};

const CairoTesterContext = createContext<CairoTesterContextType | null>(null);

export const useConfig = () => {
    const context = useContext(CairoTesterContext);

    if (!context) {
        throw new Error('useConfig must be used within a CairoTesterContext');
    }

    return context;
}

export const CairoTesterProvider: FC<{ children: ReactNode }> = ({ children }) => {

    const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("devnet")
    const [rpcUrl, setRpcUrl] = useState("https://starknet-sepolia.public.blastapi.io/rpc/v0_8");
    const [contractFunctionsData, setContractFunctionsData] = useState<ContractFunctionData>();
    const [contractData, setContractData] = useState<ContractArtifact>()
    // const [contractAddress, setContractAddress] = useState<Address>(zeroAddress)
    const [accountInfo, setAccountInfo] = useState<AccountInfo>({
        privateKey: "",
        walletAddress: "",
        rpcUrl: ""
    })

    const value = {
        currentNetwork,
        rpcUrl,
        contractFunctionsData,
        contractData,
        setCurrentNetwork,
        setRpcUrl,
        setContractFunctionsData,
        setContractData,
        // contractAddress,
        // setContractAddress,
        accountInfo,
        setAccountInfo
    }

    return (
        <CairoTesterContext.Provider value={value} >
            {children}
        </CairoTesterContext.Provider>
    )
}