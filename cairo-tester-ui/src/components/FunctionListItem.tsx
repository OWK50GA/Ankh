import { ChevronRight } from "lucide-react";
import type { AbiFunction } from "../types";

export const FunctionListItem = ({
  func,
  isSelected,
  onClick,
  type,
}: {
  func: AbiFunction;
  isSelected: boolean;
  onClick: () => void;
  type: "view" | "external";
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group ${
        isSelected
          ? "bg-gradient-to-r from-[#9433DC] to-[#D57B52] text-white"
          : "hover:bg-[#2A2A2A] text-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            type === "view" ? "bg-blue-400" : "bg-orange-400"
          }`}
        />
        <span className="truncate">{func.name}</span>
      </div>
      {isSelected && <ChevronRight size={14} className="flex-shrink-0" />}
    </button>
  );
};
