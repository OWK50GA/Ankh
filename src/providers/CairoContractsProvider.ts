import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ContractArtifact {
    abi: any[];
    classHash?: string;
    contractAddress?: string;
    compiedSierra?: string[];
    name: string;
}

export class ContractItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: 'contract' | 'deployedContract' | 'folder',
        public readonly artifact?: ContractArtifact,
        public readonly collapsibleState?: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState || vscode.TreeItemCollapsibleState.None);
        
        this.contextValue = type;
        
        switch (type) {
            case 'contract':
                this.iconPath = new vscode.ThemeIcon('file-code');
                this.tooltip = `Contract: ${label}`;
                // this.command = {
                //     command: 'cairo-tester.itemClicked',
                //     title: 'Open Contract',
                //     arguments: [this]
                // }
                break;
            case 'deployedContract':
                this.iconPath = new vscode.ThemeIcon('cloud');
                this.tooltip = `Deployed Contract: ${label}`;
                // this.command = {
                //     command: 'cairo-tester.itemClicked',
                //     title: 'Interact with Contract',
                //     arguments: [this]
                // };
                break;
            case 'folder':
                this.iconPath = new vscode.ThemeIcon('folder');
                this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                break;
        }
    }
}

export class CairoContractProvider implements vscode.TreeDataProvider<ContractItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContractItem | undefined | null | void> = new vscode.EventEmitter<ContractItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContractItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private contracts: ContractArtifact[] = [];
    private deployedContracts: ContractArtifact[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadContracts();
    }

    refresh(): void {
        this.loadContracts();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ContractItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ContractItem): Thenable<ContractItem[]> {
        if (!element) {
            // Root level
            const items: ContractItem[] = [];
            
            if (this.contracts.length > 0) {
                items.push(new ContractItem('Contracts', 'folder', undefined, vscode.TreeItemCollapsibleState.Expanded));
            }
            
            if (this.deployedContracts.length > 0) {
                items.push(new ContractItem('Deployed', 'folder', undefined, vscode.TreeItemCollapsibleState.Expanded));
            }

            if (items.length === 0) {
                items.push(new ContractItem('No contracts found', 'folder', undefined, vscode.TreeItemCollapsibleState.None));
            }
            
            return Promise.resolve(items);
        }

        if (element.label === 'Contracts') {
            return Promise.resolve(
                this.contracts.map(contract => 
                    new ContractItem(contract.name, 'contract', contract)
                )
            );
        }

        if (element.label === 'Deployed') {
            return Promise.resolve(
                this.deployedContracts.map(contract => 
                    new ContractItem(contract.name, 'deployedContract', contract)
                )
            );
        }

        return Promise.resolve([]);
    }

    private async loadContracts(): Promise<void> {
        this.contracts = [];
        this.deployedContracts = [];

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        for (const folder of workspaceFolders) {
            await this.scanWorkspaceFolder(folder.uri.fsPath);
        }
    }

    private async scanWorkspaceFolder(workspacePath: string): Promise<void> {
        // Look for Scarb build artifacts
        const targetPath = path.join(workspacePath, 'target', 'dev');
        
        if (!fs.existsSync(targetPath)) {
            return;
        }

        try {
            const files = fs.readdirSync(targetPath);
            
            for (const file of files) {
                if (file.endsWith('.contract_class.json')) {
                    const contractPath = path.join(targetPath, file);
                    const artifact = await this.parseContractArtifact(contractPath);
                    
                    if (artifact) {
                        this.contracts.push(artifact);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning for contracts:', error);
        }

        // Load deployed contracts from extension storage
        const deployedData = this.context.globalState.get<any[]>('deployedContracts', []);
        this.deployedContracts = deployedData;
    }

    private async parseContractArtifact(filePath: string): Promise<ContractArtifact | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const artifact = JSON.parse(content);
            
            const name = path.basename(filePath, '.contract_class.json');
            
            return {
                name,
                abi: artifact.abi || [],
                compiedSierra: artifact.sierra_program
            };
        } catch (error) {
            console.error(`Error parsing contract artifact ${filePath}:`, error);
            return null;
        }
    }

    async addDeployedContract(contract: ContractArtifact): Promise<void> {
        this.deployedContracts.push(contract);
        await this.context.globalState.update('deployedContracts', this.deployedContracts);
        this.refresh();
    }
}