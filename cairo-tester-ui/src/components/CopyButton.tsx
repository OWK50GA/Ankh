import { useEffect, useState } from "react";
import { CheckCircle, CopyIcon } from "lucide-react";

function CopyButton({ copyText, className, }: {
    copyText: string,
    className: string,
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setIsCopied(false);
    }, 1500);

    return () => clearTimeout(id);
  }, [isCopied]);

  function handleFallbackCopy(text: string) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const successful = document.execCommand("copy");
      setIsCopied(successful);
    } catch (error) {
      console.error("Fallback: Oops, unable to copy", error);
    }
    document.body.removeChild(textarea);
  }
  function handleCopyClick(e: any) {
    e.stopPropagation();
    if (!copyText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(copyText)
        .then(() => setIsCopied(true))
        .catch((err) => console.log(err));
    } else {
      handleFallbackCopy(copyText);
    }
  }
  return (
    <button
      aria-label={isCopied ? "Copied!" : "copy"}
      aria-live="assertive"
      title={isCopied ? "Copied!" : "click to copy address"}
      onClick={(e) => {
        e.preventDefault();
        handleCopyClick(e);
      }}
      className={className}
    >
      <span aria-hidden>
        {isCopied ? <CheckCircle className="bg-green-500 text-white text-[2px]"/> : <CopyIcon className="text-[6px]"/>}
      </span>
    </button>
  );
}

export default CopyButton;