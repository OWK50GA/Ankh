// import { parseEther } from "ethers";
import { useEffect, useState } from "react";
import { isValidInteger } from "../../utils";
import { InputBase } from "./inputBase";
export const IntegerInput = ({ value, onChange, name, placeholder, disabled, variant = "core::integer::u256", 
// disableMultiplyBy1e18 = false,
onError, }) => {
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
            if (!isIntValid)
                onError("Invalid number input");
        }
    }, [value, variant, onError]);
    return (<InputBase name={name} value={value} placeholder={placeholder} error={inputError} onChange={onChange} disabled={disabled}/>);
};
//# sourceMappingURL=integerInput.js.map