import type { Abi } from "abi-wan-kanabi";
import type { ContractFunctionData } from "../types";
import { getFunctionsByStateMutability } from "../utils";
import WriteContractForm from "./WriteContractForm";

export default function ContractWriteMethods ({ contractFunctionData }: {
    contractFunctionData: ContractFunctionData
}) {

    const functionsToDisplay = getFunctionsByStateMutability(
        (contractFunctionData.abi || []) as Abi, "external"
    )
        .map((func) => {
            return func
        })

    if (functionsToDisplay.length === 0) {
        return (
            <div>
                No Write Methods
            </div>
        )
    }


    return (
        <div className="">
            {functionsToDisplay.map((func, index) => (
                <WriteContractForm
                    abi={contractFunctionData.abi}
                    abiFunction={func}
                    onChange={() => {}}
                    contractAddress={contractFunctionData.contractAddress}
                    key={index}
                />
            ))}
        </div>
    )
}