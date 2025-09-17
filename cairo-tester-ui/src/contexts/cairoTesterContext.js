import { createContext, useContext, useState } from "react";
const CairoTesterContext = createContext(null);
export const useConfig = () => {
    const context = useContext(CairoTesterContext);
    if (!context) {
        throw new Error('useConfig must be used within a CairoTesterContext');
    }
    return context;
};
export const CairoTesterProvider = ({ children }) => {
    const [currentNetwork, setCurrentNetwork] = useState("devnet");
    const [rpcUrl, setRpcUrl] = useState("https://starknet-sepolia.public.blastapi.io/rpc/v0_8");
    const [contractFunctionsData, setContractFunctionsData] = useState();
    const [contractData, setContractData] = useState();
    // const [contractAddress, setContractAddress] = useState<Address>(zeroAddress)
    const [accountInfo, setAccountInfo] = useState({
        privateKey: "",
        walletAddress: "",
        rpcUrl: ""
    });
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
    };
    return (<CairoTesterContext.Provider value={value}>
            {children}
        </CairoTesterContext.Provider>);
};
//# sourceMappingURL=cairoTesterContext.js.map