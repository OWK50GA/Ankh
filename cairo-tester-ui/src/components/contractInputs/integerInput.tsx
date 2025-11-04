// import { parseEther } from "ethers";
import { useEffect, useState } from "react";
import type { CommonInputProps } from "../../types";
import { isValidInteger } from "../../utils";
import { InputBase } from "./inputBase";
// import {
//   CommonInputProps,
//   InputBase,
//   isValidInteger,
// } from "~~/components/scaffold-stark";

type IntegerInputProps = CommonInputProps<string | bigint> & {
  variant?: string;
  disableMultiplyBy1e18?: boolean;
  onError?: (message: string | null) => void;
  stateMutability: "view" | "external"
};

export const IntegerInput = ({
  value,
  onChange,
  name,
  placeholder,
  disabled,
  variant = "core::integer::u256",
  stateMutability,
  // disableMultiplyBy1e18 = false,
  onError,
}: IntegerInputProps) => {
  const [inputError, setInputError] = useState(false);
  // const multiplyBy1e18 = useCallback(() => {
  //   if (!value) {
  //     return;
  //   }

  //   return inputError
  //     ? onChange(value)
  //     : onChange(parseEther(value.toString()).toString());
  // }, [onChange, value, inputError]);

  useEffect(() => {
    const isIntValid = isValidInteger(variant, value);
    setInputError(!isIntValid);
    if (onError) {
      onError(null);
      if (!isIntValid) onError("Invalid number input");
    }
  }, [value, variant, onError]);

  return (
    <InputBase
      name={name}
      value={value}
      placeholder={placeholder}
      error={inputError}
      onChange={onChange}
      disabled={disabled}
      stateMutability={stateMutability}
      // suffix={
      //   !inputError &&
      //   !disabled &&
      //   !disableMultiplyBy1e18 && (
      //     <div
      //       className="space-x-4 flex tooltip tooltip-top tooltip-primary before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none text-white"
      //       data-tip="Multiply by 10^18"
      //     >
      //       <button
      //         className={`${
      //           disabled ? "cursor-not-allowed" : "cursor-pointer"
      //         } font-semibold px-4 text-accent bg-gradient-to-r from-[#9433DC] to-[#D57B52] rounded-md`}
      //         onClick={multiplyBy1e18}
      //         disabled={disabled}
      //       >
      //         ∗
      //       </button>
      //     </div>
      //   )
      // }
    />
  );
};
