import { useState, useEffect } from "react";
import ContractUI from "./components/ContractUI";
import type { AccountInfo, ContractArtifact } from "./types";
import { StarknetProvider } from "./contexts/StarknetProvider";
import ConfigurationForm from "./components/ConfigurationForm";
import { Toaster } from "react-hot-toast";

function App() {
  const [contractData, setContractData] = useState<ContractArtifact | null>(
    null,
  );
  const [contractDataLoading, setContractDataLoading] = useState(true);
  const [accountInfoLoading, setAccountInfoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  useEffect(() => {
    if (window.vscode) {
      window.vscode.postMessage({ type: "getContractData" });
      window.vscode.postMessage({ type: "getAccountInfo" });
    }

    const handleContractDataMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === "contractData") {
        // Check if message.data exists, otherwise use message directly
        const data = message.data || message;
        setContractData(data as ContractArtifact);
        setContractDataLoading(false);
        setError(null);
      } else if (message.type === "error") {
        setError(message.message || "Failed to load contract data");
        setContractDataLoading(false);
      }
    };

    const handleAccountInfoMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === "accountInfo") {
        const data = message.data || message;
        setAccountInfo(data as AccountInfo);
        setAccountInfoLoading(false);
        setError(null);
      } else if (message.type === "error") {
        setError(message.message || "Failed to get account info");
        setAccountInfoLoading(false);
      }
    };

    window.addEventListener("message", handleContractDataMessage);
    window.addEventListener("message", handleAccountInfoMessage);

    return () => {
      window.removeEventListener("message", handleContractDataMessage);
      window.removeEventListener("message", handleAccountInfoMessage);
    };
  }, []);

  return (
    <StarknetProvider>
      <Toaster />
      {/* <CairoTesterProvider> */}

      <div className="w-full p-4 bg-[#161616] text-[#9BDBFF] min-h-screen">
        <h1 className="text-xl font-bold mb-4">
          {contractData ? `${contractData.name}` : "VS Code Interaction"}
        </h1>

        {contractDataLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-2">
              Loading contract data && account info...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900 text-white rounded-md">
            Error: {error}
          </div>
        )}

        {contractData && !contractDataLoading && !accountInfoLoading && (
          <div className="flex flex-col gap-12">
            <ConfigurationForm
              contractData={contractData}
              accountInfo={
                accountInfo || {
                  privateKey: "",
                  walletAddress: "",
                  rpcUrl: "",
                }
              }
            />
            {/* <ConfigurationForm /> */}
            <ContractUI contractData={contractData} />
          </div>
        )}

        {!contractData && !contractDataLoading && !error && (
          <div className="p-4 bg-yellow-900 text-white rounded-md">
            No contract data available. Please make sure you have a contract
            file open.
          </div>
        )}
      </div>
      {/* </CairoTesterProvider> */}
    </StarknetProvider>
  );
}

export default App;
