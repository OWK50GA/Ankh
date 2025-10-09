import { ChevronDown, Settings } from "lucide-react";
import { CopyButton } from "./CopyButton";

export const ConfigStatusBar = ({
  network,
  rpcUrl,
  account,
  onExpand,
}: {
  network: string;
  rpcUrl: string;
  account: string;
  onExpand: () => void;
}) => {
  return (
    <div className="bg-[#1E1E1E] border border-gray-700 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Settings size={18} className="text-[#9433DC] flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Network:</span>
            <span className="font-medium text-[#9BDBFF]">{network}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">RPC:</span>
            <span className="font-medium text-[#9BDBFF] truncate">
              {rpcUrl}
            </span>
            <CopyButton copyText={rpcUrl} className="flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-400">Account:</span>
            <span className="font-medium text-[#9BDBFF] truncate">
              {account}
            </span>
            <CopyButton copyText={account} className="flex-shrink-0" />
          </div>
        </div>
      </div>
      <button
        onClick={onExpand}
        className="ml-4 text-gray-400 hover:text-[#9BDBFF] transition-colors flex-shrink-0"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
};
