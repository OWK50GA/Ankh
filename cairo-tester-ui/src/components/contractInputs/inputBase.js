import { useCallback, useEffect, useRef, } from "react";
export const InputBase = ({ name, value, onChange, placeholder, error, disabled, prefix, suffix, reFocus, }) => {
    const inputReft = useRef(null);
    let modifier = "";
    if (error) {
        modifier = "border-error";
    }
    else if (disabled) {
        modifier = "border-disabled bg-base-300";
    }
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);
    // Runs only when reFocus prop is passed, useful for setting the cursor
    // at the end of the input. Example AddressInput
    // @ts-ignore
    const onFocus = (e) => {
        if (reFocus !== undefined) {
            e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length);
        }
    };
    useEffect(() => {
        if (reFocus !== undefined && reFocus === true)
            inputReft.current?.focus();
    }, [reFocus]);
    return (<div className={`flex bg-input text-accent ${modifier}`}>
      {prefix}
      <input className="focus-within:border-transparent focus-within:outline-1 outline-[#D57B52]  bg-[#1E1E1E] h-[2.2rem] min-h-[2.2rem] px-4 border w-full text-xs placeholder:text-[#9596BF] text-neutral rounded-md" placeholder={placeholder} name={name} value={value?.toString() || ""} onChange={handleChange} disabled={disabled} autoComplete="off" ref={inputReft} onFocus={onFocus}/>
      {suffix}
    </div>);
};
//# sourceMappingURL=inputBase.js.map