import * as vscode from 'vscode'
import { ContractArtifact, ContractItem } from '../providers/CairoContractsProvider';
import * as path from 'path';
import * as fs from 'fs';

interface PanelState {
    contractName: string;
    deploymentInfo?: {
        classHash?: string;
        contractAddress?: string;
    };
    logs?: string[];
}

export class ContractInteractionPanel {
    private static activePanels: Map<string, ContractInteractionPanel>  = new Map();
    private static context: vscode.ExtensionContext;

    public static currentPanel: ContractInteractionPanel | undefined;
    public readonly _panel: vscode.WebviewPanel;
    public readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _contract: ContractArtifact;
    private _accountInfo: {
        privateKey?: string;
        walletAddress?: string;
        rpcUrl?: string;
    } = {};
    private _state: PanelState;

    public static initialize(context: vscode.ExtensionContext) {
        ContractInteractionPanel.context = context;
    }

    public static createOrShow(extensionUri: vscode.Uri, contractItem: ContractItem) {
        const contractName = contractItem.artifact?.name;
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined
        
        // if (ContractInteractionPanel.currentPanel) {
        //     ContractInteractionPanel.currentPanel._panel.reveal(column);
        //     ContractInteractionPanel.currentPanel.updateContract(contractItem.artifact!)
        //     return;
        // }

        const existingPanel = ContractInteractionPanel.activePanels.get(contractName!);
        if (existingPanel) {
            // Reveal existing panel and update contract data
            existingPanel._panel.reveal(column);
            existingPanel.updateContract(contractItem.artifact!);
            return existingPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'contractInteraction',
            `${contractItem.label} - Contract Interaction`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'cairo-tester-ui', 'build'),
                ],
                retainContextWhenHidden: true,
            }
        )

        const contractPanel = new ContractInteractionPanel(
            panel,
            extensionUri,
            contractItem.artifact!
        );

        ContractInteractionPanel.activePanels.set(contractName!, contractPanel);
        return contractPanel;
    }

    public static getActivePanels(): ContractInteractionPanel[] {
        return Array.from(ContractInteractionPanel.activePanels.values());
    }

    public getContractName(panel: ContractInteractionPanel): string {
        return panel._contract.name;
    }

    public static closeAll() {
        ContractInteractionPanel.activePanels.forEach(panel => panel.dispose());
        ContractInteractionPanel.activePanels.clear();
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, contract: ContractArtifact) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._contract = contract;

        this._state = {
            contractName: contract.name,
            deploymentInfo: {},
            logs: []
        };

        this._loadEnvironmentVariables();
        this._loadPersistedState();
        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // const accountInfo = {
        //     address: 
        // }
        this._panel.onDidChangeViewState(() => {
            this._saveState();
        }, null, this._disposables);


        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    // case 'declareContract':
                    //     await this.handleDeclareContract(message.data);
                    //     break;
                    // case 'deployContract':
                    //     await this.handleDeployContract(message.data);
                    //     break;
                    // case 'callContract':
                    //     await this.handleCallContract(message.data);
                    //     break;
                    case 'getContractData':
                        this._panel.webview.postMessage({
                            type: 'contractData',
                            data: this._contract
                        });
                        break;
                    case 'getAccountInfo':
                        this._panel.webview.postMessage({
                            type: 'accountInfo',
                            data: this._accountInfo
                        });
                        break;
                    case 'getPersistentState':
                        this._panel.webview.postMessage({
                            type: 'persistentState',
                            data: this._state
                        });
                        break;
                    case 'updateState':
                        this._updateState(message.data);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private _loadPersistedState() {
        if (ContractInteractionPanel.context) {
            const stateKey = `panel-state-${this._contract.name}`;
            const savedState = ContractInteractionPanel.context.workspaceState.get<PanelState>(stateKey);
            
            if (savedState) {
                this._state = { ...this._state, ...savedState };
                console.log(`Loaded persisted state for ${this._contract.name}:`, this._state);
            }
        }
    }

     private _saveState() {
        if (ContractInteractionPanel.context) {
            const stateKey = `panel-state-${this._contract.name}`;
            ContractInteractionPanel.context.workspaceState.update(stateKey, this._state);
        }
    }

    private _updateState(newState: Partial<PanelState>) {
        this._state = { ...this._state, ...newState };
        this._saveState();
    }

    private _loadEnvironmentVariables() {
        try {
            if (!this._accountInfo.privateKey || !this._accountInfo.walletAddress) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    const envPath = path.join(workspaceFolders[0].uri.fsPath, '.env');

                    if (fs.existsSync(envPath)) {
                        const envContent = fs.readFileSync(envPath, 'utf8');
                        const envLines = envContent.split('\n');

                        envLines.forEach(line => {
                            const [key, value] = line.split('=');
                            if (key && value) {
                                const trimmedKey = key.trim();
                                const trimmedValue = value.trim();

                                if (trimmedKey === 'PRIVATE_KEY_SEPOLIA') {
                                    this._accountInfo.privateKey = trimmedValue;
                                } else if (trimmedKey === 'RPC_URL_SEPOLIA') {
                                    this._accountInfo.rpcUrl = trimmedValue;
                                } else if (trimmedKey === 'ACCOUNT_ADDRESS_SEPOLIA') {
                                    this._accountInfo.walletAddress = trimmedValue;
                                }
                            }
                        });

                        // console.log("Loaded account info: ", this._accountInfo);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load environment variables: ", err);
        }
    }

    private updateContract(contract: ContractArtifact) {
        this._contract = contract;
        this._state.contractName = contract.name;
        this._update();
    }

    // private async handleDeclareContract(data: any) {
    //     try {
    //         console.log('Declaring contract: ', data);

    //         console.log("Handle Declare Contract here");
    //         const classHash = '0x' + Math.random().toString(16).substring(2, 66);

    //         this._panel.webview.postMessage({
    //             type: 'declareResult',
    //             data: { success: true, classHash }
    //         });
    //     } catch (err) {
    //         this._panel.webview.postMessage({
    //             type: 'declareResult',
    //             data: { success: false, error: (err as Error).message }
    //         });
    //     }
    // }

    // private async handleDeployContract(data: any) {
    //     try {
    //         console.log('Deploying contract:', data);
            
    //         // Simulate deployment
    //         const contractAddress = '0x' + Math.random().toString(16).substring(2, 66);
            
    //         this._panel.webview.postMessage({
    //             type: 'deployResult',
    //             data: { success: true, contractAddress }
    //         });
    //     } catch (error) {
    //         this._panel.webview.postMessage({
    //             type: 'deployResult',
    //             data: { success: false, error: (error as Error).message }
    //         });
    //     }
    // }

    // private async handleCallContract(data: any) {
    //     try {
    //         console.log('Calling contract function:', data);
            
    //         // Simulate function call
    //         const result = { result: 'Function executed successfully' };
            
    //         this._panel.webview.postMessage({
    //             type: 'callResult',
    //             data: { success: true, result }
    //         });
    //     } catch (error) {
    //         this._panel.webview.postMessage({
    //             type: 'callResult',
    //             data: { success: false, error: (error as Error).message }
    //         });
    //     }
    // }

    public dispose() {
        ContractInteractionPanel.activePanels.delete(this._contract.name);
        this._saveState();

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = `${this._contract.name} - Contract Interaction`;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Check if React build exists
        const reactBuildPath = vscode.Uri.joinPath(this._extensionUri, 'cairo-tester-ui', 'build');
        
        try {
            // Try to load the built React app
            const scriptUri = webview.asWebviewUri(
                vscode.Uri.joinPath(reactBuildPath, 'assets', 'index.js')
            );
            const cssUri = webview.asWebviewUri(
                vscode.Uri.joinPath(reactBuildPath, 'assets', 'index.css')
            );

            return this._getReactAppHtml(webview, scriptUri, cssUri);
        } catch {
            // Fallback to basic HTML if React build doesn't exist
            return this._getFallbackHtml(webview);
        }
    }

    private _getReactAppHtml(webview: vscode.Webview, scriptUri: vscode.Uri, cssUri: vscode.Uri): string {
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https: wss:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>Contract Interaction</title>
                <link href="${cssUri}" rel="stylesheet">
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root"></div>
                <script nonce="${nonce}">
                    // Initialize communication with VS Code
                    window.vscode = acquireVsCodeApi();
                    
                    // Request initial contract data
                    window.vscode.postMessage({ type: 'getContractData' });
                    window.vscode.postMessage({ type: 'getAccountInfo' });
                    
                    // window.addEventListener('message', event => {
                    //     const message = event.data;
                    //     if (message.type === 'accountInfo') {
                    //         window.accountInfo = message.data;
                    //         console.log('Account info received:', {
                    //             ...message.data,
                    //             privateKey: message.data.privateKey ? '***' + message.data.privateKey.slice(-4) : 'Not set'
                    //         });
                            
                    //         // Dispatch a custom event for React components to listen to
                    //         window.dispatchEvent(new CustomEvent('accountInfoUpdated', {
                    //             detail: message.data
                    //         }));
                    //     }
                    // });
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private _getFallbackHtml(webview: vscode.Webview): string {
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contract Interaction</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    
                    .section {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    
                    .section h2 {
                        margin-top: 0;
                        color: var(--vscode-textPreformat-foreground);
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 10px;
                    }
                    
                    .button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin: 5px;
                    }
                    
                    .button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .input {
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 8px;
                        border-radius: 4px;
                        margin: 5px;
                        width: 200px;
                    }
                    
                    .abi-function {
                        background: var(--vscode-textBlockQuote-background);
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        border-radius: 4px;
                        padding: 10px;
                        margin: 10px 0;
                    }
                    
                    .logs {
                        background: var(--vscode-terminal-background);
                        color: var(--vscode-terminal-foreground);
                        padding: 15px;
                        border-radius: 4px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 12px;
                        max-height: 200px;
                        overflow-y: auto;
                        white-space: pre-wrap;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${this._contract.name} Contract Interaction</h1>
                    
                    <div class="section">
                        <h2>Deploy & Declare</h2>
                        <button class="button" onclick="declareContract()">Declare Contract</button>
                        <button class="button" onclick="deployContract()">Deploy Contract</button>
                        <div id="deployment-info" style="margin-top: 10px; font-size: 12px;"></div>
                    </div>
                    
                    <div class="section">
                        <h2>Contract Functions</h2>
                        <div id="functions-container"></div>
                    </div>
                    
                    <div class="section">
                        <h2>Logs</h2>
                        <div id="logs" class="logs"></div>
                        <button class="button" onclick="clearLogs()" style="margin-top: 10px;">Clear Logs</button>
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let contractData = ${JSON.stringify(this._contract)};
                    
                    function log(message) {
                        const logsDiv = document.getElementById('logs');
                        const timestamp = new Date().toLocaleTimeString();
                        logsDiv.textContent += \`[\${timestamp}] \${message}\\n\`;
                        logsDiv.scrollTop = logsDiv.scrollHeight;
                    }
                    
                    function clearLogs() {
                        document.getElementById('logs').textContent = '';
                    }
                    
                    function declareContract() {
                        log('Declaring contract...');
                        vscode.postMessage({
                            type: 'declareContract',
                            data: { contractName: contractData.name }
                        });
                    }
                    
                    function deployContract() {
                        log('Deploying contract...');
                        vscode.postMessage({
                            type: 'deployContract',
                            data: { contractName: contractData.name }
                        });
                    }
                    
                    function callFunction(functionName, inputs) {
                        log(\`Calling function: \${functionName}\`);
                        vscode.postMessage({
                            type: 'callContract',
                            data: { functionName, inputs }
                        });
                    }
                    
                    // Render ABI functions
                    function renderFunctions() {
                        const container = document.getElementById('functions-container');
                        if (!contractData.abi || contractData.abi.length === 0) {
                            container.innerHTML = '<p>No ABI functions available</p>';
                            return;
                        }
                        
                        contractData.abi.forEach(func => {
                            if (func.type === 'function') {
                                const funcDiv = document.createElement('div');
                                funcDiv.className = 'abi-function';
                                
                                const inputs = func.inputs || [];
                                const inputsHtml = inputs.map((input, index) => 
                                    \`<input class="input" placeholder="\${input.name} (\${input.type})" id="input-\${func.name}-\${index}" />\`
                                ).join('');
                                
                                funcDiv.innerHTML = \`
                                    <strong>\${func.name}</strong>
                                    <div style="margin: 10px 0;">
                                        \${inputsHtml}
                                        <button class="button" onclick="callFunctionWithInputs('\${func.name}', \${inputs.length})">Call</button>
                                    </div>
                                \`;
                                
                                container.appendChild(funcDiv);
                            }
                        });
                    }
                    
                    function callFunctionWithInputs(functionName, inputCount) {
                        const inputs = [];
                        for (let i = 0; i < inputCount; i++) {
                            const inputElement = document.getElementById(\`input-\${functionName}-\${i}\`);
                            inputs.push(inputElement.value);
                        }
                        callFunction(functionName, inputs);
                    }
                    
                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'contractData':
                                contractData = message.data;
                                renderFunctions();
                                break;
                            case 'declareResult':
                                if (message.data.success) {
                                    log(\`Contract declared successfully! Class Hash: \${message.data.classHash}\`);
                                    document.getElementById('deployment-info').innerHTML = \`Class Hash: \${message.data.classHash}\`;
                                } else {
                                    log(\`Declaration failed: \${message.data.error}\`);
                                }
                                break;
                            case 'deployResult':
                                if (message.data.success) {
                                    log(\`Contract deployed successfully! Address: \${message.data.contractAddress}\`);
                                    document.getElementById('deployment-info').innerHTML += \`<br>Contract Address: \${message.data.contractAddress}\`;
                                } else {
                                    log(\`Deployment failed: \${message.data.error}\`);
                                }
                                break;
                            case 'callResult':
                                if (message.data.success) {
                                    log(\`Function call successful: \${JSON.stringify(message.data.result)}\`);
                                } else {
                                    log(\`Function call failed: \${message.data.error}\`);
                                }
                                break;
                        }
                    });
                    
                    // Initialize
                    renderFunctions();
                    log('Contract interaction panel loaded');
                </script>
            </body>
            </html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}