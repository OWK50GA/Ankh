import { useEffect, useState } from "react";
import { useConfig } from "../contexts/cairoTesterContext";
import toast from "react-hot-toast";
import {
  addError,
  deployContract,
  getConstructorWithArgs,
  getFunctionInputKey,
  getInitialFormState,
} from "../utils";
import ContractInput from "./ContractInput";
import { ConfigStatusBar } from "./ConfigStatusBar";
import type { Address } from "@starknet-react/chains";
import type {
  AccountInfo,
  ContractArtifact,
  FormErrorMessageState,
} from "../types";
import { ContractStatus } from "./ContractStatus";
import { ConfigurationPanel } from "./ConfigurationPanel";
import { CallData } from "starknet";

type NetworkType = "devnet" | "sepolia" | "mainnnet";

type FormInputFields = {
  network: NetworkType;
  rpcUrl: string;
  account: Address;
  classHash?: string;
  contractAddress?: Address;
};

export default function ConfigurationForm({
  contractData,
  accountInfo,
}: {
  contractData: ContractArtifact;
  accountInfo: AccountInfo;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeployed, setIsDeployed] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const { setContractData, setAccountInfo, setContractFunctionsData } =
    useConfig();

  const notifySuccessful = (message: string) => {
    return toast.success(message);
  };

  const notifyFailed = (message: string) => {
    return toast.error(message);
  };

  useEffect(() => {
    if (accountInfo.privateKey !== "") {
      setAccountInfo((prev) => ({
        ...prev,
        privateKey: accountInfo.privateKey,
      }));
    }

    if (accountInfo.rpcUrl !== "") {
      setAccountInfo((prev) => ({ ...prev, rpcUrl: accountInfo.rpcUrl }));
    }

    if (accountInfo.walletAddress !== "") {
      setAccountInfo((prev) => ({
        ...prev,
        walletAddress: accountInfo.walletAddress,
      }));
    }
  }, [accountInfo]);

  const { constructor } = getConstructorWithArgs(contractData.abi);

  const [formInputValues, setFormInputValues] = useState<FormInputFields>({
    network: "sepolia",
    rpcUrl: accountInfo.rpcUrl,
    account: accountInfo.walletAddress as Address,
  });

  const [form, setForm] = useState<Record<string, any>>(() =>
    getInitialFormState(constructor),
  );
  // const [inputValue, setInputValue] = useState<any | undefined>(undefined);
  const [formErrorMessage, setFormErrorMessage] =
    useState<FormErrorMessageState>({});

  const inputElements = constructor.inputs.map((input, index) => {
    const key = getFunctionInputKey(constructor.name, input, index);

    return (
      <ContractInput
        abi={contractData.abi}
        setForm={setForm}
        form={form}
        stateObjectKey={key}
        paramType={input}
        setFormErrorMessage={setFormErrorMessage}
        stateMutability="view"
      />
    );
  });

  // For constructor form
  const formIsValid = (values: any[]): boolean => {
    const expectedLength = constructor.inputs.length;

    // Check length first
    if (values.length !== expectedLength) {
      return false;
    }

    // Check each value
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const inputType = constructor.inputs[i].type;

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

  const handleDeploy = async () => {
    setIsValidating(true);
    const values = Object.values(form);
    const isValid = formIsValid(values);
    if (!isValid) {
      notifyFailed("Fill form completely/correctly");
      throw new Error("Form not valid, recheck");
    }
    setIsValidating(false);
    setDeploying(true);

    try {
      console.log(form);
      console.log("logged form");
      const calldata = new CallData(contractData.abi).compile(
        "constructor",
        values,
      );
      console.log(calldata);

      const { contract, classHash } = await deployContract(
        contractData,
        accountInfo.rpcUrl,
        accountInfo.walletAddress,
        accountInfo.privateKey,
        calldata,
      );

      if (!contract) {
        throw new Error("Deployment unsuccessful");
      }

      console.log(contract);

      // setContractAddress((contract.address as `0x${string}`))

      setContractFunctionsData((prev: any) => ({
        ...prev,
        contractAddress: contract.address as `0x${string}`,
      }));
      setContractData((prev: any) => ({
        ...prev,
        contractAddress: contract.address as `0x${string}`,
      }));
      setFormInputValues((prev: any) => ({
        ...prev,
        contractAddress: contract.address,
        classHash,
      }));

      notifySuccessful("Deployment successful");
      setIsDeployed(true);
      setIsExpanded(false);
    } catch (err) {
      console.error("Error compiling form", err);
      notifyFailed(`Deployment failed, ${(err as Error).message}`);
    } finally {
      setDeploying(false);
    }
  };

  // For configuration form
  const handleLoadContract = () => {
    console.log("Loading...");

    try {
      const { contractAddress, classHash } = formInputValues;

      if (!contractAddress) {
        notifyFailed("Add contractAddress to load an already-deployed version");
        throw new Error("Add contractAddress to load contract");
      }

      setContractData((prev: any) => ({
        ...prev,
        contractAddress,
        ...(classHash && { classHash: classHash }),
      }));

      setContractFunctionsData((prev: any) => ({
        ...prev,
        contractAddress,
        ...(classHash && { classHash }),
      }));
      notifySuccessful("Contract Loaded Successfully");
      setIsDeployed(true);
      setIsExpanded(false);
    } catch (err) {
      console.error("Error loading contract", err);
      notifyFailed(`Error loading contract: ${(err as Error).message}`);
    }
  };

  // const jsonAbi = JSON.stringify(contractData.abi);

  return (
    <div className="bg-[#161616] text-[#9BDBFF] p-4">
      <h1 className="text-2xl font-bold mb-6">{contractData.name}</h1>

      <div className="max-w-6xl space-y-4">
        {/* Collapsed State - Status Bar */}
        {!isExpanded && !isDeployed && (
          <ConfigStatusBar
            network={formInputValues.network}
            rpcUrl={formInputValues.rpcUrl}
            account={formInputValues.account}
            onExpand={() => setIsExpanded(true)}
          />
        )}

        {/* Collapsed State - Contract Loaded */}
        {!isExpanded && isDeployed && (
          <ContractStatus
            contractName={contractData.name}
            contractAddress={contractData.contractAddress}
            classHash={contractData.classHash}
            onConfigure={() => setIsExpanded(true)}
          />
        )}

        {/* Expanded State */}
        {isExpanded && (
          <ConfigurationPanel
            contractData={contractData}
            accountInfo={accountInfo}
            formInputValues={formInputValues}
            setFormInputValues={setFormInputValues}
            form={form}
            // form={form}
            inputElements={inputElements}
            deploying={deploying}
            validating={isValidating}
            handleDeploy={handleDeploy}
            handleLoadContract={handleLoadContract}
            onCollapse={() => setIsExpanded(false)}
          />
        )}
      </div>
    </div>
  );
}
