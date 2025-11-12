import { ChevronRight, Settings } from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { CopyButton } from "./CopyButton";
import type { AccountInfo, ContractArtifact } from "../types";
import type { Address } from "@starknet-react/chains";
// import { useConfig } from "../contexts/cairoTesterContext";

type FormInputFields = {
  network: NetworkType;
  rpcUrl: string;
  account: Address;
  classHash?: string;
  contractAddress?: Address;
};

type NetworkType = "devnet" | "sepolia" | "mainnnet";

export const ConfigurationPanel = ({
  contractData,
  //   accountInfo,
  formInputValues,
  setFormInputValues,
  //   form,
  inputElements,
  deploying,
  validating,
  handleDeploy,
  handleLoadContract,
  onCollapse,
}: {
  contractData: ContractArtifact;
  accountInfo?: AccountInfo;
  formInputValues: FormInputFields;
  setFormInputValues: Dispatch<SetStateAction<FormInputFields>>;
  form: Record<string, any>;
  inputElements: any[];
  deploying: boolean;
  validating: boolean;
  handleDeploy: () => void;
  handleLoadContract: () => void;
  onCollapse: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"deploy" | "load">("deploy");

  return (
    <div className="bg-[#161616] border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#1E1E1E] border-b border-gray-700 p-4 flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Settings size={18} className="text-blue-600" />
          Contract Setup
        </h3>
        <button
          onClick={onCollapse}
          className="text-gray-400 hover:text-[#9BDBFF] transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="p-4">
        {/* Configuration Info */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-400">Configuration</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Copy ABI</span>
              <CopyButton copyText={JSON.stringify(contractData.abi)} />
            </div>
          </div>
          <div className="bg-[#1E1E1E] rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="font-medium">{formInputValues.network}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">RPC URL:</span>
              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <span className="font-medium truncate">
                  {formInputValues.rpcUrl}
                </span>
                <CopyButton copyText={formInputValues.rpcUrl} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Account:</span>
              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                <span className="font-medium truncate">
                  {formInputValues.account}
                </span>
                <CopyButton copyText={formInputValues.account} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab("deploy")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "deploy"
                ? "text-[#9BDBFF]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            🚀 Deploy New
            {activeTab === "deploy" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("load")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "load"
                ? "text-[#9BDBFF]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            📦 Load Existing
            {activeTab === "load" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "deploy" ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3 text-gray-300">
                Constructor Calldata
              </h4>
              <div className="space-y-3">{inputElements}</div>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-blue-600 px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-white"
                onClick={handleDeploy}
                disabled={validating || deploying}
              >
                {validating === true ? "Validating..." : deploying ? "Deploying..." : "Deploy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400">
                  Contract Address
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center rounded-md relative p-[1px] focus-within:bg-blue-600 flex-1">
                    <input
                      type="text"
                      value={formInputValues.contractAddress || ""}
                      onChange={(e) =>
                        setFormInputValues((prev: any) => ({
                          ...prev,
                          contractAddress: e.target.value,
                        }))
                      }
                      placeholder="0x..."
                      className="outline-none w-full focus-within:border-transparent focus-within:outline-none bg-[#1E1E1E] h-[2.2rem] px-4 border border-gray-600 text-xs placeholder:text-[#9596BF] rounded-md"
                    />
                  </div>
                  {formInputValues.contractAddress && (
                    <CopyButton copyText={formInputValues.contractAddress} />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400">
                  Class Hash{" "}
                  <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center rounded-md relative p-[1px] focus-within:bg-blue-600 flex-1">
                    <input
                      type="text"
                      value={formInputValues.classHash || ""}
                      onChange={(e) =>
                        setFormInputValues((prev: any) => ({
                          ...prev,
                          classHash: e.target.value,
                        }))
                      }
                      placeholder="0x..."
                      className="outline-none w-full focus-within:border-transparent focus-within:outline-none bg-[#1E1E1E] h-[2.2rem] px-4 border border-gray-600 text-xs placeholder:text-[#9596BF] rounded-md"
                    />
                  </div>
                  {formInputValues.classHash && (
                    <CopyButton copyText={formInputValues.classHash} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="bg-blue-600 px-6 py-2.5 rounded-lg font-medium transition-opacity text-white"
                onClick={handleLoadContract}
              >
                Load Contract
              </button>
              <button
                className="bg-[#2A2A2A] hover:bg-[#333333] px-6 py-2.5 rounded-lg font-medium transition-colors"
                onClick={() => {}}
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
