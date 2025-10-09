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

import type { Abi } from "abi-wan-kanabi";
import type { AbiParameter, FormErrorMessageState } from "../../types";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import ContractInput from "../ContractInput";
import { parseGenericType } from "../../utils";

type ArrayProps = {
  abi: Abi;
  abiParameter: AbiParameter;
  parentForm: Record<string, any> | undefined;
  // setParentForm: Dispatch<SetStateAction<Record<string, any>>> | ((form: Record<string, any>) => void);
  setParentForm: (form: Record<string, any>) => void;
  parentStateObjectKey: string;
  setFormErrorMessage: Dispatch<SetStateAction<FormErrorMessageState>>;
  isDisabled?: boolean;
};

export const ArrayInput = ({
  abi,
  parentForm,
  setParentForm,
  parentStateObjectKey,
  abiParameter,
  setFormErrorMessage,
  isDisabled,
}: ArrayProps) => {
  // array in object representation
  const [inputArr, setInputArr] = useState<any>({});
  const [arrLength, setArrLength] = useState<number>(-1);
  console.log("ArrayInput mount:", parentStateObjectKey, parentForm);

  const elementType = useMemo(() => {
    const parsed = parseGenericType(abiParameter.type);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  }, [abiParameter.type]);

  // side effect to transform data before setState
  useEffect(() => {
    // non empty objects only
    setParentForm({
      ...parentForm,
      [parentStateObjectKey]: Object.values(inputArr).filter(
        (item) => item !== null,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(inputArr, (_key: string, value: unknown) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    }),
  ]);

  // useEffect(() => {
  //   const existing = parentForm?.[parentStateObjectKey];
  //   if (Array.isArray(existing) && existing.length > 0) {
  //     const obj: Record<string, any> = {};
  //     existing.forEach((v: any, i: number) => (obj[i] = v));
  //     setInputArr(obj);
  //     setArrLength(existing.length - 1);
  //   } else {
  //     setInputArr({});
  //     setArrLength(-1);
  //   }
  // }, [parentForm, parentStateObjectKey])

  // const callSetParentForm = (next: Record<string, any>) => {
  //   if (typeof setParentForm === "function" && (setParentForm as any).length === 1) {
  //     (setParentForm as (f: Record<string, any>) => void)(next);
  //   } else {
  //     (setParentForm as Dispatch<SetStateAction<Record<string, any>>>)(next);
  //   }
  // };

  // useEffect(() => {
  //   try {
  //     const base = parentForm ?? {};
  //     const arrValue = Object.values(inputArr).filter((item) => item !== null);
  //     const next = {
  //       ...base,
  //       [parentStateObjectKey]: arrValue,
  //     };

  //     if ((setParentForm as Dispatch<SetStateAction<Record<string, any>>>).length === 1) {
  //       (setParentForm as Dispatch<SetStateAction<Record<string, any>>>)((prev) => ({
  //         ...(prev ?? {}),
  //         [parentStateObjectKey]: arrValue
  //       }));
  //     } else {
  //       callSetParentForm(next);
  //     }
  //   } catch (err) {
  //     console.error("ArrayInput: Error syncing parent form: ", err);
  //   }
  // }, [JSON.stringify(inputArr, (_key: string, value: unknown) => {
  //   if (typeof value === "bigint") return value.toString();
  //   return value;
  // })]);

  return (
    <div>
      <div className="pl-4">
        {/* <input type="checkbox" className="min-h-fit" /> */}
        <div className="p-0 min-h-fit peer-checked:mb-2">
          <p className="m-0 p-0 text-sm">array (length: {arrLength + 1})</p>
        </div>
        <div className="ml-3 flex-col space-y-4 peer-checked:mb-3 border-l-2 pl-4 mt-2.5">
          {/*  do note here that the "index" are basically array keys */}
          {Object.keys(inputArr).map((index) => {
            console.log("Input Array index", index);
            console.log("inputArr: ", inputArr);
            return (
              <ContractInput
                abi={abi}
                key={index}
                isDisabled={isDisabled}
                setForm={(
                  nextInputRecipe:
                    | Record<string, any>
                    | ((arg: Record<string, any>) => void),
                ) => {
                  // if we find a function (a.k.a setState recipe), we run it to generate the next state based on recpe, else just use the object passed in
                  const nextInputObject: Record<string, any> =
                    typeof nextInputRecipe === "function"
                      ? nextInputRecipe(parentForm!)
                      : nextInputRecipe;

                  setInputArr((currentInputArray: any) => {
                    return {
                      ...currentInputArray,
                      [index]: nextInputObject?.[index] || "",
                    };
                  });
                }}
                form={inputArr}
                stateObjectKey={index}
                paramType={
                  {
                    name: `${abiParameter.name}[${index}]`,
                    type: elementType,
                  } as AbiParameter
                }
                setFormErrorMessage={setFormErrorMessage}
              />
            );
          })}
          <div className="flex gap-3">
            <button
              onClick={() => {
                const nextLength = arrLength + 1;
                setInputArr((prev: any) => ({
                  ...prev,
                  [nextLength]: "",
                }));
                setArrLength(nextLength);
              }}
              className="bg-blue-500 shadow-none text-white rounded-md px-3 py-1"
            >
              {/* + Add (push) */}+
            </button>
            <button
              className="bg-blue-500 shadow-none text-white rounded-md px-3 py-1"
              onClick={() => {
                if (arrLength > -1) {
                  const nextInputArr = { ...inputArr };
                  delete nextInputArr[arrLength];
                  setInputArr(nextInputArr);
                  setArrLength((prev) => prev - 1);
                }
              }}
            >
              {/* - Remove (pop) */}-
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
