import { useEffect, useState } from "react";
import type { ContractArtifact } from "../types";
import { useConfig } from "../contexts/cairoTesterContext";
import type { Abi } from "abi-wan-kanabi";
import { getFunctionsByStateMutability } from "../utils";
import { Edit3, FileText, Search } from "lucide-react";
import { FunctionListItem } from "./FunctionListItem";
import { RequestSection } from "./RequestSection";
import { ResponseSection } from "./ResponseSection";

export default function ContractUI({
  contractData,
}: {
  contractData: ContractArtifact | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { contractFunctionsData, setContractFunctionsData, setContractData, contractData: contextContractData } =
  useConfig();
  
  const [readyForInteraction, setReadyForInteraction] = useState(!!contractFunctionsData?.contractAddress)

  useEffect(() => {
    if (contextContractData?.contractAddress) {
      setReadyForInteraction(true);
    }
  }, [contextContractData])

  useEffect(() => {
    if (contractData) {
      setContractData(() => contractData);
      setContractFunctionsData({
        abi: contractData.abi,
      });
    }
  }, [contractData]);

  if (!contractData) {
    return <div>Error Finding Contract Data</div>;
  }

  useEffect(() => {
    if (Object.values(form).length === 0) return;

    console.log(form);
  }, [form])
  // const readyForInteraction = !!contractFunctionsData?.contractAddress;

  const abi = contractData?.abi;

  const viewFunctions = getFunctionsByStateMutability(
    (contractFunctionsData?.abi || []) as Abi,
    "view",
  ).map((func) => {
    return func;
  });

  const externalFunctions = getFunctionsByStateMutability(
    (contractFunctionsData?.abi || []) as Abi,
    "external",
  ).map((func) => {
    return func;
  });

  const filteredViewFunctions = viewFunctions.filter((func) =>
    func.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredExternalFunctions = externalFunctions.filter((func) =>
    func.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Sidebar */}
      <div className="w-64 bg-[#1E1E1E] rounded-xl p-4 flex flex-col gap-4 border border-gray-700">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search functions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#161616] border border-gray-600 rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-[#9433DC] transition-colors"
          />
        </div>

        {/* Functions List */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* View Functions */}
          {filteredViewFunctions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-2">
                <FileText size={14} className="text-blue-400" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  View Functions
                </h3>
              </div>
              <div className="space-y-1">
                {filteredViewFunctions.map((func) => (
                  <FunctionListItem
                    key={func.name}
                    func={func}
                    type="view"
                    isSelected={selectedFunction?.name === func.name}
                    onClick={() => {
                      setSelectedFunction(func);
                      setForm({});
                      setResponse(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* External Functions */}
          {filteredExternalFunctions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-2">
                <Edit3 size={14} className="text-orange-400" />
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  External Functions
                </h3>
              </div>
              <div className="space-y-1">
                {filteredExternalFunctions.map((func) => (
                  <FunctionListItem
                    key={func.name}
                    func={func}
                    type="external"
                    isSelected={selectedFunction?.name === func.name}
                    onClick={() => {
                      setSelectedFunction(func);
                      setForm({});
                      setResponse(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredViewFunctions.length === 0 &&
            filteredExternalFunctions.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                No functions found
              </div>
            )}
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 bg-[#161616] rounded-xl border border-gray-700 flex flex-col">
        {/* Request Section */}
        <div className="flex-1 p-6 border-b border-gray-700 overflow-y-auto">
          <RequestSection
            selectedFunction={selectedFunction}
            form={form}
            setForm={setForm}
            abi={abi}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            // onExecute={handleExecute}
            readyForInteraction={readyForInteraction}
            // setFormErrorMessage={set}
            setResponse={setResponse}
          />
        </div>

        {/* Response Section */}
        <div className="h-64 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Response
          </h3>
          <ResponseSection
            response={response}
            isLoading={isLoading}
            selectedFunction={selectedFunction}
          />
        </div>
      </div>
    </div>
  );
}
