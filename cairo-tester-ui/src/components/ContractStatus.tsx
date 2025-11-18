import { Settings } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { useConfig } from "../contexts/cairoTesterContext";

export const ContractStatus = ({
  //   contractName,
  //   contractAddress,
  //   classHash,
  onConfigure,
}: {
  contractName: string;
  contractAddress?: string;
  classHash?: string;
  onConfigure: () => void;
}) => {
  const { contractData } = useConfig();

  const { contractAddress, name: contractName, classHash } = contractData!;

  return (
    <div className="bg-[#1E1E1E] border border-green-700/50 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="font-medium text-sm">{contractName}</div>
          {contractAddress && (
            <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
              <span className="truncate"> <span className="font-bold text-white">Deployed at: </span>{contractAddress}</span>
              <CopyButton
                copyText={contractAddress}
                className="flex-shrink-0"
              />
            </div>
          )}

          {classHash && (
            <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
              <span className="truncate"><span className="font-bold text-white">ClassHash: </span>{classHash}</span>
              <CopyButton
                copyText={classHash}
                className="flex-shrink-0"
              />
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onConfigure}
        className="ml-4 p-2 hover:bg-[#2A2A2A] rounded transition-colors flex-shrink-0"
        title="Configure"
      >
        <Settings size={18} className="text-gray-400" />
      </button>
    </div>
  );
};
