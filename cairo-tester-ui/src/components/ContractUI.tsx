import { useState, useEffect } from "react"
import ContractReadMethods from "./ContractReadMethods";
import ContractWriteMethods from "./ContractWriteMethods";
import type { ContractData, ContractFunctionData } from "../types";

export default function ContractUI ({ contractData }: {
    contractData: ContractData | null,
    // contractDataLoading: boolean
}) {
    const [activeTab, setActiveTab] = useState("read");
    const [contractFunctionsData, setContractFunctionsData] = useState<ContractFunctionData | null>(null);

    useEffect(() => {
        if (contractData) {
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

    const tabContent = () => {
        if (!contractFunctionsData) {
            console.log("No contract functions data")
            return;
        };

        return activeTab === "write" ? (
            <ContractWriteMethods contractFunctionData={contractFunctionsData}/>
        ) : (
            <ContractReadMethods contractFunctionData={contractFunctionsData}/>
        )
    };

    return (
        <div className="w-11/12 mx-auto flex-col gap-3">
            <p className="text-2xl">{contractData.name}</p>
            <div>
                {tabs.map((tab) => (
                <a
                    key={tab.id}
                    className={`tab h-10 w-1/2 ${
                    activeTab === tab.id
                        ? "tab-active bg-[#8A45FC]! rounded-[5px]! text-white! text-2xl"
                        : "text-2xl"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </a>
                ))}
            </div>
            <div className="z-10">
            <div className="rounded-[5px] border border-[#8A45FC] flex flex-col relative bg-component">
              <div className="p-5 divide-y divide-secondary">{tabContent()}</div>
            </div>
          </div>
        </div>
    )
}