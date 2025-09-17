import { Account, cairo, CairoCustomEnum, CairoOption, CairoOptionVariant, CairoResult, CairoResultVariant, constants, Contract, extractContractHashes, getChecksumAddress, num, RpcError, RpcProvider, stark, transaction } from "starknet";
import { formatEther, ZeroAddress } from "ethers";
const convertStringInputToBool = (input) => {
    if (new Set(["true", "1", "0x1", "0x01, 0x001"]).has(input)) {
        return true;
    }
    else if (new Set(["false", "0", "0x0", "0x00", "0x000"]).has(input)) {
        return false;
    }
    return true;
};
function isValidNumber(input) {
    // Check for empty string
    if ((input || "").length === 0)
        return false;
    // Check if it's a valid hex number (starts with '0x' or '0X')
    if (/^0x[0-9a-fA-F]+$/i.test(input || "")) {
        return true;
    }
    // Check for a valid decimal number (including scientific notation and floating points)
    const decimalNumberRegex = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
    return decimalNumberRegex.test(input || "");
}
function isValidHexNumber(input) {
    // Check for empty string
    if ((input || "").length === 0)
        return false;
    // Check if it's a valid hex number (starts with '0x' or '0X')
    return /^0x[0-9a-fA-F]+$/i.test(input || "");
}
const baseNumberType = new Set([
    "core::integer::u512",
    "core::integer::u256",
    "core::zeroable::NonZero::<core::integer::u256>",
    "core::integer::u128",
    "core::integer::u64",
    "core::integer::u32",
    "core::integer::u16",
    "core::integer::u8",
    "core::integer::i256",
    "core::integer::i128",
    "core::integer::i64",
    "core::integer::i32",
    "core::integer::i16",
    "core::integer::i8",
]);
const baseHexType = new Set(["core::felt252"]);
const baseType = new Set([
    "core::starknet::contract_address::ContractAddress",
    "core::starknet::eth_address::EthAddress", // Kept for backward compatibility
    "core::starknet::class_hash::ClassHash",
    "core::felt252",
    "core::integer::u512",
    "core::integer::u256",
    "core::zeroable::NonZero::<core::integer::u256>",
    "core::integer::u128",
    "core::integer::u64",
    "core::integer::u32",
    "core::integer::u16",
    "core::integer::u8",
    "core::integer::i256",
    "core::integer::i128",
    "core::integer::i64",
    "core::integer::i32",
    "core::integer::i16",
    "core::integer::i8",
    "core::bool",
    "core::bytes_31::bytes31",
    "core::byte_array::ByteArray",
]);
const hexToAscii = (hexString) => {
    if (!hexString) {
        return "";
    }
    if (hexString.length <= 2 || hexString.length % 2 !== 0) {
        return "";
    }
    if (hexString.startsWith("0x")) {
        hexString = hexString.slice(2);
    }
    let asciiString = "";
    for (let i = 0; i < hexString.length; i += 2) {
        const hexCode = hexString.slice(i, i + 2);
        const charCode = parseInt(hexCode, 16);
        asciiString += String.fromCharCode(charCode);
    }
    return asciiString;
};
const getFieldType = (type, abi) => {
    if (type.startsWith("core::array::Array") ||
        /^\([^()]*\)$/.test(type) ||
        baseType.has(type)) {
        return { type };
    }
    return abi.find((item) => item.name === type);
};
// EXPORTS
export const zeroAddress = ZeroAddress;
export function getFunctionsByStateMutability(abi, stateMutability) {
    return abi
        .reduce((acc, part) => {
        if (part.type === "function") {
            acc.push(part);
        }
        else if (part.type === "interface" && Array.isArray(part.items)) {
            part.items.forEach((item) => {
                if (item.type === "function") {
                    acc.push(item);
                }
            });
        }
        return acc;
    }, [])
        .filter((func) => {
        return (func.state_mutability === stateMutability);
    });
}
export const getInitialTupleFormState = (abiParameter) => {
    const initialForm = {};
    if (abiParameter.type === "struct") {
        abiParameter.members.forEach((member, memberIndex) => {
            const key = getFunctionInputKey(abiParameter.name, member, memberIndex);
            initialForm[key] = "";
        });
    }
    else {
        abiParameter.variants.forEach((variant, variantIndex) => {
            const key = getFunctionInputKey(abiParameter.name, variant, variantIndex);
            initialForm[key] = "";
        });
    }
    return initialForm;
};
export function getFunctionInputKey(functionName, input, index) {
    const name = input.name || `input_${index}_`;
    return `${functionName}_${name}_${input.type}`;
}
export function getInitialFormState(abiFunction) {
    const initialForm = {};
    if (!abiFunction.inputs)
        return initialForm;
    abiFunction.inputs.forEach((input, index) => {
        const key = getFunctionInputKey(abiFunction.name, input, index);
        initialForm[key] = "";
    });
    return initialForm;
}
// export function getInitialConstructorFormState(abiConstructor: AbiConstructor) {
//   const initialConstructorForm: Record<string, any> = {};
//   if (!abiConstructor.inputs) return initialConstructorForm;
//   abiConstructor.inputs.forEach((input, index) => {
//     const key = getFunctionInputKey(abiConstructor.name, input, index);
//     initialConstructorForm[key] = ""
//   })
//   return initialConstructorForm
// }
export const getArgsAsStringInputFromForm = (form) => {
    const _encodeValueFromKey = (key = "", value) => {
        // array
        if (isCairoArray(key)) {
            const genericType = parseGenericType(key)[0];
            return value.map((arrayValue) => _encodeValueFromKey(genericType, arrayValue));
        }
        // enum & struct
        if (!key.includes("core::") || isCairoResult(key) || isCairoOption(key)) {
            // alias it so that we have better name
            const structObject = value;
            // this indicates enum
            if (Object.keys(structObject).includes("variant")) {
                // construct empty enums
                const enumObject = structObject.variant;
                const enumVariants = Object.keys(enumObject);
                // check for option
                if (enumVariants.includes("Some") &&
                    enumVariants.includes("None") &&
                    isCairoOption(key)) {
                    // for some value we return with the corresponding value
                    if (enumObject.Some.value !== undefined)
                        return new CairoOption(CairoOptionVariant.Some, _encodeValueFromKey(enumObject.Some.type, enumObject.Some.value));
                    // set to none as default
                    return new CairoOption(CairoOptionVariant.None);
                }
                // check for result
                if (enumVariants.includes("Ok") &&
                    enumVariants.includes("Err") &&
                    isCairoResult(key)) {
                    // for some value we return with the corresponding value
                    if (enumObject.Ok.value !== undefined)
                        return new CairoResult(CairoResultVariant.Ok, _encodeValueFromKey(enumObject.Ok.type, enumObject.Ok.value));
                    else if (typeof enumObject.Err.value !== undefined) {
                        return new CairoResult(CairoResultVariant.Err, _encodeValueFromKey(enumObject.Err.type, enumObject.Err.value));
                    }
                }
                const activeVariant = enumVariants.find((variant) => {
                    const v = enumObject[variant];
                    return v && (v.value !== undefined || v.value === "");
                });
                const restructuredEnum = activeVariant
                    ? {
                        [activeVariant]: enumObject[activeVariant].value !== undefined
                            ? _encodeValueFromKey(enumObject[activeVariant].type, enumObject[activeVariant].value)
                            : undefined,
                    }
                    : {};
                return new CairoCustomEnum(restructuredEnum);
            }
            // map out values
            const remappedEntries = Object.entries(structObject).map(([structObjectKey, structObjectValue]) => {
                return [
                    structObjectKey,
                    _encodeValueFromKey(structObjectValue.type, structObjectValue.value),
                ];
            });
            return Object.fromEntries(remappedEntries);
        }
        // encode tuple input
        if (isCairoTuple(key)) {
            const tupleKeys = parseTuple(key.replace(/^.*\(/, "("));
            const tupleValues = parseTuple(value);
            return cairo.tuple(...tupleValues.map((tupleValue, index) => _encodeValueFromKey(tupleKeys[index], tupleValue)));
        }
        // translate boolean input
        if (isCairoBool(key))
            return convertStringInputToBool(value);
        if (isValidHexNumber(value) &&
            (isCairoBigInt(key) ||
                isCairoInt(key) ||
                isCairoFelt(key) ||
                isCairoU256(key))) {
            return num.toBigInt(value);
        }
        if (isValidNumber(value) &&
            (isCairoBigInt(key) ||
                isCairoInt(key) ||
                isCairoFelt(key) ||
                isCairoU256(key))) {
            return num.toBigInt(value);
        }
        return value;
    };
    return Object.keys(form).map((key) => _encodeValueFromKey(key, form[key]));
};
function adjustInput(value) {
    return {
        ...value
    };
}
export function transformAbiFunction(abiFunction) {
    return {
        ...abiFunction,
        inputs: abiFunction.inputs.map((value) => adjustInput(value))
    };
}
export function addError(state, key, message) {
    return {
        ...state,
        [key]: message,
    };
}
export function clearError(state, key) {
    delete state[key];
    return state;
}
export function isError(state) {
    return Object.values(state).filter((value) => !!value).length > 0;
}
export function getTopErrorMessage(state) {
    if (!isError(state))
        return "";
    return Object.values(state).filter((value) => !!value)[0];
}
// TYPE-RELATED UTILS
export const isCairoInt = (type) => /core::integer::(u|i)(8|16|32)$/.test(type);
export const isCairoBigInt = (type) => /core::integer::(u|i)(64|128)$/.test(type);
export const isCairoU256 = (type) => /core::integer::u256$/.test(type) ||
    /core::zeroable::NonZero::<core::integer::u256>$/.test(type);
export const isCairoContractAddress = (type) => type.includes("core::starknet::contract_address::ContractAddress");
export const isCairoEthAddress = (type) => type.includes("core::starknet::eth_address::EthAddress");
export const isCairoClassHash = (type) => type.includes("core::starknet::class_hash::ClassHash");
export const isCairoFunction = (type) => type.includes("function");
export const isCairoVoid = (type) => type.includes("()");
export const isCairoBool = (type) => type.includes("core::bool");
export const isCairoBytes31 = (type) => type.includes("core::bytes_31::bytes31");
export const isCairoByteArray = (type) => type.includes("core::byte_array::ByteArray");
export const isCairoSecp256k1Point = (type) => type.includes("core::starknet::secp256k1::Secp256k1Point");
export const isCairoFelt = (type) => type.includes("core::felt252");
export const isCairoTuple = (type) => /\(([^)]+)\)/i.test(type);
export const isCairoSpan = (type) => type.includes("core::array::Span");
export const isCairoType = (type) => {
    return (isCairoInt(type) ||
        isCairoBigInt(type) ||
        isCairoU256(type) ||
        isCairoContractAddress(type) ||
        isCairoEthAddress(type) ||
        isCairoClassHash(type) ||
        isCairoFunction(type) ||
        isCairoVoid(type) ||
        isCairoBool(type) ||
        isCairoBytes31(type) ||
        isCairoByteArray(type) ||
        isCairoSecp256k1Point(type) ||
        isCairoFelt(type) ||
        isCairoTuple(type) ||
        isCairoSpan(type));
};
export function isStructOrEnum(member) {
    return member.type === "struct" || member.type === "enum";
}
export const isCairoArray = (type) => type.includes("core::array");
export const isCairoOption = (type) => type.includes("core::option");
export const isCairoResult = (type) => type.includes("core::result");
export const SIGNED_NUMBER_REGEX = /^-?\d*\.?\d*$/;
export const UNSIGNED_NUMBER_REGEX = /^\d*\.?\d*$/;
export const isValidInteger = (dataType, value) => {
    const isSigned = isSignedType(dataType);
    const bitcount = extractBitCount(dataType, isSigned);
    if (!isValidFormat(value, isSigned))
        return false;
    const valueAsBigInt = parseBigInt(value);
    if (valueAsBigInt === null)
        return false;
    if (isInvalidUnsignedValue(valueAsBigInt, isSigned))
        return false;
    return fitsWithinBitCount(valueAsBigInt, bitcount, isSigned);
};
// Helper functions:
const isSignedType = (dataType) => {
    return dataType.split("::").pop().startsWith("i");
};
const extractBitCount = (dataType, isSigned) => {
    return Number(dataType.substring(isSigned ? 3 : 4));
};
const isValidFormat = (value, isSigned) => {
    if (typeof value !== "string")
        return true;
    if (isSigned)
        return SIGNED_NUMBER_REGEX.test(value);
    return UNSIGNED_NUMBER_REGEX.test(value);
};
const parseBigInt = (value) => {
    try {
        const integerPart = value.toString().split(".")[0];
        return BigInt(integerPart);
    }
    catch {
        return null;
    }
};
const isInvalidUnsignedValue = (value, isSigned) => {
    return !isSigned && value < 0;
};
const fitsWithinBitCount = (value, bitcount, isSigned) => {
    const hexString = value.toString(16);
    const significantHexDigits = hexString.match(/.*x0*(.*)$/)?.[1] ?? "";
    if (significantHexDigits.length * 4 > bitcount)
        return false;
    // Check if the value is a negative overflow for signed integers.
    if (isSigned && significantHexDigits.length * 4 === bitcount) {
        const mostSignificantDigit = parseInt(significantHexDigits.slice(-1)?.[0], 16);
        if (mostSignificantDigit >= 8)
            return false;
    }
    return true;
};
// Treat any dot-separated string as a potential ENS name
const ensRegex = /.+\..+/;
export const isENS = (address = "") => ensRegex.test(address);
export function parseGenericType(typeString) {
    const match = typeString.match(/<([^>]*(?:<(?:[^<>]*|<[^>]*>)*>[^>]*)*)>/);
    if (!match)
        return typeString;
    const content = match[1];
    if (content.startsWith("(") && content.endsWith(")")) {
        return content; // Return the tuple as a single string
    }
    const types = content.split(/,(?![^\(\)]*\))/);
    return types.map((type) => type.trim());
}
export function parseTuple(value) {
    const values = [];
    let depth = 0;
    let current = "";
    for (const char of value) {
        if (char === "(") {
            if (depth > 0) {
                current += char;
            }
            depth++;
        }
        else if (char === ")") {
            depth--;
            if (depth > 0) {
                current += char;
            }
            else {
                values.push(current.trim());
                current = "";
            }
        }
        else if (char === "," && depth === 1) {
            values.push(current.trim());
            current = "";
        }
        else {
            current += char;
        }
    }
    return values;
}
// DISPLAY-RELATED UTILS - BUILD ON TYPE-RELATED UTILS
export function feltToHex(feltBigInt) {
    return `0x${feltBigInt.toString(16)}`;
}
export const displayTuple = (tupleString) => {
    return tupleString.replace(/\w+::/g, "");
};
export const displayType = (type) => {
    // render tuples
    if (type.at(0) === "(") {
        return displayTuple(type);
    }
    // arrays and options
    else if (isCairoResult(type) ||
        isCairoArray(type) ||
        isCairoOption(type) ||
        isCairoSpan(type)) {
        const kindOfArray = type.split("::").at(2);
        const parsed = parseGenericType(type);
        // special handling for result since we need to pop both types
        if (isCairoResult(type)) {
            const type1 = parsed[0].split("::").pop();
            const type2 = parsed[1].split("::").pop();
            return `Result<${type1}, ${type2}>`;
        }
        // others
        const arrayType = Array.isArray(parsed)
            ? parsed[0].split("::").pop()
            : `(${parsed
                .split(",")
                .map((t) => t.split("::").pop())
                .join(",")}`;
        return `${kindOfArray}<${arrayType}>`;
    }
    // result enum
    else if (type.includes("core::result")) {
        const types = type.split("::");
        return `${types.at(-4)}<${types.at(-2)?.split(",").at(0)},${types.at(-1)}`;
    }
    else if (type.includes("::")) {
        return type.split("::").pop();
    }
    return type;
};
// RESPONSE-RELATED
const _decodeContractResponseItem = (respItem, abiType, abi, showAsString) => {
    if (respItem === undefined) {
        return "";
    }
    if (abiType.type && baseNumberType.has(abiType.type)) {
        if (typeof respItem === "bigint") {
            if (respItem <= BigInt(Number.MAX_SAFE_INTEGER) &&
                respItem >= BigInt(Number.MIN_SAFE_INTEGER)) {
                return Number(respItem);
            }
            else {
                return "Ξ " + formatEther(respItem);
            }
        }
        return Number(respItem);
    }
    if (abiType.type &&
        abiType.type === "core::starknet::contract_address::ContractAddress") {
        return getChecksumAddress(feltToHex(respItem));
    }
    if (abiType.type && baseHexType.has(abiType.type)) {
        const hexString = feltToHex(respItem);
        if (showAsString) {
            return hexToAscii(hexString) || hexString;
        }
        return hexString;
    }
    if (abiType.type && abiType.type === "core::bool") {
        return respItem;
    }
    if (abiType.type && abiType.type === "core::byte_array::ByteArray") {
        if (showAsString) {
            return hexToAscii(respItem) || respItem;
        }
        return respItem;
    }
    // tuple
    if (abiType.type && /^\([^()]*\)$/.test(abiType.type)) {
        if (respItem === null || respItem === undefined) {
            return "";
        }
        try {
            const tupleMatch = abiType.type.match(/\(([^)]+)\)/);
            if (!tupleMatch || !tupleMatch[1]) {
                return String(respItem);
            }
            const tupleTypes = tupleMatch[1].split(/\s*,\s*/);
            if (typeof respItem !== "object") {
                return String(respItem);
            }
            const respKeys = respItem ? Object.keys(respItem) : [];
            if (tupleTypes.length !== respKeys.length) {
                return "";
            }
            const decodedArr = tupleTypes.map((type, index) => {
                return _decodeContractResponseItem(respItem[index], getFieldType(type, abi), abi);
            });
            return `(${decodedArr.join(",")})`;
        }
        catch (error) {
            console.error("Error processing tuple:", error);
            return String(respItem);
        }
    }
    // array
    if (abiType.type && abiType.type.startsWith("core::array::Array")) {
        const match = abiType.type.match(/<([^>]+)>/);
        const arrItemType = match ? match[1] : null;
        if (!arrItemType || !Array.isArray(respItem)) {
            return [];
        }
        return respItem.map((arrItem) => _decodeContractResponseItem(arrItem, getFieldType(arrItemType, abi), abi));
    }
    // span
    if (abiType.name && abiType.name.startsWith("core::array::Span")) {
        const match = abiType.name.match(/<([^>]+)>/);
        const spanItemType = match ? match[1] : null;
        if (!spanItemType || !Array.isArray(respItem)) {
            return [];
        }
        return respItem.map((spanItem) => _decodeContractResponseItem(spanItem, getFieldType(spanItemType, abi), abi));
    }
    // struct
    if (abiType.type === "struct") {
        const members = abiType.members;
        const decoded = {};
        for (const [structKey, structValue] of Object.entries(respItem)) {
            const structItemDef = (members || []).find((item) => item.name === structKey);
            if (structItemDef && structItemDef.type) {
                decoded[structKey] = _decodeContractResponseItem(structValue, structItemDef, abi);
            }
        }
        return decoded;
    }
    // option and result are enums but we don't want to process them as enums
    // possibly facing name or type that are defined as members of struct or standalone typing
    // we need the fallback so that it does not crash
    if (isCairoOption(abiType.name || "") ||
        isCairoOption(abiType.type || "") ||
        isCairoResult(abiType.name || "") ||
        isCairoResult(abiType.type || "")) {
        return respItem;
    }
    // enum
    if (abiType.type === "enum") {
        if (respItem === null || respItem === undefined) {
            return "";
        }
        if (typeof respItem === "number" || typeof respItem === "bigint") {
            const enumIndex = Number(respItem);
            if (Array.isArray(abiType.variants) && abiType.variants[enumIndex]) {
                return abiType.variants[enumIndex].name;
            }
            return enumIndex;
        }
        if (typeof respItem === "object" && respItem !== null) {
            if (respItem.variant) {
                const variant = respItem.variant;
                const variants = Array.isArray(abiType.variants)
                    ? abiType.variants
                    : [];
                for (const [enumKey, enumValue] of Object.entries(variant)) {
                    if (enumValue === undefined)
                        continue;
                    const enumItemDef = variants.find((item) => item.name === enumKey);
                    if (enumItemDef && enumItemDef.type) {
                        if (abiType.name === "contracts::your_contract::TransactionState") {
                            return enumKey;
                        }
                        const processedValue = _decodeContractResponseItem(enumValue, { type: enumItemDef.type }, abi);
                        return { [enumKey]: processedValue };
                    }
                }
            }
            const enumKeys = Object.keys(respItem);
            if (enumKeys.length === 1) {
                const enumKey = enumKeys[0];
                const enumValue = respItem[enumKey];
                if (abiType.name === "contracts::your_contract::TransactionState") {
                    return enumKey;
                }
                const enumVariant = abiType.variants?.find((v) => v.name === enumKey);
                if (enumVariant) {
                    const processedValue = _decodeContractResponseItem(enumValue, { type: enumVariant.type }, abi);
                    return { [enumKey]: processedValue };
                }
                return { [enumKey]: enumValue };
            }
        }
        return String(respItem);
    }
    return respItem;
};
export const decodeContractResponse = ({ resp, abi, functionOutputs, asText, showAsString, }) => {
    const abiTypes = (functionOutputs || [])
        .map((output) => output.type)
        .map((type) => getFieldType(type, abi));
    let arrResp = [resp];
    if (!abiTypes.length || arrResp.length !== abiTypes.length) {
        return JSON.stringify(resp, (_key, value) => {
            if (typeof value === "bigint")
                return value.toString();
            return value;
        }, 2);
    }
    const decoded = [];
    for (let index = 0; index < arrResp.length; index++) {
        decoded.push(_decodeContractResponseItem(arrResp[index], abiTypes[index], abi, showAsString));
    }
    const decodedResult = decoded.length === 1 ? decoded[0] : decoded;
    if (asText) {
        return typeof decodedResult === "string"
            ? decodedResult
            : JSON.stringify(decodedResult, (_key, value) => {
                if (typeof value === "bigint")
                    return value.toString();
                return value;
            });
    }
    return decodedResult;
};
export function getConstructorWithArgs(abi) {
    const constructor = abi.find((part) => part.type === "constructor");
    if (!constructor)
        return {};
    const constructorArgs = constructor.inputs;
    return {
        constructor, constructorArgs
    };
}
export function getCompiledSierra(contractData) {
    return {
        sierra_program: contractData.sierraProgram,
        sierra_program_debug_info: contractData.sierraProgramDebugInfo,
        contract_class_version: contractData.contractClassVersion,
        entry_points_by_type: contractData.entryPointsByType,
        abi: contractData.abi
    };
}
const declareIfNot_NotWait = async (payload, provider, account, options) => {
    const { classHash } = extractContractHashes(payload);
    try {
        await provider.getClassByHash(classHash);
        console.log("Skipping declare - class hash", classHash, "already exists on-chain.");
        return {
            classHash,
        };
    }
    catch (e) {
        if (e instanceof RpcError && e.isType("CLASS_HASH_NOT_FOUND")) {
            console.log("Class hash", classHash, "not found, proceeding with declaration...");
        }
        else {
            console.error("Error while checking classHash", classHash);
            throw e;
        }
    }
    try {
        await account.declare(payload, {
            ...options,
            version: constants.TRANSACTION_VERSION.V3,
        });
        // if (networkName === "sepolia" || networkName === "mainnet") {
        //   console.log(
        //     yellow("Waiting for declaration transaction to be accepted...")
        //   );
        //   const receipt = await provider.waitForTransaction(transaction_hash);
        //   console.log(
        //     yellow("Declaration transaction receipt:"),
        //     JSON.stringify(
        //       receipt,
        //       (_, v) => (typeof v === "bigint" ? v.toString() : v),
        //       2
        //     )
        //   );
        //   const receiptAny = receipt as any;
        //   if (receiptAny.execution_status !== "SUCCEEDED") {
        //     const revertReason = receiptAny.revert_reason || "Unknown reason";
        //     throw new Error(
        //       red(`Declaration failed or reverted. Reason: ${revertReason}`)
        //     );
        //   }
        //   console.log(green("Declaration successful"));
        // }
        return {
            classHash: classHash,
        };
    }
    catch (e) {
        if (e instanceof RpcError &&
            e.isType("VALIDATION_FAILURE") &&
            e.baseError.data.includes("exceed balance")) {
            console.error("Class declaration failed: deployer", account.address, "has insufficient balance.");
            throw "Class declaration failed: insufficient balance";
        }
        console.error("Class declaration failed: error details below");
        console.error(e);
        throw "Class declaration failed";
    }
};
const deployContract_NotWait = async (payload, account) => {
    try {
        const { addresses } = transaction.buildUDCCall(payload, account.address);
        // deployCalls.push(...calls);
        return {
            contractAddress: addresses[0],
        };
    }
    catch (error) {
        console.error("Error building UDC call:", error);
        throw error;
    }
};
export const scaffoldDeployContract = async (params, compiledContractCasm, 
// compiledContractSierra: CompiledSierra,
contractData, providerUrl, accountAddress, privateKey, constructorCalldata) => {
    const { contract, constructorArgs, contractName, options } = params;
    const compiledContractSierra = getCompiledSierra(contractData);
    const provider = new RpcProvider({ nodeUrl: providerUrl });
    if (!provider) {
        throw new Error('Invalid RPC Provider');
    }
    const account = new Account(provider, accountAddress, privateKey, "1", constants.TRANSACTION_VERSION.V3);
    const abi = compiledContractSierra.abi;
    const constructorAbi = abi.find((item) => item.type === "constructor");
    if (constructorAbi) {
        const requiredArgs = constructorAbi.inputs || [];
        if (!constructorArgs) {
            throw new Error(`Missing constructor arguments: expected ${requiredArgs.length} (${requiredArgs
                .map((a) => `${a.name}: ${a.type}`)
                .join(", ")}), but got none.`);
        }
        for (const arg of requiredArgs) {
            if (!(arg.name in constructorArgs) ||
                // @ts-expect-error
                constructorArgs[arg.name] === undefined ||
                // @ts-expect-error
                constructorArgs[arg.name] === null ||
                // @ts-expect-error
                constructorArgs[arg.name] === "") {
                throw new Error(`Missing value for constructor argument '${arg.name}' of type '${arg.type}'.`);
            }
        }
        // const validationResult = validateConstructorArgsWithStarknetJS(
        //   abi,
        //   constructorArgs
        // );
        // if (!validationResult.isValid) {
        //   throw new Error(
        //     red(`Constructor validation failed: ${validationResult.error}`)
        //   );
        // }
    }
    // const contractCalldata = new CallData(compiledContractSierra.abi);
    // const constructorCalldata = constructorArgs
    //   ? contractCalldata.compile("constructor", constructorArgs)
    //   : [];
    console.log("Deploying Contract ", contractName || contract);
    let { classHash } = await declareIfNot_NotWait({
        contract: compiledContractSierra,
        casm: compiledContractCasm,
    }, provider, account, options);
    let randomSalt = stark.randomAddress();
    let { contractAddress } = await deployContract_NotWait({
        salt: randomSalt,
        classHash,
        constructorCalldata,
    }, account);
    console.log("Contract Deployed at ", contractAddress);
    // let finalContractName = contractName || contract;
    // deployments[finalContractName] = {
    //   classHash: classHash,
    //   address: contractAddress,
    //   contract: contract,
    // };
    const deployedContract = new Contract(compiledContractSierra.abi, contractAddress, provider);
    return {
        classHash: classHash,
        address: contractAddress,
        contract: deployedContract
    };
};
export async function deployContract(contractData, providerUrl, accountAddress, privateKey, constructorCalldata) {
    try {
        const compiledSierra = getCompiledSierra(contractData);
        console.log("Compiled sierra available");
        const provider = new RpcProvider({ nodeUrl: providerUrl });
        console.log("rpc url available");
        const account = new Account(provider, accountAddress, privateKey, "1", constants.TRANSACTION_VERSION.V3);
        console.log("account available");
        // const { class_hash, transaction_hash: declareTxHash } = await account.declare(
        //   {
        //     contract: compiledSierra
        //   }
        // );
        // console.log(declareTxHash);
        const salt = Math.floor(Math.random() * 1000000).toString();
        // const { contract_address, transaction_hash: deployTxHash } = await account.deploy({
        //   classHash: class_hash,
        //   constructorCalldata: constructorCalldata ? constructorCalldata : undefined,
        //   salt,
        // })
        const { contract: _extractedContract, classHash, compiledClassHash, casm } = extractContractHashes({
            contract: compiledSierra,
            casm: contractData.compiledCasm
        });
        if (!classHash || !classHash || !compiledClassHash || !casm) {
            throw new Error("Failed to extract contract Hashes");
        }
        console.log("Successfully computed contract hashes");
        const { declare, deploy } = await account.declareAndDeploy({
            classHash,
            constructorCalldata: constructorCalldata ? constructorCalldata : undefined,
            salt,
            contract: compiledSierra,
            compiledClassHash,
            casm: contractData.compiledCasm
        });
        const contract = new Contract(compiledSierra.abi, deploy.address, provider);
        console.log(declare.transaction_hash);
        console.log(deploy.transaction_hash);
        // const factory = new ContractFactory({
        //   compiledContract: compiledSierra,
        //   account,
        //   abi: contractData.abi,
        // });
        // console.log("factory started");
        // const contract = await factory.deploy(...constructorCalldata)
        // console.log("contract deployed");
        return contract;
    }
    catch (err) {
        console.error("Error deploying contract: ", err.message);
        throw err;
    }
}
//# sourceMappingURL=utils.js.map