import type { Abi } from "abi-wan-kanabi";
import type { AbiConstructor, AbiEnum, AbiFunction, AbiOutput, AbiParameter, AbiStateMutability, AbiStruct, ContractArtifact, FormErrorMessageState } from "./types";
import type { CairoBigInt, CairoBool, CairoByteArray, CairoBytes31, CairoClassHash, CairoContractAddress, CairoEthAddress, CairoFelt, CairoFunction, CairoInt, CairoSecp256k1Point, CairoTuple, CairoU256, CairoVoid } from "abi-wan-kanabi/kanabi";
import { Account, cairo, CairoCustomEnum, CairoOption, CairoOptionVariant, CairoResult, CairoResultVariant, constants, Contract, extractContractHashes, getChecksumAddress, num, RpcError, RpcProvider, stark, transaction, type CairoAssembly, type Calldata, type CompiledSierra, type DeclareContractPayload, type RawArgs, type SierraEntryPointsByType, type SierraProgramDebugInfo, type Uint256, type UniversalDetails } from "starknet";
import { formatEther, ZeroAddress } from "ethers";

const convertStringInputToBool = (input: string) => {
  if (new Set(["true", "1", "0x1", "0x01, 0x001"]).has(input)) {
    return true;
  } else if (new Set(["false", "0", "0x0", "0x00", "0x000"]).has(input)) {
    return false;
  }

  return true;
};

function isValidNumber(input?: string): boolean {
  // Check for empty string
  if ((input || "").length === 0) return false;

  // Check if it's a valid hex number (starts with '0x' or '0X')
  if (/^0x[0-9a-fA-F]+$/i.test(input || "")) {
    return true;
  }

  // Check for a valid decimal number (including scientific notation and floating points)
  const decimalNumberRegex = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
  return decimalNumberRegex.test(input || "");
}

function isValidHexNumber(input?: string): boolean {
  // Check for empty string
  if ((input || "").length === 0) return false;

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

const hexToAscii = (hexString: string): string => {
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

const getFieldType = (type: string, abi: Abi): any => {
  if (
    type.startsWith("core::array::Array") ||
    /^\([^()]*\)$/.test(type) ||
    baseType.has(type)
  ) {
    return { type };
  }
  return abi.find((item) => item.name === type);
};

// EXPORTS

export const zeroAddress = ZeroAddress as `0x${string}`;

export function getFunctionsByStateMutability(
    abi: Abi,
    stateMutability: AbiStateMutability
): AbiFunction[] {
    return abi
        .reduce((acc, part) => {
            if (part.type === "function") {
                acc.push(part);
            } else if (part.type === "interface" && Array.isArray(part.items)) {
                part.items.forEach((item) => {
                    if (item.type === "function") {
                        acc.push(item);
                    }
                })
            }
            return acc;
        }, [] as AbiFunction[])
        .filter((func) => {
            return (func.state_mutability === stateMutability)
        })
}

export const getInitialTupleFormState = (abiParameter: AbiStruct | AbiEnum) => {
  const initialForm: Record<string, any> = {};

  if (abiParameter.type === "struct") {
    abiParameter.members.forEach((member, memberIndex) => {
      const key = getFunctionInputKey(abiParameter.name, member, memberIndex);
      initialForm[key] = "";
    });
  } else {
    abiParameter.variants.forEach((variant, variantIndex) => {
      const key = getFunctionInputKey(abiParameter.name, variant, variantIndex);
      initialForm[key] = "";
    });
  }
  return initialForm;
};

export function getFunctionInputKey(functionName: string, input: AbiParameter, index?: number): string {
    const name = input.name || `input_${index}_`;
    return `${functionName}_${name}_${input.type}`;
}

export function getInitialFormState(abiFunction: AbiFunction | AbiConstructor) {
    const initialForm: Record<string, any> = {};
    if (!abiFunction.inputs) return initialForm;

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

export const getArgsAsStringInputFromForm = (form: Record<string, any>) => {
  const _encodeValueFromKey = (key: string = "", value: any): any => {
    // array
    if (isCairoArray(key)) {
      const genericType = parseGenericType(key)[0];
      return value.map((arrayValue: any) =>
        _encodeValueFromKey(genericType, arrayValue),
      );
    }

    // enum & struct
    if (!key.includes("core::") || isCairoResult(key) || isCairoOption(key)) {
      type FormStructValue = {
        type: string;
        value: any;
      };

      // alias it so that we have better name
      const structObject = value;

      // this indicates enum
      if (Object.keys(structObject).includes("variant")) {
        // construct empty enums
        const enumObject = structObject.variant as any;
        const enumVariants = Object.keys(enumObject);

        // check for option
        if (
          enumVariants.includes("Some") &&
          enumVariants.includes("None") &&
          isCairoOption(key)
        ) {
          // for some value we return with the corresponding value

          if ((enumObject.Some as FormStructValue).value !== undefined)
            return new CairoOption(
              CairoOptionVariant.Some,
              _encodeValueFromKey(
                (enumObject.Some as FormStructValue).type,
                (enumObject.Some as FormStructValue).value,
              ),
            );

          // set to none as default
          return new CairoOption(CairoOptionVariant.None);
        }

        // check for result
        if (
          enumVariants.includes("Ok") &&
          enumVariants.includes("Err") &&
          isCairoResult(key)
        ) {
          // for some value we return with the corresponding value
          if ((enumObject.Ok as FormStructValue).value !== undefined)
            return new CairoResult(
              CairoResultVariant.Ok,
              _encodeValueFromKey(
                (enumObject.Ok as FormStructValue).type,
                (enumObject.Ok as FormStructValue).value,
              ),
            );
          else if (
            typeof (enumObject.Err as FormStructValue).value !== undefined
          ) {
            return new CairoResult(
              CairoResultVariant.Err,
              _encodeValueFromKey(
                (enumObject.Err as FormStructValue).type,
                (enumObject.Err as FormStructValue).value,
              ),
            );
          }
        }

        const activeVariant = enumVariants.find((variant) => {
          const v = enumObject[variant];
          return v && (v.value !== undefined || v.value === "");
        });

        const restructuredEnum = activeVariant
          ? {
              [activeVariant]:
                enumObject[activeVariant].value !== undefined
                  ? _encodeValueFromKey(
                      enumObject[activeVariant].type,
                      enumObject[activeVariant].value,
                    )
                  : undefined,
            }
          : {};

        return new CairoCustomEnum(restructuredEnum);
      }

      // map out values
      const remappedEntries = Object.entries(structObject).map(
        ([structObjectKey, structObjectValue]) => {
          return [
            structObjectKey,
            _encodeValueFromKey(
              (structObjectValue as FormStructValue).type,
              (structObjectValue as FormStructValue).value,
            ),
          ];
        },
      );
      return Object.fromEntries(remappedEntries);
    }

    // encode tuple input
    if (isCairoTuple(key)) {
      const tupleKeys = parseTuple(key.replace(/^.*\(/, "("));
      const tupleValues = parseTuple(value);
      return cairo.tuple(
        ...tupleValues.map((tupleValue, index) =>
          _encodeValueFromKey(tupleKeys[index], tupleValue),
        ),
      );
    }

    // translate boolean input
    if (isCairoBool(key)) return convertStringInputToBool(value);

    if (
      isValidHexNumber(value) &&
      (isCairoBigInt(key) ||
        isCairoInt(key) ||
        isCairoFelt(key) ||
        isCairoU256(key))
    ) {
      return num.toBigInt(value);
    }

    if (
      isValidNumber(value) &&
      (isCairoBigInt(key) ||
        isCairoInt(key) ||
        isCairoFelt(key) ||
        isCairoU256(key))
    ) {
      return num.toBigInt(value);
    }

    return value;
  };

  return Object.keys(form).map((key) => _encodeValueFromKey(key, form[key]));
};

function adjustInput(value: AbiParameter): AbiParameter {
    return {
        ...value
    }
}

export function transformAbiFunction(abiFunction: AbiFunction): AbiFunction {
    return {
        ...abiFunction,
        inputs: abiFunction.inputs.map((value) => adjustInput(value as AbiParameter))
    }
}

export function addError(
  state: FormErrorMessageState,
  key: string,
  message: string,
): FormErrorMessageState {
  return {
    ...state,
    [key]: message,
  };
}

export function clearError(
  state: FormErrorMessageState,
  key: string,
): FormErrorMessageState {
  delete state[key];
  return state;
}

export function isError(state: FormErrorMessageState): boolean {
  return Object.values(state).filter((value) => !!value).length > 0;
}

export function getTopErrorMessage(state: FormErrorMessageState): string {
  if (!isError(state)) return "";
  return Object.values(state).filter((value) => !!value)[0];
}

// TYPE-RELATED UTILS

export const isCairoInt = (type: string): type is CairoInt =>
  /core::integer::(u|i)(8|16|32)$/.test(type);

export const isCairoBigInt = (type: string): type is CairoBigInt =>
  /core::integer::(u|i)(64|128)$/.test(type);

export const isCairoU256 = (type: string): type is CairoU256 =>
  /core::integer::u256$/.test(type) ||
  /core::zeroable::NonZero::<core::integer::u256>$/.test(type);

export const isCairoContractAddress = (
  type: string,
): type is CairoContractAddress =>
  type.includes("core::starknet::contract_address::ContractAddress");

export const isCairoEthAddress = (type: string): type is CairoEthAddress =>
  type.includes("core::starknet::eth_address::EthAddress");

export const isCairoClassHash = (type: string): type is CairoClassHash =>
  type.includes("core::starknet::class_hash::ClassHash");

export const isCairoFunction = (type: string): type is CairoFunction =>
  type.includes("function");

export const isCairoVoid = (type: string): type is CairoVoid =>
  type.includes("()");

export const isCairoBool = (type: string): type is CairoBool =>
  type.includes("core::bool");

export const isCairoBytes31 = (type: string): type is CairoBytes31 =>
  type.includes("core::bytes_31::bytes31");

export const isCairoByteArray = (type: string): type is CairoByteArray =>
  type.includes("core::byte_array::ByteArray");

export const isCairoSecp256k1Point = (
  type: string,
): type is CairoSecp256k1Point =>
  type.includes("core::starknet::secp256k1::Secp256k1Point");

export const isCairoFelt = (type: string): type is CairoFelt =>
  type.includes("core::felt252");

export const isCairoTuple = (type: string): type is CairoTuple =>
  /\(([^)]+)\)/i.test(type);

export const isCairoSpan = (type: string): boolean =>
  type.includes("core::array::Span");

export const isCairoType = (type: string): boolean => {
  return (
    isCairoInt(type) ||
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
    isCairoSpan(type)
  );
};

export function isStructOrEnum(member: any): member is AbiStruct | AbiEnum {
  return member.type === "struct" || member.type === "enum";
}

export const isCairoArray = (type: string): boolean =>
  type.includes("core::array");

export const isCairoOption = (type: string): boolean =>
  type.includes("core::option");

export const isCairoResult = (type: string): boolean =>
  type.includes("core::result");

export const SIGNED_NUMBER_REGEX = /^-?\d*\.?\d*$/;
export const UNSIGNED_NUMBER_REGEX = /^\d*\.?\d*$/;

export const isValidInteger = (
  dataType: string,
  value: string | bigint,
): boolean => {
  const isSigned = isSignedType(dataType);
  const bitcount = extractBitCount(dataType, isSigned);

  if (!isValidFormat(value, isSigned)) return false;

  const valueAsBigInt = parseBigInt(value);
  if (valueAsBigInt === null) return false;

  if (isInvalidUnsignedValue(valueAsBigInt, isSigned)) return false;

  return fitsWithinBitCount(valueAsBigInt, bitcount, isSigned);
};

// Helper functions:

const isSignedType = (dataType: string): boolean => {
  return dataType.split("::").pop()!.startsWith("i");
};

const extractBitCount = (dataType: string, isSigned: boolean): number => {
  return Number(dataType.substring(isSigned ? 3 : 4));
};

const isValidFormat = (value: string | bigint, isSigned: boolean): boolean => {
  if (typeof value !== "string") return true;
  if (isSigned) return SIGNED_NUMBER_REGEX.test(value);
  return UNSIGNED_NUMBER_REGEX.test(value);
};

const parseBigInt = (value: string | bigint): bigint | null => {
  try {
    const integerPart = value.toString().split(".")[0];
    return BigInt(integerPart);
  } catch {
    return null;
  }
};

const isInvalidUnsignedValue = (value: bigint, isSigned: boolean): boolean => {
  return !isSigned && value < 0;
};

const fitsWithinBitCount = (
  value: bigint,
  bitcount: number,
  isSigned: boolean,
): boolean => {
  const hexString = value.toString(16);
  const significantHexDigits = hexString.match(/.*x0*(.*)$/)?.[1] ?? "";

  if (significantHexDigits.length * 4 > bitcount) return false;

  // Check if the value is a negative overflow for signed integers.
  if (isSigned && significantHexDigits.length * 4 === bitcount) {
    const mostSignificantDigit = parseInt(
      significantHexDigits.slice(-1)?.[0],
      16,
    );
    if (mostSignificantDigit >= 8) return false;
  }

  return true;
};
// Treat any dot-separated string as a potential ENS name
const ensRegex = /.+\..+/;
export const isENS = (address = "") => ensRegex.test(address);


export function parseGenericType(typeString: string): string[] | string {
  const match = typeString.match(/<([^>]*(?:<(?:[^<>]*|<[^>]*>)*>[^>]*)*)>/);
  if (!match) return typeString;

  const content = match[1];
  if (content.startsWith("(") && content.endsWith(")")) {
    return content; // Return the tuple as a single string
  }

  const types = content.split(/,(?![^\(\)]*\))/);
  return types.map((type) => type.trim());
}

export function parseTuple(value: string): string[] {
  const values: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if (char === "(") {
      if (depth > 0) {
        current += char;
      }
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth > 0) {
        current += char;
      } else {
        values.push(current.trim());
        current = "";
      }
    } else if (char === "," && depth === 1) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  return values;
}

// DISPLAY-RELATED UTILS - BUILD ON TYPE-RELATED UTILS

export function feltToHex(feltBigInt: bigint) {
  return `0x${feltBigInt.toString(16)}`;
}

export const displayTuple = (tupleString: string): string => {
  return tupleString.replace(/\w+::/g, "");
};

export const displayType = (type: string) => {
  // render tuples
  if (type.at(0) === "(") {
    return displayTuple(type);
  }

  // arrays and options
  else if (
    isCairoResult(type) ||
    isCairoArray(type) ||
    isCairoOption(type) ||
    isCairoSpan(type)
  ) {
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
  } else if (type.includes("::")) {
    return type.split("::").pop();
  }
  return type;
};

// RESPONSE-RELATED
const _decodeContractResponseItem = (
  respItem: any,
  abiType: any,
  abi: Abi,
  showAsString?: boolean,
): any => {
  if (respItem === undefined) {
    return "";
  }
  if (abiType.type && baseNumberType.has(abiType.type)) {
    if (typeof respItem === "bigint") {
      if (
        respItem <= BigInt(Number.MAX_SAFE_INTEGER) &&
        respItem >= BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        return Number(respItem);
      } else {
        return "Ξ " + formatEther(respItem);
      }
    }
    return Number(respItem);
  }

  if (
    abiType.type &&
    abiType.type === "core::starknet::contract_address::ContractAddress"
  ) {
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
      const tupleMatch: RegExpMatchArray | null =
        abiType.type.match(/\(([^)]+)\)/);
      if (!tupleMatch || !tupleMatch[1]) {
        return String(respItem);
      }

      const tupleTypes: string[] = tupleMatch[1].split(/\s*,\s*/);

      if (typeof respItem !== "object") {
        return String(respItem);
      }

      const respKeys: string[] = respItem ? Object.keys(respItem) : [];
      if (tupleTypes.length !== respKeys.length) {
        return "";
      }

      const decodedArr: any[] = tupleTypes.map(
        (type: string, index: number) => {
          return _decodeContractResponseItem(
            respItem[index],
            getFieldType(type, abi),
            abi,
          );
        },
      );

      return `(${decodedArr.join(",")})`;
    } catch (error) {
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
    return respItem.map((arrItem) =>
      _decodeContractResponseItem(arrItem, getFieldType(arrItemType, abi), abi),
    );
  }

  // span
  if (abiType.name && abiType.name.startsWith("core::array::Span")) {
    const match = abiType.name.match(/<([^>]+)>/);
    const spanItemType = match ? match[1] : null;
    if (!spanItemType || !Array.isArray(respItem)) {
      return [];
    }
    return respItem.map((spanItem) =>
      _decodeContractResponseItem(
        spanItem,
        getFieldType(spanItemType, abi),
        abi,
      ),
    );
  }

  // struct
  if (abiType.type === "struct") {
    const members = abiType.members;
    const decoded: Record<string, any> = {};
    for (const [structKey, structValue] of Object.entries(respItem)) {
      const structItemDef = (members || []).find(
        (item: any) => item.name === structKey,
      );
      if (structItemDef && structItemDef.type) {
        decoded[structKey] = _decodeContractResponseItem(
          structValue,
          structItemDef,
          abi,
        );
      }
    }
    return decoded;
  }

  // option and result are enums but we don't want to process them as enums
  // possibly facing name or type that are defined as members of struct or standalone typing
  // we need the fallback so that it does not crash
  if (
    isCairoOption(abiType.name || "") ||
    isCairoOption(abiType.type || "") ||
    isCairoResult(abiType.name || "") ||
    isCairoResult(abiType.type || "")
  ) {
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
          if (enumValue === undefined) continue;

          const enumItemDef = variants.find(
            (item: any) => item.name === enumKey,
          );
          if (enumItemDef && enumItemDef.type) {
            if (abiType.name === "contracts::your_contract::TransactionState") {
              return enumKey;
            }

            const processedValue = _decodeContractResponseItem(
              enumValue,
              { type: enumItemDef.type },
              abi,
            );
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

        const enumVariant = abiType.variants?.find(
          (v: any) => v.name === enumKey,
        );
        if (enumVariant) {
          const processedValue = _decodeContractResponseItem(
            enumValue,
            { type: enumVariant.type },
            abi,
          );
          return { [enumKey]: processedValue };
        }
        return { [enumKey]: enumValue };
      }
    }

    return String(respItem);
  }
  return respItem;
};

type DisplayContent = Uint256 | string | bigint | boolean | Object | unknown;

export const decodeContractResponse = ({
  resp,
  abi,
  functionOutputs,
  asText,
  showAsString,
}: {
  resp: DisplayContent | DisplayContent[];
  abi: Abi;
  functionOutputs?: readonly AbiOutput[];
  asText?: boolean;
  showAsString?: boolean;
}) => {
  const abiTypes = (functionOutputs || [])
    .map((output) => output.type)
    .map((type) => getFieldType(type, abi));
  let arrResp = [resp];
  if (!abiTypes.length || arrResp.length !== abiTypes.length) {
    return JSON.stringify(resp, (_key: string, value: unknown) => {
        if (typeof value === "bigint") return value.toString();
        return value;
    }, 2);
  }
  const decoded: any[] = [];
  for (let index = 0; index < arrResp.length; index++) {
    decoded.push(
      _decodeContractResponseItem(
        arrResp[index],
        abiTypes[index],
        abi,
        showAsString,
      ),
    );
  }

  const decodedResult = decoded.length === 1 ? decoded[0] : decoded;
  if (asText) {
    return typeof decodedResult === "string"
      ? decodedResult
      : JSON.stringify(decodedResult, (_key: string, value: unknown) => {
        if (typeof value === "bigint") return value.toString();
        return value;
      });
  }
  return decodedResult;
};

export function getConstructorWithArgs(abi: Abi): {
  constructor: AbiConstructor,
  constructorArgs: readonly AbiParameter[]
} {
  const constructor = abi.find((part) => part.type === "constructor");
  if (!constructor) return {} as any;

  const constructorArgs = constructor.inputs;
  return {
    constructor, constructorArgs
  }
}

export function getCompiledSierra (contractData: ContractArtifact): CompiledSierra {
  return {
    sierra_program: contractData.sierraProgram,
    sierra_program_debug_info: contractData.sierraProgramDebugInfo as SierraProgramDebugInfo,
    contract_class_version: contractData.contractClassVersion,
    entry_points_by_type: contractData.entryPointsByType as SierraEntryPointsByType,
    abi: contractData.abi
  };
}

const declareIfNot_NotWait = async (
  payload: DeclareContractPayload,
  provider: RpcProvider,
  account: Account,
  options?: UniversalDetails,
) => {
  const { classHash } = extractContractHashes(payload);

  try {
    await provider.getClassByHash(classHash);
    console.log(
    "Skipping declare - class hash",
      classHash,
      "already exists on-chain."
    );

    return {
      classHash,
    };
  } catch (e) {
    if (e instanceof RpcError && e.isType("CLASS_HASH_NOT_FOUND")) {
      console.log(
        "Class hash",
        classHash,
        "not found, proceeding with declaration..."
      );
    } else {
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
  } catch (e) {
    if (
      e instanceof RpcError &&
      e.isType("VALIDATION_FAILURE") &&
      e.baseError.data.includes("exceed balance")
    ) {
      console.error(
        "Class declaration failed: deployer",
        account.address,
        "has insufficient balance."
      );
      throw "Class declaration failed: insufficient balance";
    }

    console.error("Class declaration failed: error details below");
    console.error(e);
    throw "Class declaration failed";
  }
};

const deployContract_NotWait = async (payload: {
  salt: string;
  classHash: string;
  constructorCalldata: RawArgs;
}, account: Account) => {
  try {
    const { addresses } = transaction.buildUDCCall(
      payload,
      account.address
    );
    // deployCalls.push(...calls);
    return {
      contractAddress: addresses[0],
    };
  } catch (error) {
    console.error("Error building UDC call:", error);
    throw error;
  }
};

type DeployContractParams = {
    contract: string;
    contractName?: string;
    constructorArgs?: RawArgs;
    options?: UniversalDetails;
}

export const scaffoldDeployContract = async (
  params: DeployContractParams, 
  compiledContractCasm: CairoAssembly, 
  // compiledContractSierra: CompiledSierra,
  contractData: ContractArtifact,
  providerUrl: string,
  accountAddress: string,
  privateKey: string,
  constructorCalldata: Calldata
): Promise<{
  classHash: string;
  address: string;
  contract: Contract;
}> => {
  const { contract, constructorArgs, contractName, options } = params;

  const compiledContractSierra = getCompiledSierra(contractData);

  const provider = new RpcProvider({ nodeUrl: providerUrl });
  if (!provider) {
    throw new Error('Invalid RPC Provider')
  }

  const account = new Account(provider, accountAddress, privateKey, "1", constants.TRANSACTION_VERSION.V3);

  const abi = compiledContractSierra.abi;
  const constructorAbi = abi.find((item: any) => item.type === "constructor");
  if (constructorAbi) {
    const requiredArgs = constructorAbi.inputs || [];
    if (!constructorArgs) {
      throw new Error(
          `Missing constructor arguments: expected ${
            requiredArgs.length
          } (${requiredArgs
            .map((a: any) => `${a.name}: ${a.type}`)
            .join(", ")}), but got none.`
        );
    }

    for (const arg of requiredArgs) {
      if (
        !(arg.name in constructorArgs) ||
        // @ts-expect-error
        constructorArgs[arg.name] === undefined ||
        // @ts-expect-error
        constructorArgs[arg.name] === null ||
        // @ts-expect-error
        constructorArgs[arg.name] === ""
      ) {
        throw new Error(
            `Missing value for constructor argument '${arg.name}' of type '${arg.type}'.`
        );
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

  let { classHash } = await declareIfNot_NotWait(
    {
      contract: compiledContractSierra,
      casm: compiledContractCasm,
    },
    provider,
    account,
    options
  );

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

  const deployedContract = new Contract(
    compiledContractSierra.abi, contractAddress, provider
  )

  return {
    classHash: classHash,
    address: contractAddress,
    contract: deployedContract
  };
};

export async function deployContract(
  contractData: ContractArtifact,
  providerUrl: string,
  accountAddress: string,
  privateKey: string,
  constructorCalldata: Calldata
): Promise<Contract> {

  try {
    const compiledSierra = getCompiledSierra(contractData)
    console.log("Compiled sierra available");
    const provider = new RpcProvider({ nodeUrl: providerUrl });
    console.log("rpc url available");
    const account = new Account(
      provider, 
      accountAddress, 
      privateKey,
      "1",
      constants.TRANSACTION_VERSION.V3
    );
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

    console.log("Successfully computed contract hashes")

    const { declare, deploy } = await account.declareAndDeploy(
      {
        classHash,
        constructorCalldata: constructorCalldata ? constructorCalldata : undefined,
        salt,
        contract: compiledSierra,
        compiledClassHash,
        casm: contractData.compiledCasm
      }
    );

    const contract = new Contract(
      compiledSierra.abi, deploy.address, provider
    )

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
  } catch (err) {
    console.error("Error deploying contract: ", (err as Error).message);
    throw err;
  }
}

export const shortenAddress = (address: `0x${string}`) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};