// import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
// import { getFunctionInputKey, getInitialTupleFormState } from "./utilsContract";
// import {
//   AbiEnum,
//   AbiParameter,
//   AbiStruct,
// } from "../../types";
// import { replacer } from "~~/utils/scaffold-stark/common";
// import { ContractInput } from "./ContractInput";
// import { Abi } from "abi-wan-kanabi";
// import { parseGenericType } from "~~/utils/scaffold-stark";
// import { FormErrorMessageState } from "./utilsDisplay";
import { useEffect, useMemo, useState } from "react";
import ContractInput from "../ContractInput";
import { parseGenericType } from "../../utils";
export const ArrayInput = ({ abi, parentForm, setParentForm, parentStateObjectKey, abiParameter, setFormErrorMessage, isDisabled, }) => {
    // array in object representation
    const [inputArr, setInputArr] = useState({});
    const [arrLength, setArrLength] = useState(-1);
    const elementType = useMemo(() => {
        const parsed = parseGenericType(abiParameter.type);
        return Array.isArray(parsed) ? parsed[0] : parsed;
    }, [abiParameter.type]);
    // side effect to transform data before setState
    useEffect(() => {
        // non empty objects only
        setParentForm({
            ...parentForm,
            [parentStateObjectKey]: Object.values(inputArr).filter((item) => item !== null),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(inputArr, (_key, value) => {
            if (typeof value === "bigint")
                return value.toString();
            return value;
        })]);
    return (<div>
      <div className="collapse bg-base-200 pl-4 pt-1.5 border-2 border-secondary custom-after">
        <input type="checkbox" className="min-h-fit peer"/>
        <div className="collapse-title p-0 min-h-fit peer-checked:mb-2 text-primary-content/50">
          <p className="m-0 p-0 text-[1rem]">array (length: {arrLength + 1})</p>
        </div>
        <div className="ml-3 flex-col space-y-4 border-secondary/80 peer-checked:mb-3 border-l-2 pl-4 collapse-content">
          {/*  do note here that the "index" are basically array keys */}
          {Object.keys(inputArr).map((index) => {
            return (<ContractInput abi={abi} key={index} isDisabled={isDisabled} setForm={(nextInputRecipe) => {
                    // if we find a function (a.k.a setState recipe), we run it to generate the next state based on recpe, else just use the object passed in
                    const nextInputObject = typeof nextInputRecipe === "function"
                        ? nextInputRecipe(parentForm)
                        : nextInputRecipe;
                    setInputArr((currentInputArray) => {
                        return {
                            ...currentInputArray,
                            [index]: nextInputObject?.[index] || null,
                        };
                    });
                }} form={inputArr} stateObjectKey={index} paramType={{
                    name: `${abiParameter.name}[${index}]`,
                    type: elementType,
                }} setFormErrorMessage={setFormErrorMessage}/>);
        })}
          <div className="flex gap-3">
            <button onClick={() => {
            const nextLength = arrLength + 1;
            setInputArr((prev) => ({
                ...prev,
                [nextLength]: null,
            }));
            setArrLength(nextLength);
        }} className="bg-gradient-to-r from-[#9433DC] to-[#D57B52] shadow-none border border-success text-white rounded-md">
              + Add (push)
            </button>
            <button className="bg-gradient-to-r from-[#9433DC] to-[#D57B52] shadow-none border border-error text-white rounded-md" onClick={() => {
            if (arrLength > -1) {
                const nextInputArr = { ...inputArr };
                delete nextInputArr[arrLength];
                setInputArr(nextInputArr);
                setArrLength((prev) => prev - 1);
            }
        }}>
              - Remove (pop)
            </button>
          </div>
        </div>
      </div>
    </div>);
};
//# sourceMappingURL=Array.js.map