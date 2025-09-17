import type { Address } from "@starknet-react/chains";
// import { useAccount } from "@starknet-react/core";
import { useEffect, useRef, useState } from "react"
import type { AccountInfo, ContractArtifact, FormErrorMessageState } from "../types";
import { addError, deployContract, getConstructorWithArgs, getFunctionInputKey, getInitialFormState, getTopErrorMessage, isError } from "../utils";
import ContractInput from "./ContractInput";
import { useConfig } from "../contexts/cairoTesterContext";
import { CallData } from "starknet";

type NetworkType = "devnet" | "sepolia" | "mainnnet";

type FormInputFields = {
    network: NetworkType;
    rpcUrl: string;
    account: Address;
    classHash?: string;
    contractAddress?: Address;
}

export default function ConfigurationForm({ contractData, accountInfo }: {
    contractData: ContractArtifact;
    accountInfo: AccountInfo;
}) {
    
    const { setContractData, setAccountInfo, setContractFunctionsData } = useConfig();

    useEffect(() => {
        if (accountInfo.privateKey !== "") {
            setAccountInfo(prev => ({...prev, privateKey: accountInfo.privateKey}))
        }

        if (accountInfo.rpcUrl !== "") {
            setAccountInfo(prev => ({...prev, rpcUrl: accountInfo.rpcUrl}))
        }

        if (accountInfo.walletAddress !== "") {
            setAccountInfo(prev => ({...prev, walletAddress: accountInfo.walletAddress}))
        }
    }, [accountInfo])


    const [deploying, setDeploying] = useState(false);

    // const { address } = useAccount();

    const { constructor } = getConstructorWithArgs(contractData.abi)

    const [formInputValues, setFormInputValues] = useState<FormInputFields>({
        network: "sepolia",
        rpcUrl: accountInfo.rpcUrl,
        account: (accountInfo.walletAddress as Address)
    })

    const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(constructor));
    // const [inputValue, setInputValue] = useState<any | undefined>(undefined);
    const [formErrorMessage, setFormErrorMessage] = useState<FormErrorMessageState>({});
    // @ts-ignore
    const lastForm = useRef(form);

    const inputElements = constructor.inputs.map((input, index) => {
        const key = getFunctionInputKey(constructor.name, input, index)

        return (
            <ContractInput 
                abi={contractData.abi}
                setForm={setForm}
                form={form}
                stateObjectKey={key}
                paramType={input}
                setFormErrorMessage={setFormErrorMessage}
            />
        )
    })

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

    const handleDeploy = async () => {
        const values = Object.values(form);
        const isValid = formIsValid(values);
        if (!isValid) {
            throw new Error("Form not valid, recheck");
        };
        setDeploying(true);

        try {
            console.log(form);
            console.log("logged form");
            const calldata = new CallData(contractData.abi).compile("constructor", values);
            console.log(calldata);

            const contract = await deployContract(
                contractData,
                accountInfo.rpcUrl,
                accountInfo.walletAddress,
                accountInfo.privateKey,
                calldata
            )

            if (!contract) {
                throw new Error("Deployment unsuccessful");
            }

            console.log(contract);

            // setContractAddress((contract.address as `0x${string}`))
            
            setContractFunctionsData(prev => ({...prev as any, contractAddress: contract.address as `0x${string}`}));
            setContractData(prev => ({...prev as any, contractAddress: (contract.address as `0x${string}`)}));

        } catch (err) {
            console.error("Error compiling form", err);
        } finally {
            setDeploying(false);
        }
    }

    // For configuration form
    const handleLoadContract = () => {
        if (!formInputValues.contractAddress || formInputValues.contractAddress === ("" as `0x${string}`)) {
            throw new Error("Add contractAddress to Load contract");
        }

        setContractData(prev => ({
            ...(prev as any), 
            contractAddress: formInputValues.contractAddress,
            classHash: formInputValues.classHash,
        }))

    }

    return (
        <div className="bg-[#161616] rounded-2xl px-4 py-4 flex flex-col gap-10 w-fit h-fit">
            <form className="flex flex-col gap-2">
                <div className="flex flex-col md:flex-row flex-wrap gap-8 text-md">
                    <div className="flex-col flex gap-1.5">
                        <label htmlFor="">
                            Network
                        </label>
                        <span className={`flex border bg-[#1e1e1e] items-center justify-start gap-4 h-10 rounded-lg p-4 focus-within:border-[#d57b52]`}>
                            <input 
                                type="text"
                                // For now, just sepolia is active
                                readOnly
                                value={formInputValues.network} 
                                onChange={(e) => {
                                    setFormInputValues(prev => ({...prev, network: (e.target.value as NetworkType )}))
                                }}
                                className="outline-none w-[300px]"
                            />
                        </span>

                        {/* <span className=>
                            <PiEnvelopeSimpleFill className='text-gray-600'/>
                            <input 
                                type="text" 
                                className='outline-none' 
                                placeholder='e.g. alex@email.com'
                                {...register('email')}
                            />
                            <div className='hidden md:flex text-sm text-[#FF3939] font-light'>
                                {errors.email ? errors.email.message : ''}
                            </div>
                        </span> */}
                    </div>

                    <div className="flex-col flex gap-1.5">
                        <label htmlFor="">RpcUrl</label>
                        <span className="flex border bg-[#1e1e1e] items-center justify-start gap-4 h-10 rounded-lg p-4 focus-within:border-[#d57b52]">
                            <input 
                                type="text"
                                // For now, we are using the rpc Url from env
                                readOnly
                                value={formInputValues.rpcUrl}
                                onChange={(e) => {
                                    setFormInputValues(prev => ({...prev, rpcUrl: e.target.value}))
                                }}
                                className="outline-none w-[300px]"
                            />
                        </span>
                    </div>

                    <div className="flex-col flex gap-1.5">
                        <label htmlFor="">Account</label>
                        <span className="flex border bg-[#1e1e1e] items-center justify-start gap-4 h-10 rounded-lg p-4 focus-within:border-[#d57b52]">
                            <input 
                                type="text"
                                // Should be readOnly because the values should come from env
                                readOnly
                                value={formInputValues.account}
                                onChange={(e) => {
                                    setFormInputValues(prev => ({...prev, account: (e.target.value as `0x${string}`)}))
                                }}
                                className="outline-none w-[300px]"
                            />
                        </span>
                    </div>

                    <div className="flex-col flex gap-1.5">
                        <label htmlFor="">ClassHash</label>
                        <span className="flex border bg-[#1e1e1e] items-center justify-start gap-4 h-10 rounded-lg p-4 focus-within:border-[#d57b52]">
                            <input 
                                type="text"
                                // Should be readOnly because I do not want it editable now
                                readOnly
                                value={formInputValues.classHash}
                                onChange={(e) => {
                                    setFormInputValues(prev => ({...prev, classHash: e.target.value}))
                                }}
                                className="outline-none w-[300px]"
                            />
                        </span>
                    </div>

                    <div className="flex-col flex gap-1.5">
                        <label htmlFor="">ContractAddress</label>
                        <span className="flex border bg-[#1e1e1e] items-center justify-start gap-4 h-10 rounded-lg p-4 focus-within:border-[#d57b52]">
                            <input 
                                type="text"
                                value={formInputValues.contractAddress}
                                onChange={(e) => {
                                    setFormInputValues(prev => ({...prev, contractAddress: (e.target.value as `0x${string}`)}))
                                }}
                                className="outline-none w-[300px]"
                            />
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5">
                    <button
                        className="bg-gradient-to-r from-[#9433DC] to-[#D57B52] cursor-pointer px-4 py-2.5 rounded-lg"
                        onClick={handleLoadContract}
                    >
                        Load Contract
                    </button>
                    <button
                        className="bg-gradient-to-r from-[#9433DC] to-[#D57B52] cursor-pointer px-4 py-2.5 rounded-lg"
                        onClick={() => {}}
                    >
                        Save Settings
                    </button>
                </div>
            </form>

            <div className="flex flex-col bg-[#161616]">
                <p>Constructor Calldata</p>

                {inputElements}

                <div
                    className={`flex ${
                        isError(formErrorMessage) &&
                        "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                    }`}
                    data-tip={`${getTopErrorMessage(formErrorMessage)}`}
                >
                    <button
                        className="btn bg-gradient-to-r from-[#9433DC] to-[#D57B52] shadow-none border-none text-white px-4 py-2.5 rounded-md mt-3"
                        onClick={() => handleDeploy()}
                        disabled={deploying}
                    >
                        {/* {inputValue && isFetching && (
                        <span className="loading loading-spinner loading-xs"></span>
                        )} */}
                        Deploy
                    </button>
                </div>
            </div>
        </div>
    )
}