import type { Abi } from "abi-wan-kanabi";
import type { AbiEnum, AbiStruct, FormErrorMessageState } from "../../types";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  getFunctionInputKey,
  getInitialTupleFormState,
  isCairoOption,
} from "../../utils";
import ContractInput from "../ContractInput";

type StructProps = {
  abi?: Abi;
  parentForm: Record<string, any> | undefined;
  setParentForm: (form: Record<string, any>) => void;
  parentStateObjectKey: string;
  abiMember?: AbiStruct | AbiEnum;
  setFormErrorMessage: Dispatch<SetStateAction<FormErrorMessageState>>;
  isDisabled?: boolean;
};

export const Struct = ({
  parentForm,
  setParentForm,
  parentStateObjectKey,
  abiMember,
  abi,
  setFormErrorMessage,
  isDisabled = false,
}: StructProps) => {
  const [form, setForm] = useState<Record<string, any>>(() =>
    getInitialTupleFormState(
      abiMember ?? { type: "struct", name: "", members: [] },
    ),
  );

  // select enum
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  // side effect to transform data before setState
  useEffect(() => {
    const values = Object.values(form);
    const argsStruct: Record<string, any> = {};
    if (!abiMember) return;

    if (abiMember.type === "struct") {
      abiMember.members.forEach((member, index) => {
        argsStruct[member.name || `input_${index}_`] = {
          type: member.type,
          value: values[index],
        };
      });
    } else {
      abiMember.variants.forEach((variant, index) => {
        argsStruct[variant.name || `input_${index}_`] = {
          type: variant.type,
          value: index === activeVariantIndex ? values[index] : undefined,
        };
      });
    }

    setParentForm({
      ...parentForm,
      [parentStateObjectKey]:
        abiMember.type === "struct" ? argsStruct : { variant: argsStruct },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    abiMember,
    JSON.stringify(form, (_key: string, value: unknown) => {
      if (typeof value === "bigint") return value.toString();
      return value;
    }),
    activeVariantIndex,
  ]);

  console.log(
    "Struct received abiMember:",
    abiMember,
    "for key",
    parentStateObjectKey,
  );

  if (!abiMember) {
    console.log("Abi member not found");
    return null;
  }

  return (
    <div>
      <div className={`pl-4 pt-1.5`}>
        {/* {!isDisabled && <input type="checkbox" className="min-h-fit peer" />} */}
        <div
          className={`p-0 min-h-fit peer-checked:mb-2 text-primary-content/50 ${
            isDisabled && "cursor-not-allowed pb-2"
          } `}
        >
          <p className="m-0 p-0 text-[1rem]">{abiMember.type}</p>
        </div>
        <div className="ml-3 flex-col space-y-4 border-secondary/80 peer-checked:mb-3 border-l-2 pl-4">
          {abiMember.type === "struct"
            ? abiMember.members.map((member, index) => {
                const key = getFunctionInputKey(
                  abiMember.name || "struct",
                  member,
                  index,
                );
                return (
                  <ContractInput
                    setFormErrorMessage={setFormErrorMessage}
                    abi={abi}
                    setForm={setForm}
                    form={form}
                    key={index}
                    stateObjectKey={key}
                    paramType={{ name: member.name, type: member.type }}
                  />
                );
              })
            : abiMember.variants.map((variant, index) => {
                const key = getFunctionInputKey(
                  abiMember.name || "tuple",
                  variant,
                  index,
                );

                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="relative rounded-md p-[1px] w-fit">
                      <input
                        type="checkbox"
                        name={`radio-${index}`}
                        className="radio radio-xs radio-secondary focus-within:border-transparent focus-within:outline-none bg-[#1E1E1E] border border-gray-600 w-full text-xs placeholder:text-[#9596BF] text-neutral rounded-md"
                        checked={index === activeVariantIndex}
                        onChange={() => {}}
                        onClick={() => {
                          setActiveVariantIndex(index);
                        }}
                      />
                    </div>
                    <ContractInput
                      setFormErrorMessage={setFormErrorMessage}
                      abi={abi}
                      setForm={setForm}
                      form={form}
                      key={index}
                      stateObjectKey={key}
                      paramType={variant}
                      isDisabled={
                        index !== activeVariantIndex ||
                        // this will disable the input box if the variant is None
                        // added option type check for safety
                        (isCairoOption(abiMember.name) &&
                          variant.name === "None")
                      }
                    />
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};
