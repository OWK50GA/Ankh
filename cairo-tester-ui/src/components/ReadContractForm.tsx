import type { Abi } from "abi-wan-kanabi"
import type { AbiFunction, FormErrorMessageState } from "../types"
import { useEffect, useRef, useState } from "react"
import { decodeContractResponse, getArgsAsStringInputFromForm, getFunctionInputKey, getInitialFormState, getTopErrorMessage, isError } from "../utils"
import { useContract, useReadContract } from "@starknet-react/core"
import ContractInput from "./ContractInput"

export default function ReadContractForm({ contractAddress, abiFunction, abi }: {
    contractAddress?: `0x${string}`,
    abiFunction: AbiFunction,
    abi: Abi
}) {

    const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
    const [inputValue, setInputValue] = useState<any | undefined>(undefined);
    const [formErrorMessage, setFormErrorMessage] = useState<FormErrorMessageState>({});
    const lastForm = useRef(form);

    const { contract: contractInstance } = useContract({
        abi,
        address: contractAddress,
    });

    const { isFetching, data, refetch, error } = useReadContract({
        abi,
        functionName: abiFunction.name,
        address: contractAddress,
        args: inputValue,
        enabled: !!inputValue && !!contractInstance,
    });

    useEffect(() => {
        if (error) {
        console.error(error?.message);
        console.error(error.stack);
        }
    }, [error]);

    const inputElements = abiFunction.inputs.map((input, index) => {
        const key = getFunctionInputKey(abiFunction.name, input, index);

        return (
            <ContractInput 
                abi={abi}
                key={key}
                form={form}
                setForm={setForm}
                stateObjectKey={key}
                paramType={input}
                setFormErrorMessage={setFormErrorMessage}
            />
        )
    })

    function handleRead() {
        const newInputValue = getArgsAsStringInputFromForm(form);
        const expectedArgCount = abiFunction.inputs.length;

        const isValid = 
            Array.isArray(newInputValue) &&
            expectedArgCount === newInputValue.length && 
            newInputValue.every((arg) => arg !== undefined && arg !== null && arg !== "");
        
        if (!isValid) {
            return;
        }

        if (JSON.stringify(form) !== JSON.stringify(lastForm.current)) {
            setInputValue(newInputValue);
            lastForm.current = form;
        }

        refetch();
    }

    return (
        <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
            <p className="font-medium my-0 break-words text-function">
                {abiFunction.name}
            </p>
            {inputElements}
            <div className="flex justify-between gap-2 flex-wrap">
                <div className="grow w-4/5">
                {data !== null && data !== undefined && (
                    <div className="bg-input text-sm px-4 py-1.5 break-words">
                    <p className="font-bold m-0 mb-1">Result:</p>
                    <pre className="whitespace-pre-wrap break-words">
                        {decodeContractResponse({
                        resp: data,
                        abi,
                        functionOutputs: abiFunction?.outputs,
                        asText: true,
                        })}
                    </pre>
                    </div>
                )}
                </div>

                <div
                className={`flex ${
                    isError(formErrorMessage) &&
                    "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                }`}
                data-tip={`${getTopErrorMessage(formErrorMessage)}`}
                >
                <button
                    className="btn bg-gradient-dark btn-sm shadow-none border-none text-white"
                    onClick={handleRead}
                    disabled={(inputValue && isFetching) || isError(formErrorMessage)}
                >
                    {inputValue && isFetching && (
                    <span className="loading loading-spinner loading-xs"></span>
                    )}
                    Read 📡
                </button>
                </div>
            </div>
        </div>
    )
}