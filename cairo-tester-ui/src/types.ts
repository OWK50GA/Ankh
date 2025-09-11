// export type AbiStateMutability = "view" | "external"

export type ContractFunctionData = {
    abi: any[];
    classHash?: string;
    contractAddress?: `0x${string}`;
}

export type VSCodeAPI = {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
}

declare global {
    interface Window {
        vscode: VSCodeAPI;
    }
}

export type ContractData = {
    name: string;
    abi: any[];
    compiledSierra: any[];
}

/* Abi-related issh from abi-wan-kanabi */

export type AbiParameter = {
  name: string;
  type: string;
};

export type AbiOutput = {
  type: string;
};

export type AbiStateMutability = "view" | "external";

export type AbiImpl = {
  type: "impl";
  name: string;
  interface_name: string;
};

export type AbiInterface = {
  type: "interface";
  name: string;
  items: readonly AbiFunction[];
};

export type AbiConstructor = {
  type: "constructor";
  name: "constructor";
  inputs: readonly AbiParameter[];
};

export type AbiFunction = {
  type: "function";
  name: string;
  inputs: readonly AbiParameter[];
  outputs: readonly AbiOutput[];
  state_mutability: AbiStateMutability;
};

export type AbiStruct = {
  type: "struct";
  name: string;
  members: readonly AbiParameter[];
};

export type AbiEnum = {
  type: "enum";
  name: string;
  variants: readonly AbiParameter[];
};

// Abi shit over

export type FormErrorMessageState = {
    [x: string]: string;
}

export type CommonInputProps<T = string> = {
  value: T;
  onChange: (newValue: T) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
};