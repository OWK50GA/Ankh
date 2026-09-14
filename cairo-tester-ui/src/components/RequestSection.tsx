import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { AbiFunction, FormErrorMessageState } from "../types";
import ContractInput from "./ContractInput";
import type { Abi } from "abi-wan-kanabi";
import { Loader2 } from "lucide-react";
import {
  addError,
  decodeContractResponse,
  getArgsAsStringInputFromForm,
  getFunctionInputKey,
} from "../utils";
import { useConfig } from "../contexts/cairoTesterContext";
import toast from "react-hot-toast";
import { Account, CallData, Contract, RpcProvider } from "starknet";
import RawArgsEditor from "./RawArgsEditor";

export const RequestSection = ({
  selectedFunction,
  form,
  setForm,
  abi,
  isLoading,
  setIsLoading,
  readyForInteraction,
  setResponse,
  //   setFormErrorMessage
}: {
  selectedFunction: AbiFunction;
  form: Record<string, any>;
  setForm: Dispatch<SetStateAction<Record<string, any>>>;
  abi: Abi;
  isLoading: boolean;
  onExecute?: () => void;
  readyForInteraction: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setResponse: Dispatch<SetStateAction<any>>;
  // setFormErrorMessage: Dispatch<SetStateAction<FormErrorMessageState>>
}) => {
  if (!selectedFunction) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a function to get started
      </div>
    );
  }

  const { contractData, accountInfo } = useConfig();
  if (!contractData) return;

  //   const [form, setForm] = useState<Record<string, any>>(() =>
  //         getInitialFormState(selectedFunction),
  //     );
  const [_inputValue, setInputValue] = useState<any | undefined>(undefined);

  const lastForm = useRef(form);

  const { contractAddress } = contractData;

  const [formErrorMessage, setFormErrorMessage] =
    useState<FormErrorMessageState>({});

  const [dataEntryFormat, setDataEntryFormat] = useState<"formData" | "raw">("formData");

  const notifyFailed = (message: string) => {
    return toast.error(message, {
      duration: 3000
    });
  };

  const notifySuccess = (message: string) => {
    return toast.success(message, {
      duration: 3000
    });
  };

  const formIsValid = (values: any[]): boolean => {
    const expectedLength = selectedFunction.inputs.length;

    // Check length first
    if (values.length !== expectedLength) {
      return false;
    }

    // Check each value
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const inputType = selectedFunction.inputs[i].type;

      // Check for empty values
      if (value === undefined || value === null || value === "") {
        return false;
      }

      // Special handling for contract addresses
      if (inputType === "core::starknet::contract_address::ContractAddress") {
        try {
          const addressBigint = BigInt(value);

          // Check for zero address
          if (addressBigint === BigInt(0)) {
            addError(
              formErrorMessage,
              "zero_address_error",
              "Zero address value not allowed",
            );
            return false;
          }

          if (!(value as string).startsWith("0x")) {
            return false;
          }
        } catch (err) {
          console.error(err);
          return false;
        }
      }
    }

    // All checks passed
    return true;
  };

  const zeroInputs = selectedFunction.inputs.length === 0;
  const isView = selectedFunction.state_mutability === "view";

  async function handleWrite() {
    if (!contractAddress) {
      throw new Error("Contract Not Deployed. No Address");
    }

    const inputValues = getArgsAsStringInputFromForm(form);
    console.log("InputValues: ", inputValues);

    const values = Object.values(form);
    console.log("Values: ", values);
    const isValid = formIsValid(inputValues);

    if (!isValid) {
      notifyFailed("Values not filled completely");
      return;
    }

    if (JSON.stringify(form) !== JSON.stringify(lastForm.current)) {
      setInputValue(inputValues);
      lastForm.current = form;
    }

    const provider = new RpcProvider({ nodeUrl: accountInfo.rpcUrl });

    try {
      setIsLoading(true);
      const account = new Account({
        provider,
        address: accountInfo.walletAddress,
        signer: accountInfo.privateKey,
        cairoVersion: "1"
      })
      const calldata = new CallData(abi).compile(
        `${selectedFunction.name}`,
        inputValues,
      );

      console.log("Calldata: ", calldata);

      const { transaction_hash } = await account.execute([
        {
          contractAddress: contractAddress,
          calldata,
          entrypoint: `${selectedFunction.name}`,
        },
      ]);

      notifySuccess("Transaction Sent Successfully");
      setInputValue(undefined);
      console.log(transaction_hash);
      setResponse({
        txHash: transaction_hash,
        executionTime: null,
      });
      // setTxHash(transaction_hash);
    } catch (err) {
      notifyFailed(`Error invoking contract: ${(err as Error).message}`);
      console.error("Error invoking contract: ", (err as Error).message);
      setResponse({
        error: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRead() {
    if (!contractAddress) {
      notifyFailed("Contract not deployed, no address available");
    }

    const provider = new RpcProvider({ nodeUrl: accountInfo.rpcUrl });
    const contract = new Contract({
      abi,
      address: contractAddress!,
      providerOrAccount: provider
    })
    const newInputValue = getArgsAsStringInputFromForm(form);
    const expectedArgCount = selectedFunction.inputs.length;

    const isValid =
      Array.isArray(newInputValue) &&
      expectedArgCount === newInputValue.length &&
      newInputValue.every(
        (arg) => arg !== undefined && arg !== null && arg !== "",
      );

    if (!isValid) {
      notifyFailed("Complete the Form Values");
      return;
    }

    // if (JSON.stringify(form) !== JSON.stringify(lastForm.current)) {
    //     setInputValue(newInputValue);
    //     lastForm.current = form;
    // }

    setIsLoading(true);
    setResponse(null);
    try {
      const data = await contract.call(
        `${selectedFunction.name}`,
        newInputValue,
      );
      console.log("Read result", data);

      let displayResult;
      try {
        displayResult = decodeContractResponse({
          resp: data,
          abi,
          functionOutputs: selectedFunction?.outputs,
          asText: false, // Get object instead of string
        });
      } catch (decodeError) {
        console.warn("Could not decode response, using raw data:", decodeError);
        displayResult = data;
      }

      setResponse({
        result: displayResult || data,
        rawResult: data,
        // executionTime: null
      });

      notifySuccess("Read successful");
    } catch (err) {
      notifyFailed(`Error reading contract: ${(err as Error).message}`);
      console.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExecute() {
    selectedFunction.state_mutability === "view" ? handleRead() : handleWrite();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            {selectedFunction.name}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                isView
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}
            >
              {isView ? "View" : "External"}
            </span>
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">Parameters</h4>

        {/* Tabs */}
        <div>
          <button
            onClick={() => setDataEntryFormat("formData")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              dataEntryFormat === "formData"
                ? "text-[#9BDBFF]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            form-data
            {dataEntryFormat === "formData" && (
              <div className={`absolute bottom-0 left-0 right-0 h-[1px] 
                ${selectedFunction.state_mutability === "view" ? "bg-blue-400" : "bg-orange-400"} 
              `}></div>
            )}
          </button>

          <button
            onClick={() => setDataEntryFormat("raw")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              dataEntryFormat === "raw"
                ? "text-[#9BDBFF]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            raw
            {dataEntryFormat === "raw" && (
              <div className={`absolute bottom-0 left-0 right-0 h-[1px] 
                ${selectedFunction.state_mutability === "view" ? "bg-blue-400" : "bg-orange-400"} 
              `}></div>
            )}
          </button>
        </div>

        {zeroInputs ? (
          <div className="bg-[#1E1E1E] rounded-lg p-4 text-center text-gray-500 text-sm">
            No arguments required
          </div>
        ) : (
          dataEntryFormat === "formData" ? (
            <div className="space-y-3">
              {selectedFunction.inputs.map((input, index) => (
                <ContractInput
                  key={getFunctionInputKey(selectedFunction.name, input, index)}
                  abi={abi}
                  form={form}
                  setForm={setForm}
                  stateObjectKey={getFunctionInputKey(
                    selectedFunction.name,
                    input,
                    index,
                  )}
                  paramType={input}
                  setFormErrorMessage={setFormErrorMessage}
                  stateMutability={selectedFunction.state_mutability}
                />
              ))}
            </div>
          ) : (
            <RawArgsEditor 
              selectedFunction={selectedFunction}
              form={form}
              setForm={setForm}
              mode="named"
            />
          )
          
        )}
      </div>

      <div className="flex justify-start">
        <button
          onClick={handleExecute}
          disabled={!readyForInteraction || isLoading}
          className={`${isView ? 'bg-blue-600' : 'bg-orange-500'} px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 text-white`}
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading
            ? isView
              ? "Reading..."
              : "Sending Tx..."
            : isView
              ? "Read 🚀"
              : "Send Tx 🚀"}
        </button>
      </div>
    </div>
  );
};
