// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { CairoContractProvider, ContractItem } from './providers/CairoContractsProvider';
import { ContractInteractionPanel } from './panels/ContractInteractionPanel';
import path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('ANKH for Cairo Contracts now active');

    ContractInteractionPanel.initialize(context);

	const contractProvider = new CairoContractProvider(context);

	const treeView = vscode.window.createTreeView('ankh', {
		treeDataProvider: contractProvider,
		showCollapseAll: true
	});

    vscode.commands.registerCommand('ankh.itemClicked', (item: ContractItem) => {
        if (item.type === 'contract' || item.type === 'deployedContract') {
            ContractInteractionPanel.createOrShow(context.extensionUri, item);
        }
    });

    treeView.onDidChangeSelection((e) => {
        if (e.selection.length > 0) {
            const selectedItem = e.selection[0];
            vscode.commands.executeCommand('ankh.itemClicked', selectedItem);
        }
    })

	const refreshCommand = vscode.commands.registerCommand('ankh.refreshContracts', () => {
        contractProvider.refresh();
    });

    const openContractCommand = vscode.commands.registerCommand('ankh.openContract', 
        (item: ContractItem) => {
            ContractInteractionPanel.createOrShow(context.extensionUri, item);
        }
    );

    const closeAllPanelsCommand = vscode.commands.registerCommand('ankh.closeAllPanels', () => {
        ContractInteractionPanel.closeAll();
        vscode.window.showInformationMessage('All contract panels closed');
    });

    const showActivePanelsCommand = vscode.commands.registerCommand('ankh.showActivePanels', () => {
        const activePanels = ContractInteractionPanel.getActivePanels();
        if (activePanels.length === 0) {
            vscode.window.showInformationMessage('No active contract panels');
        } else {
            const panelNames = activePanels.map(panel => panel.getContractName(panel));
            vscode.window.showInformationMessage(`Active panels: ${panelNames.join(', ')}`);
        }
    });

    const selectWorkspaceRootCommand = vscode.commands.registerCommand('ankh.selectWorkspaceRoot', async () => {
        await contractProvider.selectWorkspaceRoot();
    });

    // Command to clear workspace root
    const clearWorkspaceRootCommand = vscode.commands.registerCommand('ankh.clearWorkspaceRoot', async () => {
        await contractProvider.clearWorkspaceRoot();
    });

    // Command to show current workspace root
    const showWorkspaceRootCommand = vscode.commands.registerCommand('ankh.showWorkspaceRoot', () => {
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
