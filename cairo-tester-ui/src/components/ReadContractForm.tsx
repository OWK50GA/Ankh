import type { Abi } from "abi-wan-kanabi"
import type { AbiFunction, FormErrorMessageState } from "../types"
import { useRef, useState } from "react"
import { decodeContractResponse, getArgsAsStringInputFromForm, getFunctionInputKey, getInitialFormState, getTopErrorMessage, isError } from "../utils"
// import { useContract } from "@starknet-react/core"
import ContractInput from "./ContractInput"
import { Contract, RpcProvider } from "starknet"
import { useConfig } from "../contexts/cairoTesterContext"

export default function ReadContractForm({ contractAddress, abiFunction, abi }: {
    contractAddress?: `0x${string}`,
    abiFunction: AbiFunction,
    abi: Abi
}) {

    const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
    const [inputValue, setInputValue] = useState<any | undefined>(undefined);
    const [formErrorMessage, setFormErrorMessage] = useState<FormErrorMessageState>({});
    const lastForm = useRef(form);
    // const [error, setError] = useState<any>();

    const [data, setData] = useState<any>(null)

    console.log("From ReadContractForm: ", contractAddress);

    const { accountInfo } = useConfig();

    const readyForInteraction = !!contractAddress && contractAddress !== ("" as `0x${string}`) && contractAddress satisfies `0x${string}`

    // const { contract: contractInstance } = useContract({
    //     abi,
    //     address: contractAddress,
    // });
    const provider = new RpcProvider({ nodeUrl: accountInfo.rpcUrl });

    const contract = new Contract(abi, contractAddress!, provider);

    // const { isFetching, data, refetch, error } = useReadContract({
    //     abi,
    //     functionName: abiFunction.name,
    //     address: contractAddress,
    //     args: inputValue,
    //     enabled: !!inputValue && !!contractInstance,
    // });

    // useEffect(() => {
    //     if (error) {
    //     console.error(error?.message);
    //     console.error(error.stack);
    //     }
    // }, [error]);

    const zeroInputs = abiFunction.inputs.length === 0;

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

    async function handleRead() {
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

        try {
            const data = await contract.call(`${abiFunction.name}`, inputValue);
            console.log(data);
            setData(() => data);
        } catch (err) {
            // setError(err as Error);
            console.error((err as Error).message);
        }

        // refetch();
    }

    return (
        <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
            <p className="font-medium my-0 break-words text-function">
                {abiFunction.name}
            </p>
            {inputElements}
            {zeroInputs && (
                <div>No arguments required</div>
            )}
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
                    {/* {Object.values(error).length !== 0 && (
                        <div>
                            {error}
                        </div>
                    )} */}
                </div>

                <div
                    className={`flex ${
                        isError(formErrorMessage) &&
                        "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                    }`}
                    data-tip={`${getTopErrorMessage(formErrorMessage)}`}
                >
                    <button
                        className="btn bg-gradient-to-r from-[#9433DC] to-[#D57B52] btn-sm shadow-none border-none text-white px-2 py-2 rounded-md disabled:cursor-not-allowed"
                        onClick={handleRead}
                        disabled={(inputValue) || isError(formErrorMessage) || !readyForInteraction}
                    >
                        {inputValue && (
                        <span className="loading loading-spinner loading-xs"></span>
                        )}
                        Read 📡
                    </button>
                </div>
            </div>
        </div>
    )
}