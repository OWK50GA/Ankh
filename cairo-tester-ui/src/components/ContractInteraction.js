import React, { useState, useEffect } from 'react';
const ContractInterface = () => {
    const [contract, setContract] = useState(null);
    const [logs, setLogs] = useState([]);
    const [deploymentInfo, setDeploymentInfo] = useState({});
    const [functionInputs, setFunctionInputs] = useState({});
    const [isLoading, setIsLoading] = useState({});
    useEffect(() => {
        if (window.vscode) {
            window.vscode.postMessage({ type: 'getContractData' });
        }
        // Handle messages from VS Code extension
        const handleMessage = (event) => {
            const message = event.data;
            console.log(message);
            switch (message.type) {
                case 'contractData':
                    setContract(message.data);
                    initializeFunctionInputs(message.data);
                    addLog('Contract data loaded');
                    break;
                case 'declareResult':
                    setIsLoading(prev => ({ ...prev, declare: false }));
                    if (message.data.success) {
                        addLog(`Contract declared successfully! Class Hash: ${message.data.classHash}`);
                        setDeploymentInfo(prev => ({ ...prev, classHash: message.data.classHash }));
                    }
                    else {
                        addLog(`Declaration failed: ${message.data.error}`, 'error');
                    }
                    break;
                case 'deployResult':
                    setIsLoading(prev => ({ ...prev, deploy: false }));
                    if (message.data.success) {
                        addLog(`Contract deployed successfully! Address: ${message.data.contractAddress}`);
                        setDeploymentInfo(prev => ({ ...prev, contractAddress: message.data.contractAddress }));
                    }
                    else {
                        addLog(`Deployment failed: ${message.data.error}`, 'error');
                    }
                    break;
                case 'callResult':
                    const functionName = message.data.functionName;
                    setIsLoading(prev => ({ ...prev, [functionName]: false }));
                    if (message.data.success) {
                        addLog(`Function call successful: ${JSON.stringify(message.data.result)}`);
                    }
                    else {
                        addLog(`Function call failed: ${message.data.error}`, 'error');
                    }
                    break;
            }
        };
        console.log("Here is the contract", contract);
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);
    const initializeFunctionInputs = (contractData) => {
        const inputs = {};
        contractData.abi.forEach(func => {
            if (func.type === 'function') {
                inputs[func.name] = new Array(func.inputs?.length || 0).fill('');
            }
        });
        setFunctionInputs(inputs);
    };
    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        setLogs(prev => [...prev, logEntry]);
    };
    const clearLogs = () => {
        setLogs([]);
    };
    const declareContract = () => {
        if (!contract)
            return;
        setIsLoading(prev => ({ ...prev, declare: true }));
        addLog('Declaring contract...');
        window.vscode.postMessage({
            type: 'declareContract',
            data: { contractName: contract.name }
        });
    };
    const deployContract = () => {
        if (!contract)
            return;
        setIsLoading(prev => ({ ...prev, deploy: true }));
        addLog('Deploying contract...');
        window.vscode.postMessage({
            type: 'deployContract',
            data: { contractName: contract.name, classHash: deploymentInfo.classHash }
        });
    };
    const callFunction = (functionName) => {
        const inputs = functionInputs[functionName] || [];
        setIsLoading(prev => ({ ...prev, [functionName]: true }));
        addLog(`Calling function: ${functionName}`);
        window.vscode.postMessage({
            type: 'callContract',
            data: { functionName, inputs, contractAddress: deploymentInfo.contractAddress }
        });
    };
    const updateFunctionInput = (functionName, index, value) => {
        setFunctionInputs(prev => ({
            ...prev,
            [functionName]: prev[functionName].map((input, i) => i === index ? value : input)
        }));
    };
    const getFunctionsByType = (type) => {
        if (!contract?.abi)
            return [];
        return contract.abi.filter(func => func.type === 'function' &&
            (type === 'view' ? func.state_mutability === 'view' : func.state_mutability !== 'view'));
    };
    if (!contract) {
        return (<div className="container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading contract data...</p>
                </div>
            </div>);
    }
    return (<div className="container">
            <header className="header">
                <h1>{contract.name}</h1>
                <p className="subtitle">Cairo Contract Interaction Interface</p>
            </header>

            <div className="section deployment-section">
                <h2>Deploy & Declare</h2>
                <div className="button-group">
                    <button className={`button primary bg-gradient-to-r from-[#9433DC] to-[#D57B52] ${isLoading.declare ? 'loading' : ''}`} onClick={declareContract} disabled={isLoading.declare}>
                        {isLoading.declare ? 'Declaring...' : 'Declare Contract'}
                    </button>
                    <button className={`button primary bg-gradient-to-r from-[#9433DC] to-[#D57B52] ${isLoading.deploy ? 'loading' : ''}`} onClick={deployContract} disabled={isLoading.deploy || !deploymentInfo.classHash}>
                        {isLoading.deploy ? 'Deploying...' : 'Deploy Contract'}
                    </button>
                </div>
                
                {(deploymentInfo.classHash || deploymentInfo.contractAddress) && (<div className="deployment-info">
                        {deploymentInfo.classHash && (<div className="info-item">
                                <label>Class Hash:</label>
                                <span className="hash">{deploymentInfo.classHash}</span>
                            </div>)}
                        {deploymentInfo.contractAddress && (<div className="info-item">
                                <label>Contract Address:</label>
                                <span className="hash">{deploymentInfo.contractAddress}</span>
                            </div>)}
                    </div>)}
            </div>

            <div className="functions-container">
                <div className="functions-column">
                    <div className="section">
                        <h2>View Functions</h2>
                        <div className="functions-list">
                            {getFunctionsByType('view').map((func, index) => (<FunctionCard key={`view-${index}`} func={func} inputs={functionInputs[func.name] || []} onInputChange={(index, value) => updateFunctionInput(func.name, index, value)} onCall={() => callFunction(func.name)} isLoading={isLoading[func.name]} disabled={!deploymentInfo.contractAddress} type="view"/>))}
                        </div>
                    </div>
                </div>

                <div className="functions-column">
                    <div className="section">
                        <h2>Write Functions</h2>
                        <div className="functions-list">
                            {getFunctionsByType('write').map((func, index) => (<FunctionCard key={`write-${index}`} func={func} inputs={functionInputs[func.name] || []} onInputChange={(index, value) => updateFunctionInput(func.name, index, value)} onCall={() => callFunction(func.name)} isLoading={isLoading[func.name]} disabled={!deploymentInfo.contractAddress} type="write"/>))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="section logs-section">
                <div className="logs-header">
                    <h2>Logs</h2>
                    <button className="button secondary small" onClick={clearLogs}>
                        Clear
                    </button>
                </div>
                <div className="logs">
                    {logs.map((log, index) => (<div key={index} className={`log-entry ${log.includes('ERROR') ? 'error' : ''}`}>
                            {log}
                        </div>))}
                    {logs.length === 0 && (<div className="log-entry empty">No logs yet...</div>)}
                </div>
            </div>
        </div>);
};
const FunctionCard = ({ func, inputs, onInputChange, onCall, isLoading, disabled, type }) => {
    return (<div className={`function-card ${type}`}>
            <div className="function-header">
                <h3>{func.name}</h3>
                <span className={`function-type ${type}`}>{type}</span>
            </div>
            
            {func.inputs && func.inputs.length > 0 && (<div className="function-inputs">
                    {func.inputs.map((input, index) => (<div key={index} className="input-group">
                            <label>{input.name}</label>
                            <input type="text" placeholder={`${input.type}`} value={inputs[index] || ''} onChange={(e) => onInputChange(index, e.target.value)} className="input" disabled={disabled}/>
                        </div>))}
                </div>)}
            
            <div className="function-footer">
                <button className={`button ${type === 'view' ? 'secondary' : 'primary'} ${isLoading ? 'loading' : ''}`} onClick={onCall} disabled={disabled || isLoading}>
                    {isLoading ? 'Calling...' : `Call ${func.name}`}
                </button>
            </div>

            {func.outputs && func.outputs.length > 0 && (<div className="function-outputs">
                    <small>Returns: {func.outputs.map((output) => output.type).join(', ')}</small>
                </div>)}
        </div>);
};
export default ContractInterface;
//# sourceMappingURL=ContractInteraction.js.map