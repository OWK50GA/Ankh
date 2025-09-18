// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CairoContractProvider, ContractItem } from './providers/CairoContractsProvider';
import { ContractInteractionPanel } from './panels/ContractInteractionPanel';
import path from 'path';

// class SimpleTreeProvider implements vscode.TreeDataProvider<string> {
//     private _onDidChangeTreeData: vscode.EventEmitter<string | undefined | null | void> = new vscode.EventEmitter<string | undefined | null | void>();
//     readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> = this._onDidChangeTreeData.event;

//     getTreeItem(element: string): vscode.TreeItem {
//         const item = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
//         item.iconPath = new vscode.ThemeIcon('file-code');
//         return item;
//     }

//     getChildren(element?: string): Thenable<string[]> {
//         if (!element) {
//             return Promise.resolve(['Contract 1', 'Contract 2', 'Test Contract']);
//         }
//         return Promise.resolve([]);
//     }

//     refresh(): void {
//         this._onDidChangeTreeData.fire();
//     }
// }

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Cairo Tester for Cairo Contracts now active');

    ContractInteractionPanel.initialize(context);

	const contractProvider = new CairoContractProvider(context);

	const treeView = vscode.window.createTreeView('cairo-tester', {
		treeDataProvider: contractProvider,
		showCollapseAll: true
	});

    vscode.commands.registerCommand('cairo-tester.itemClicked', (item: ContractItem) => {
        if (item.type === 'contract' || item.type === 'deployedContract') {
            ContractInteractionPanel.createOrShow(context.extensionUri, item);
        }
    });

    treeView.onDidChangeSelection((e) => {
        if (e.selection.length > 0) {
            const selectedItem = e.selection[0];
            vscode.commands.executeCommand('cairo-tester.itemClicked', selectedItem);
        }
    })

	const refreshCommand = vscode.commands.registerCommand('cairo-tester.refreshContracts', () => {
        contractProvider.refresh();
    });

    // const deployCommand = vscode.commands.registerCommand('cairo-tester.deployContract', 
    //     // async (item: ContractItem) => {
    //     //     if (item.type === 'contract') {
    //     //         await deployContract(item, context);
    //     //     }
    //     // }
	// 	() => { console.log("Deploy command running"); }
    // );

    // const interactCommand = vscode.commands.registerCommand('cairo-tester.interactWithContract', 
    //     // async (item: ContractItem) => {
    //     //     if (item.type === 'deployedContract') {
    //     //         ContractInteractionPanel.createOrShow(context.extensionUri, item);
    //     //     }
    //     // }
	// 	() => { console.log("Interact command running"); }
    // );

    const openContractCommand = vscode.commands.registerCommand('cairo-tester.openContract', 
        (item: ContractItem) => {
            ContractInteractionPanel.createOrShow(context.extensionUri, item);
        }
    );

    const closeAllPanelsCommand = vscode.commands.registerCommand('cairo-tester.closeAllPanels', () => {
        ContractInteractionPanel.closeAll();
        vscode.window.showInformationMessage('All contract panels closed');
    });

    const showActivePanelsCommand = vscode.commands.registerCommand('cairo-tester.showActivePanels', () => {
        const activePanels = ContractInteractionPanel.getActivePanels();
        if (activePanels.length === 0) {
            vscode.window.showInformationMessage('No active contract panels');
        } else {
            const panelNames = activePanels.map(panel => panel.getContractName(panel));
            vscode.window.showInformationMessage(`Active panels: ${panelNames.join(', ')}`);
        }
    });

    const selectWorkspaceRootCommand = vscode.commands.registerCommand('cairo-tester.selectWorkspaceRoot', async () => {
        await contractProvider.selectWorkspaceRoot();
    });

    // Command to clear workspace root
    const clearWorkspaceRootCommand = vscode.commands.registerCommand('cairo-tester.clearWorkspaceRoot', async () => {
        await contractProvider.clearWorkspaceRoot();
    });

    // Command to show current workspace root
    const showWorkspaceRootCommand = vscode.commands.registerCommand('cairo-tester.showWorkspaceRoot', () => {
        const currentRoot = contractProvider.getCurrentWorkspaceRoot();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (currentRoot && workspaceFolders) {
            const relativePath = path.relative(workspaceFolders[0].uri.fsPath, currentRoot);
            vscode.window.showInformationMessage(`Cairo workspace root: ${relativePath || 'workspace root'}`);
        } else {
            vscode.window.showInformationMessage('Using default workspace root');
        }
    });

    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        ContractInteractionPanel.closeAll();
    });


	const watcher = vscode.workspace.createFileSystemWatcher('**/target/dev/**/*.json');
	watcher.onDidChange(() => contractProvider.refresh());
	watcher.onDidCreate(() => contractProvider.refresh());
	watcher.onDidDelete(() => contractProvider.refresh());
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('cairo-tester.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from cairo-tester!');
	// });

	context.subscriptions.push(
        treeView, 
        refreshCommand, 
        watcher,
        openContractCommand,
        showActivePanelsCommand,
        closeAllPanelsCommand,
        workspaceWatcher,
        selectWorkspaceRootCommand,
        showWorkspaceRootCommand,
        clearWorkspaceRootCommand
    );
}

// This method is called when your extension is deactivated
export function deactivate() {
    ContractInteractionPanel.closeAll();
}
