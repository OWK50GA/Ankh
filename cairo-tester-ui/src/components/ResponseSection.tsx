import { Loader2 } from "lucide-react";
import { CopyButton } from "./CopyButton";

export const ResponseSection = ({
  response,
  isLoading,
  selectedFunction,
}: any) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="animate-spin text-[#9433DC]" size={24} />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        Response will appear here
      </div>
    );
  }

  const isView = selectedFunction?.state_mutability === "view";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {response.error ? (
            <>
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-medium text-red-400">Failure</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-500">
                Success
              </span>
            </>
          )}
        </div>
        {response.executionTime && (
          <span className="text-xs text-gray-500">
            Time: {response.executionTime}s
          </span>
        )}
      </div>

      {isView && response.result !== undefined && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Result</h4>
          <div className="bg-[#1E1E1E] rounded-lg p-4 font-mono text-sm">
            <pre className="whitespace-pre-wrap break-words text-gray-300">
              {typeof response.result === "object"
                ? JSON.stringify(response.result, null, 2)
                : String(response.result)}
            </pre>
          </div>
        </div>
      )}

      {!isView && response.txHash && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Transaction Hash
          </h4>
          <div className="bg-[#1E1E1E] rounded-lg p-3 flex items-center justify-between">
            <code className="text-sm text-gray-300 truncate mr-2">
              {response.txHash}
            </code>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton copyText={response.txHash} />
              <a
                href={`https://sepolia.voyager.online/tx/${response.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#9433DC] hover:text-[#D57B52] transition-colors"
              >
                View on Explorer →
              </a>
            </div>
          </div>
        </div>
      )}

      {response.error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-400 mb-2">Error</h4>
          <p className="text-sm text-red-300">{response.error}</p>
        </div>
      )}
    </div>
  );
};
