import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type FC,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  AccountInfo,
  ContractArtifact,
  ContractFunctionData,
} from "../types";
// import { getCompiledSierra } from "../utils";
// import { extractContractHashes } from "starknet";

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
  setContractFunctionsData: Dispatch<
    SetStateAction<ContractFunctionData | undefined>
  >;
  contractData: ContractArtifact | undefined;
  setContractData: Dispatch<SetStateAction<ContractArtifact | undefined>>;
  accountInfo: AccountInfo;
  setAccountInfo: Dispatch<SetStateAction<AccountInfo>>;
};

const CairoTesterContext = createContext<CairoTesterContextType | null>(null);

export const useConfig = () => {
  const context = useContext(CairoTesterContext);

  if (!context) {
    throw new Error("useConfig must be used within a CairoTesterContext");
  }

  return context;
};

export const CairoTesterProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>("devnet");
  const [rpcUrl, setRpcUrl] = useState(
    "https://rpc.starknet-testnet.lava.build/rpc/v0_9"
  );
  const [contractFunctionsData, setContractFunctionsData] =
    useState<ContractFunctionData>();
  const [contractData, setContractData] = useState<ContractArtifact>();
  // const [contractAddress, setContractAddress] = useState<Address>(zeroAddress)
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    privateKey: "",
    walletAddress: "",
    rpcUrl: "",
  });

  // useEffect(() => {
  //   if (window.vscode) {
  //     window.vscode.postMessage({ type: "getPersistentState" });
  //   }

  //   const handlePersistentStateMessage = (event: MessageEvent) => {
  //     const message = event.data;

  //     if (message.type === "persistentState") {
  //       const data = (message.data as PanelState) || (message as PanelState);

  //       if (data.deploymentInfo) {
  //         const contractAddress = data.deploymentInfo.contractAddress;
  //         const classHash = data.deploymentInfo.classHash;

  //         // if (!verifyClassHash(classHash!)) return;

  //         if (contractAddress) {
  //           setContractData((prev: any) => ({
  //             ...prev,
  //             contractAddress: contractAddress,
  //           }));
  //           setContractFunctionsData((prev: any) => ({
  //             ...prev,
  //             contractAddress: contractAddress,
  //           }));
  //           console.log("FOund persistent contract address and class hash")
  //         }
  //         if (classHash) {
  //           setContractData((prev: any) => ({ ...prev, classHash: classHash }));
  //         }
  //       }
  //     }
  //   };

  //   window.addEventListener("message", handlePersistentStateMessage);

  //   return () =>
  //     window.removeEventListener("message", handlePersistentStateMessage);
  // }, []);

  // useEffect(() => {
  //   if (!contractData) return;

    

  //   persistState({
  //     contractName: contractData?.name,
  //     deploymentInfo: {
  //       classHash: contractData?.classHash,
  //       contractAddress: contractData?.contractAddress,
  //     }
  //   })

  //   console.log("Persisted state")

  // }, [contractData]);

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
    setAccountInfo,
  };

  return (
    <CairoTesterContext.Provider value={value}>
      {children}
    </CairoTesterContext.Provider>
  );
};
