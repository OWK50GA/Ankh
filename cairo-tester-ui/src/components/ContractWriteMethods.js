import { getFunctionsByStateMutability } from "../utils";
import WriteContractForm from "./WriteContractForm";
export default function ContractWriteMethods({ contractFunctionData }) {
    const functionsToDisplay = getFunctionsByStateMutability((contractFunctionData.abi || []), "external")
        .map((func) => {
        return func;
    });
    if (functionsToDisplay.length === 0) {
        return (<div>
                No Write Methods
            </div>);
    }
    return (<div className="">
            {functionsToDisplay.map((func, index) => (<WriteContractForm abi={contractFunctionData.abi} abiFunction={func} onChange={() => { }} contractAddress={contractFunctionData.contractAddress} key={index}/>))}
        </div>);
}
//# sourceMappingURL=ContractWriteMethods.js.map