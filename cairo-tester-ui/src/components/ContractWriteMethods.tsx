import type { ContractFunctionData } from "../types";

export default function ContractWriteMethods ({ contractFunctionData }: {
    contractFunctionData: ContractFunctionData
}) {
    return (
        <div className="">
            ContractWrite Functions
            {contractFunctionData.classHash}
        </div>
    )
}