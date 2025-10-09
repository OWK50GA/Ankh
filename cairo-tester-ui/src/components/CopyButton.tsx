import { Check, Copy } from "lucide-react";
import { useState } from "react";

export const CopyButton = ({ copyText, className }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 hover:bg-[#2A2A2A] rounded transition-colors ${className}`}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
};
