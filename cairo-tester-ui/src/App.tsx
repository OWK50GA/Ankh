import { useState, useEffect } from 'react';
import ContractUI from './components/ContractUI';
import type { ContractData } from "./types";
import { StarknetProvider } from './components/StarknetProvider';

function App() {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [contractDataLoading, setContractDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.vscode) {
      window.vscode.postMessage({ type: 'getContractData' });
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'contractData') {
        // Check if message.data exists, otherwise use message directly
        const data = message.data || message;
        setContractData(data as ContractData);
        setContractDataLoading(false);
        setError(null);
      } else if (message.type === 'error') {
        setError(message.message || 'Failed to load contract data');
        setContractDataLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <StarknetProvider>

      <div className='w-full p-4 bg-[#0f0f0f] text-white min-h-screen'>
        <h1 className="text-xl font-bold mb-4">VS Code Contract Interaction</h1>
        
        {contractDataLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-2">Loading contract data...</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-900 text-white rounded-md">
            Error: {error}
          </div>
        )}
        
        {contractData && !contractDataLoading && (
          <ContractUI contractData={contractData} />
        )}
        
        {!contractData && !contractDataLoading && !error && (
          <div className="p-4 bg-yellow-900 text-white rounded-md">
            No contract data available. Please make sure you have a contract file open.
          </div>
        )}
      </div>
    </StarknetProvider>
  );
}

export default App;