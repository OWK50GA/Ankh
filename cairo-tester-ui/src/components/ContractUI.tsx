import { useState, useMemo, useEffect } from "react"
import ContractReadMethods from "./ContractReadMethods";
import ContractWriteMethods from "./ContractWriteMethods";
import type { ContractArtifact } from "../types";
import { useConfig } from "../contexts/cairoTesterContext";

export default function ContractUI ({ contractData }: {
    contractData: ContractArtifact | null,
}) {
    const [activeTab, setActiveTab] = useState("read");

    const { contractFunctionsData, setContractFunctionsData, setContractData } = useConfig();

    useEffect(() => {
        if (contractData) {
            setContractData(() => (contractData));
            setContractFunctionsData({
                abi: contractData.abi
            });
        }
    }, [contractData]);

    // if (contractDataLoading) {
    //     return (
    //         <div>
    //             <Loader />
    //         </div>
    //     )
    // }

    if (!contractData) {
        return <div>Error Finding Contract Data</div>;
    }

    console.log("Contract data: ", contractData);
    console.log("Contract Functions data: ", contractFunctionsData);
    console.log(contractData.abi);

    const tabs = [
        { id: "read", label: "Read" },
        { id: "write", label: "Write" }
    ];

    const readyForInteraction = contractFunctionsData?.contractAddress;

    const tabContent = useMemo(() => {
        if (!contractFunctionsData) {
            console.log("No contract functions data")
            return;
        };

        return activeTab === "write" ? (
            <ContractWriteMethods contractFunctionData={contractFunctionsData}/>
        ) : (
            <ContractReadMethods contractFunctionData={contractFunctionsData}/>
        )
    }, [activeTab, contractData, contractFunctionsData]);

    return (
        <div className="w-11/12 mx-auto flex-col gap-8">
            <p className="text-2xl">{readyForInteraction? `${contractData.name}`:`${contractData.name} - Yet to be deployed`}</p>
            <div className="mt-3">
                {tabs.map((tab) => (
                <a
                    key={tab.id}
                    className={`tab h-10 w-1/2 px-4 py-1 cursor-pointer ${
                    activeTab === tab.id
                        ? "tab-active bg-gradient-to-r from-[#9433DC] to-[#D57B52] rounded-[5px] text-white text-lg font-bold"
                        : "text-xl"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </a>
                ))}
            </div>
            <div className="z-10">
            <div className="rounded-[5px] bg-[#161616] flex flex-col relative mt-4">
              <div className="p-5 divide-y divide-secondary">{tabContent}</div>
            </div>
          </div>
        </div>
    )
}