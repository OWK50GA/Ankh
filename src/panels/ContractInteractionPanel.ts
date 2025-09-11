import * as vscode from 'vscode'
import { ContractArtifact, ContractItem } from '../providers/CairoContractsProvider';

export class ContractInteractionPanel {
    public static currentPanel: ContractInteractionPanel | undefined;
    public static activePanels: ContractInteractionPanel[] | []
    public readonly _panel: vscode.WebviewPanel;
    public readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _contract: ContractArtifact;

    public static createOrShow(extensionUri: vscode.Uri, contractItem: ContractItem) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined
        
        if (ContractInteractionPanel.currentPanel) {
            ContractInteractionPanel.currentPanel._panel.reveal(column);
            ContractInteractionPanel.currentPanel.updateContract(contractItem.artifact!)
            return;
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
                ]
            }
        )

        ContractInteractionPanel.currentPanel = new ContractInteractionPanel(
            panel,
            extensionUri,
            contractItem.artifact!
        )
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, contract: ContractArtifact) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._contract = contract;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'declareContract':
                        await this.handleDeclareContract(message.data);
                        break;
                    case 'deployContract':
                        await this.handleDeployContract(message.data);
                        break;
                    case 'callContract':
                        await this.handleCallContract(message.data);
                        break;
                    case 'getContractData':
                        this._panel.webview.postMessage({
                            type: 'contractData',
                            data: this._contract
                        });
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private updateContract(contract: ContractArtifact) {
        this._contract = contract;
        this._update();
    }

    private async handleDeclareContract(data: any) {
        try {
            console.log('Declaring contract: ', data);

            console.log("Handle Declare Contract here");
            const classHash = '0x' + Math.random().toString(16).substring(2, 66);

            this._panel.webview.postMessage({
                type: 'declareResult',
                data: { success: true, classHash }
            });
        } catch (err) {
            this._panel.webview.postMessage({
                type: 'declareResult',
                data: { success: false, error: (err as Error).message }
            });
        }
    }

    private async handleDeployContract(data: any) {
        try {
            console.log('Deploying contract:', data);
            
            // Simulate deployment
            const contractAddress = '0x' + Math.random().toString(16).substring(2, 66);
            
            this._panel.webview.postMessage({
                type: 'deployResult',
                data: { success: true, contractAddress }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'deployResult',
                data: { success: false, error: (error as Error).message }
            });
        }
    }

    private async handleCallContract(data: any) {
        try {
            console.log('Calling contract function:', data);
            
            // Simulate function call
            const result = { result: 'Function executed successfully' };
            
            this._panel.webview.postMessage({
                type: 'callResult',
                data: { success: true, result }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'callResult',
                data: { success: false, error: (error as Error).message }
            });
        }
    }

    public dispose() {
        ContractInteractionPanel.currentPanel = undefined;

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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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