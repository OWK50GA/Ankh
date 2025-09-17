import { getFunctionsByStateMutability } from "../utils";
import ReadContractForm from "./ReadContractForm";
export default function ContractReadMethods({ contractFunctionData }) {
    if (!contractFunctionData) {
        return null;
    }
    const functionsToDisplay = getFunctionsByStateMutability((contractFunctionData.abi || []), "view")
        .map((func) => {
        return func;
    });
    console.log("Here are the functions to display: ", functionsToDisplay);
    console.log(functionsToDisplay);
    if (functionsToDisplay.length === 0) {
        return (<div>
                No Read Methods
            </div>);
    }
    return (<div>
            {functionsToDisplay.map((func) => (<ReadContractForm abi={contractFunctionData.abi} contractAddress={contractFunctionData.contractAddress} abiFunction={func} key={func.name}/>))}
        </div>);
}
//# sourceMappingURL=ContractReadMethods.js.map