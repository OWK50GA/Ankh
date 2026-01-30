import { useEffect, useState } from "react";
import type { AbiFunction } from "../types";
import { 
    applyNamedJsonToForm, 
    applyPositionalJsonToForm, 
    createNamedObjectFromForm, 
    createPositionalArrayFromForm, 
} from "../utils";
import { useConfig } from "../contexts/cairoTesterContext";

type Props = {
  selectedFunction: AbiFunction | null,
  form: Record<string, any>,
  setForm: (updater: (prev: Record<string, any> | undefined) => Record<string, any>) => void,
  mode?: "named" | "positional",
};

export default function RawArgsEditor({
  selectedFunction,
  form,
  setForm,
  mode = "named",
}: Props) {
  const [tab, setTab] = useState<"named" | "positional">(mode);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAppliedJson, setLastAppliedJson] = useState<any | null>(null);


  const { contractFunctionsData } = useConfig();

  useEffect(() => {
    if (!selectedFunction || !contractFunctionsData) {
      setText("");
      setError(null);
      return;
    }

    try {
      if (tab === "named") {
        const named = createNamedObjectFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(named, null, 2));
      } else {
        const arr = createPositionalArrayFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(arr, null, 2));
      }
      setError(null);
    } catch (err: any) {
      setError(String(err.message || err));
    }
  }, [selectedFunction, JSON.stringify(form ?? {}), tab]);

  useEffect(() => {
    if (!selectedFunction || !contractFunctionsData) return;
    const t = setTimeout(() => {
      if (!text.trim()) {
        setError(null);
        return;
      }
      try {
        const parsed = JSON.parse(text);
        if (tab === "named") {
          if (Array.isArray(parsed) || typeof parsed !== "object") {
            throw new Error("Named mode expects a JSON object (key -> value).");
          }
          try {
            applyNamedJsonToForm(selectedFunction, parsed, contractFunctionsData.abi, setForm);
          } catch (err) {
            setError(`Error Parsing json: ${(err as Error).message}`)
          }
        } else {
          if (!Array.isArray(parsed)) {
            throw new Error("Positional mode expects a JSON array.");
          }
          try {
            applyPositionalJsonToForm(selectedFunction, parsed, contractFunctionsData.abi, setForm);
          } catch (err) {
            setError(`Error Parsing json: ${(err as Error).message}`)
          }
        }
        setError(null);
        // onValidationError?.(null);
        setLastAppliedJson(parsed);
      } catch (err: any) {
        const msg = err?.message || String(err);
        setError(msg);
        // onValidationError?.(msg);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [text, tab, selectedFunction, setForm]);

  const handlePretty = () => {
    try {
      const parsed = JSON.parse(text || "{}");
      setText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {}
  };

  const handlePopulateFromAbi = () => {
    if (!selectedFunction || !contractFunctionsData) return;
    try {
      if (tab === "named") {
        const named = createNamedObjectFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(named, null, 2));
      } else {
        const arr = createPositionalArrayFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(arr, null, 2));
      }
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  const handleResetToForm = () => {
    // revert editor to original form-derived JSON
    if (!selectedFunction || !contractFunctionsData) return;
    try {
      if (tab === "named") {
        const named = createNamedObjectFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(named, null, 2));
      } else {
        const arr = createPositionalArrayFromForm(selectedFunction, form, contractFunctionsData.abi);
        setText(JSON.stringify(arr, null, 2));
      }
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  };

  if (!selectedFunction) {
    return <div className="text-sm text-gray-400">Select a function to use Raw mode</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <button
          className={`px-3 py-1 rounded ${tab === "named" ? "bg-blue-600" : "bg-gray-700"}`}
          onClick={() => setTab("named")}
        >
          Named
        </button>
        <button
          className={`px-3 py-1 rounded ${tab === "positional" ? "bg-blue-600" : "bg-gray-700"}`}
          onClick={() => setTab("positional")}
        >
          Positional
        </button>
        <div className="ml-auto text-xs text-gray-400">
          {error ? <span className="text-red-400">{error}</span> : <span>JSON OK</span>}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="px-2 py-1 text-sm rounded bg-gray-700" onClick={handlePretty}>Format</button>
        <button className="px-2 py-1 text-sm rounded bg-gray-700" onClick={handlePopulateFromAbi}>Populate</button>
        <button className="px-2 py-1 text-sm rounded bg-gray-700" onClick={handleResetToForm}>Reset</button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tab === "named" ? '{ "owner": "0x...", "amount": 10 }' : '[ "0x...", 10 ]'}
        className="w-full min-h-[180px] p-2 text-sm font-mono bg-[#0f0f10] rounded border border-gray-700"
      />

      <div className="flex items-center justify-between text-xs">
        <div className={`flex-1 ${error ? "text-red-400" : "text-green-400"}`}>
          {error ? `Error: ${error}` : "JSON looks good"}
        </div>
        <div className="text-gray-400">
          {lastAppliedJson ? "Applied" : "Not applied"}
        </div>
      </div>
    </div>
  );
}
