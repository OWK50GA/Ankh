import type { Abi } from "abi-wan-kanabi"
import type { AbiFunction, FormErrorMessageState } from "../types";
import type { Address } from "@starknet-react/chains";
import { useRef, useState } from "react";
import { addError, getArgsAsStringInputFromForm, getFunctionInputKey, getInitialFormState, getTopErrorMessage, isError, shortenAddress } from "../utils";
import { Account, CallData, constants, RpcProvider } from "starknet";
import { useConfig } from "../contexts/cairoTesterContext";
import ContractInput from "./ContractInput";
import toast from "react-hot-toast";
import CopyButton from "./CopyButton";

export default function WriteContractForm ({
    abi, abiFunction, contractAddress
}: {
    abi: Abi;
    abiFunction: AbiFunction;
    onChange: () => void;
    contractAddress?: Address;
}) {

    const [form, setForm] = useState<Record<string, any>>(() =>
        getInitialFormState(abiFunction),
    );
    const [_inputValue, setInputValue] = useState<any | undefined>(undefined);
    const [formErrorMessage, setFormErrorMessage] =
        useState<FormErrorMessageState>({});
    const lastForm = useRef(form);
    const [isLoading, setIsLoading] = useState(false);
    const [_txHash, setTxHash] = useState<string>();

    const notifyFailed = (message: string) => {
        return toast.error(message)
    }
    
    const { accountInfo } = useConfig();
    const provider = new RpcProvider({ nodeUrl: accountInfo.rpcUrl });

    const readyForInteraction = !!contractAddress && contractAddress !== ("" as `0x${string}`) && contractAddress satisfies `0x${string}`

    const inputElements = abiFunction.inputs.map((input, index) => {
        const key = getFunctionInputKey(abiFunction.name, input, index);

        return (
            <ContractInput
                key={key}
                abi={abi}
                setForm={setForm}
                form={form}
                stateObjectKey={key}
                paramType={input}
                setFormErrorMessage={setFormErrorMessage}
            />
        )
    });

    const formIsValid = (values: any[]): boolean => {
        const expectedLength = abiFunction.inputs.length;
        
        // Check length first
        if (values.length !== expectedLength) {
            return false;
        }
        
        // Check each value
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const inputType = abiFunction.inputs[i].type;
            
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
                        addError(formErrorMessage, "zero_address_error", "Zero address value not allowed");
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
    }

    const zeroInputs = inputElements.length === 0
    // const showTxReceiptInLine = !zeroInputs && txHash;
    // const showTxReceiptBelow = zeroInputs && txHash;

    async function handleWrite() {
        if (!contractAddress) {
            throw new Error('Contract Not Deployed. No Address');
        }

        const inputValues = getArgsAsStringInputFromForm(form);
        console.log("InputValues: ", inputValues);

        const values = Object.values(form);
        console.log("Values: ", values);
        const isValid = formIsValid(values);

        if (!isValid) {
            notifyFailed("Values not filled completely");
            throw new Error("Values not filled completely");
        }

        if (JSON.stringify(form) !== JSON.stringify(lastForm.current)) {
            setInputValue(values);
            lastForm.current = form;
        }

        try {
            setIsLoading(true);
            const account = new Account(provider, accountInfo.walletAddress, accountInfo.privateKey, "1", constants.TRANSACTION_VERSION.V3)
            const calldata = new CallData(abi).compile(`${abiFunction.name}`, values);
            console.log("Calldata: ", calldata);

            const { transaction_hash } = await account.execute([
                {
                    contractAddress: contractAddress,
                    calldata,
                    entrypoint: `${abiFunction.name}`
                }
            ])

            console.log(transaction_hash);
            setTxHash(transaction_hash);
        } catch (err) {
            notifyFailed(`Error invoking contract: ${(err as Error).message}`);
            console.error("Error invoking contract: ", err);
        } finally {
            setIsLoading(false);
        }
        
    }

    return (
        <div className="py-5 space-y-3 first:pt-0 last:pb-1">
            <div
                className={`flex gap-3 ${
                zeroInputs ? "flex-row justify-between items-center" : "flex-col"
                }`}
            >
                <p className="font-medium my-0 break-words text-function">
                    {abiFunction.name}
                    {/* <InheritanceTooltip inheritedFrom={undefined} /> */}
                </p>
                {inputElements}

                {zeroInputs && (
                    <div>No arguments required</div>
                )}
                <div className="flex justify-between gap-2">
                    <div
                        className={`flex ${
                            isError(formErrorMessage) &&
                            "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                        }`}
                        data-tip={`${getTopErrorMessage(formErrorMessage)}`}
                    >
                        <button
                            className="btn bg-gradient-to-r from-[#9433DC] to-[#D57B52] shadow-none border-none text-white disabled:cursor-not-allowed px-2 py-2 rounded-md"
                            // disabled={writeDisabled || isError(formErrorMessage) || isLoading}
                            disabled={isLoading || !readyForInteraction}
                            onClick={handleWrite}
                        >
                            {/* {isLoading && (
                                <Loader2 />
                            )} */}
                            {isLoading ? 'Sending Tx...' : 'Send Tx'}
                        </button>
                    </div>
                    {_txHash && (
                        <div className="flex gap-2 items-center grow basis-0">
                            <p className="text-md">txHash: {shortenAddress(_txHash as `0x${string}`)}</p>
                            <CopyButton copyText={_txHash} className=""/>
                        </div>
                    )}
                </div>
            </div>
            {/* {showTxReceiptBelow && (
                <div className="grow basis-0">
                <TxReceipt txResult={txHash} />
                </div>
            )} */}
        </div>
    )
}