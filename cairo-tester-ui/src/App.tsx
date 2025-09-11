import { useEffect, useState } from 'react';
import './App.css'
// import ContractInteraction from './components/ContractInteraction'
import ContractUI from './components/ContractUI'
import type { ContractData } from "./types";

function App() {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [contractDataLoading, setContractDataLoading] = useState(false);

  useEffect(() => {
    setContractDataLoading(true);
      if (window.vscode) {
          window.vscode.postMessage({ type: 'getContractData' });
      }

      const handleMessage = (event: MessageEvent) => {
          const message = event.data;

          if (message.type === 'contractData') {
            setContractData(message.data as ContractData);
            setContractDataLoading(false);
          }
          
      }
      window.addEventListener('message', handleMessage);
      
      return () => window.removeEventListener('message', handleMessage)
  }, []);
  
  return (
    <div className='w-full'>
      {/* <ContractInteraction /> */}
      <p>This component displays</p>
      <ContractUI contractData={contractData} contractDataLoading={contractDataLoading} />
    </div>
  )
}

export default App
