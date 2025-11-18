import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { CompiledSierra, Contract, RpcProvider } from "starknet";

export interface ContractArtifact {
  abi: any[];
  classHash?: string;
  contractAddress?: string;
  sierraProgram: string[];
  sierraProgramDebugInfo?: Record<string, any>;
  contractClassVersion: string;
  entryPointsByType: Record<string, any>;
  name: string;
  compiledCasm: Record<string, any>;
}

export class ContractItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: "contract" | "deployedContract" | "folder" | "action" | "addExternalContract" | "externalContract",
    public readonly artifact?: ContractArtifact,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState || vscode.TreeItemCollapsibleState.None);

    this.contextValue = type;

    switch (type) {
      case "contract":
        this.iconPath = new vscode.ThemeIcon("file-code");
        this.tooltip = `Contract: ${label}`;
        break;
      case "deployedContract":
        this.iconPath = new vscode.ThemeIcon("cloud");
        this.tooltip = `Deployed Contract: ${label}`;
        break;
      case "folder":
        this.iconPath = new vscode.ThemeIcon("folder");
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        break;
      case "action":
        this.iconPath = new vscode.ThemeIcon("gear");
        this.tooltip = "Configure Cairo workspace root";
        this.command = {
          command: "ankh.selectWorkspaceRoot",
          title: "Select Workspace Root",
          arguments: [],
        };
        break;
      case "addExternalContract":
        this.iconPath = new vscode.ThemeIcon("add");
        this.tooltip = "Add External Contract";
        this.command = {
          command: "ankh.addExternalContract",
          title: "Add External Contract",
          arguments: []
        }
        break;
      case "externalContract":
        this.iconPath = new vscode.ThemeIcon("file-code");
        this.tooltip = `Contract: ${label}`;
        this.command = {
          command: "ankh.openContract",
          title: "Open External Contract",
          arguments: [this],
        };
        break;
    }
  }
}

export class CairoContractProvider
  implements vscode.TreeDataProvider<ContractItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ContractItem | undefined | null | void
  > = new vscode.EventEmitter<ContractItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ContractItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private contracts: ContractArtifact[] = [];
  private deployedContracts: ContractArtifact[] = [];
  private externalContracts: ContractArtifact[] = [];
  private customWorkspaceRoot: string | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.customWorkspaceRoot =
      this.context.workspaceState.get<string>("cairoWorkspaceRoot");
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
      // This is at the root level
      const items: ContractItem[] = [];

      if (this.contracts.length > 0) {
        items.push(
          new ContractItem(
            "Contracts",
            "folder",
            undefined,
            vscode.TreeItemCollapsibleState.Expanded,
          ),
        );
      }

      if (this.deployedContracts.length > 0) {
        items.push(
          new ContractItem(
            "Deployed",
            "folder",
            undefined,
            vscode.TreeItemCollapsibleState.Expanded,
          ),
        );
      }

      if (this.externalContracts.length > 0) {
        items.push(
          new ContractItem(
            "External",
            "folder",
            undefined,
            vscode.TreeItemCollapsibleState.Expanded,
          )
        )
      }

      items.push(
        new ContractItem(
          "Add External Contract",
          "addExternalContract",
          undefined,
          vscode.TreeItemCollapsibleState.None,
        )
      )

      // if (items.length === 0) {
      //     items.push(new ContractItem('No contracts found', 'folder', undefined, vscode.TreeItemCollapsibleState.None));
      // }

      if (this.contracts.length === 0 && this.deployedContracts.length === 0) {
        items.push(
          new ContractItem(
            "No contracts found",
            "folder",
            undefined,
            vscode.TreeItemCollapsibleState.None,
          ),
        );
        // Show the user a CTA to configure contract workspace root folder
        items.push(
          new ContractItem(
            "Configure Cairo workspace root",
            "action",
            undefined,
            vscode.TreeItemCollapsibleState.None,
          ),
        );
      }

      return Promise.resolve(items);
    }

    if (element.label === "Contracts") {
      return Promise.resolve(
        this.contracts.map(
          (contract) => new ContractItem(contract.name, "contract", contract),
        ),
      );
    }

    if (element.label === "Deployed") {
      return Promise.resolve(
        this.deployedContracts.map(
          (contract) =>
            new ContractItem(contract.name, "deployedContract", contract),
        ),
      );
    }

    if (element.label === "External") {
      return Promise.resolve(
        this.externalContracts.map(
          (contract) => 
            new ContractItem(contract.name, "externalContract", contract),
        )
      )
    }

    return Promise.resolve([]);
  }

  async selectWorkspaceRoot(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace is currently open");
      return;
    }

    // Get subdirectories in the workspace
    const subDirectories: { label: string; path: string }[] = [];

    for (const folder of workspaceFolders) {
      const rootPath = folder.uri.fsPath;

      // Add the root folder itself
      subDirectories.push({
        label: `${folder.name} (workspace root)`,
        path: rootPath,
      });

      // Find subdirectories
      await this.findSubDirectories(rootPath, rootPath, subDirectories, 0, 3); // Max depth of 3
    }

    // Show directory select for subdirectories
    const selectedItem = await vscode.window.showQuickPick(
      subDirectories.map((dir) => ({
        label: dir.label,
        description: dir.path,
        detail: this.checkForCairoFiles(dir.path) ? "Contains Cairo files" : "",
        value: dir.path,
      })),
      {
        placeHolder: "Select the root directory for your Cairo contracts",
        matchOnDescription: true,
        matchOnDetail: true,
      },
    );

    if (selectedItem) {
      this.customWorkspaceRoot = selectedItem.value;
      await this.context.workspaceState.update(
        "cairoWorkspaceRoot",
        this.customWorkspaceRoot,
      );

      vscode.window.showInformationMessage(
        `Cairo workspace root set to: ${path.relative(workspaceFolders[0].uri.fsPath, this.customWorkspaceRoot)}`,
      );

      // Refresh to scan the new root
      this.refresh();
    }
  }

  private async findSubDirectories(
    basePath: string,
    currentPath: string,
    result: { label: string; path: string }[],
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    if (depth >= maxDepth) {
      return;
    }

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        if (
          item.isDirectory() &&
          !item.name.startsWith(".") &&
          item.name !== "node_modules" &&
          item.name !== "target"
        ) {
          const fullPath = path.join(currentPath, item.name);
          const relativePath = path.relative(basePath, fullPath);

          result.push({
            label: `${relativePath}/`,
            path: fullPath,
          });

          // Recursively search subdirectories
          await this.findSubDirectories(
            basePath,
            fullPath,
            result,
            depth + 1,
            maxDepth,
          );
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  private checkForCairoFiles(dirPath: string): boolean {
    try {
      const items = fs.readdirSync(dirPath);

      // Check for Cairo files or Scarb.toml
      return items.some(
        (item) =>
          item.endsWith(".cairo") ||
          item === "Scarb.toml" ||
          item === "Cairo.toml",
      );
    } catch {
      return false;
    }
  }

  async clearWorkspaceRoot(): Promise<void> {
    this.customWorkspaceRoot = undefined;
    await this.context.workspaceState.update("cairoWorkspaceRoot", undefined);
    vscode.window.showInformationMessage(
      "Cairo workspace root cleared. Using default workspace root.",
    );
    this.refresh();
  }

  getCurrentWorkspaceRoot(): string | undefined {
    return this.customWorkspaceRoot;
  }

  private async loadContracts(): Promise<void> {
    this.contracts = [];
    this.deployedContracts = [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    const foldersToScan = this.customWorkspaceRoot
      ? [this.customWorkspaceRoot]
      : workspaceFolders.map((folder) => folder.uri.path);

    for (const folderPath of foldersToScan) {
      await this.scanWorkspaceFolder(folderPath);
    }
  }

  private async scanWorkspaceFolder(workspacePath: string): Promise<void> {
    await this.ensureScarbTomlHasCasm(workspacePath);

    // Look for Scarb build artifacts
    const targetPath = path.join(workspacePath, "target", "dev");

    if (!fs.existsSync(targetPath)) {
      return;
    }

    try {
      const files = fs.readdirSync(targetPath);

      for (const file of files) {
        if (file.endsWith(".contract_class.json")) {
          const contractPath = path.join(targetPath, file);
          const artifact = await this.parseContractArtifact(contractPath);

          if (artifact) {
            this.contracts.push(artifact);
          }
        }
      }
    } catch (error) {
      console.error("Error scanning for contracts:", error);
    }
  }

  async addExternalContract() {
    const address = await vscode.window.showInputBox({
      title: "Contract Address",
      prompt: "Input the contract address",
      placeHolder: "0x...",
      validateInput(value) {
        const starknetAddressRegex = /^0x[0-9a-fA-F]{64}$/;

        if (!starknetAddressRegex.test(value)) {
          return "Must be a valid Starknet address format"
        }
      },
    })

    if (!address) return;

    try {
      const artifact = await this._addExternalContract(address);

      this._onDidChangeTreeData.fire();
      vscode.window.showInformationMessage(`Added external contract ${artifact.name}`);
      this.context.workspaceState.update(
        "externalContracts",
        this.externalContracts
      )
    } catch (err) {
      console.error(err);
      vscode.window.showErrorMessage(`Failed to add external contract: ${err}`);
    }

  }

  private async _addExternalContract(contractAddress: string): Promise<ContractArtifact> {
    const rpcUrl = this.getRpcUrl();

    if (rpcUrl === "") {
      throw new Error("Missing rpc url in environment variables");
    };

    const provider = new RpcProvider({ nodeUrl: rpcUrl });

    const classDef = await provider.getClassAt(contractAddress)
    const classHash = await provider.getClassHashAt(contractAddress);
    const compiledCasm = await provider.getCompiledCasm(classHash);
    const contractClassVersion = await provider.getContractVersion(contractAddress);

    const newContractArtifact: ContractArtifact = {
      abi: classDef.abi as any,
      contractAddress,
      classHash,
      entryPointsByType: classDef.entry_points_by_type,
      name: classDef.abi[0].name,
      sierraProgram: (classDef as Omit<CompiledSierra, "sierra_program_debug_info">).sierra_program,
      // sierraProgramDebugInfo: "",
      compiledCasm,
      contractClassVersion: contractClassVersion.cairo!
    }

    this.externalContracts.push(newContractArtifact);
    console.log(newContractArtifact);

    return newContractArtifact;
  }

  private async ensureScarbTomlHasCasm(workspacePath: string): Promise<void> {
    const scarbTomlPath = path.join(workspacePath, "Scarb.toml");

    // Check if Scarb.toml exists
    if (!fs.existsSync(scarbTomlPath)) {
      return; // No Scarb.toml, nothing to do
    }

    try {
      let content = fs.readFileSync(scarbTomlPath, "utf8");

      // Check if [[target.starknet-contract]] section exists
      const targetSectionRegex = /\[\[target\.starknet-contract\]\]/;
      if (!targetSectionRegex.test(content)) {
        return; // No starknet-contract target, nothing to do
      }

      // Extract the entire [[target.starknet-contract]] section
      // Match from [[target.starknet-contract]] to the next section or end of file
      const sectionMatch = content.match(
        /\[\[target\.starknet-contract\]\]([\s\S]*?)(?=\n\s*\[|\n\s*$|$)/,
      );

      if (!sectionMatch) {
        return;
      }

      const sectionContent = sectionMatch[1];

      // Check if casm is already defined in this section
      const casmMatch = sectionContent.match(/^\s*casm\s*=\s*(true|false)/m);

      if (casmMatch) {
        // CASM exists, check if it's false
        if (casmMatch[1] === "false") {
          // Update false to true
          content = content.replace(
            /(\[\[target\.starknet-contract\]\][\s\S]*?)casm\s*=\s*false/,
            "$1casm = true",
          );

          fs.writeFileSync(scarbTomlPath, content, "utf8");

          vscode.window.showInformationMessage(
            "Updated Scarb.toml: Set casm = true (required for ANKH)",
          );
        }
        // If it's already true, do nothing
        return;
      }

      // CASM doesn't exist, need to add it
      // Find where to insert it (after sierra = true if it exists, otherwise right after the section header)
      const sierraMatch = sectionContent.match(
        /^\s*sierra\s*=\s*(true|false)/m,
      );

      if (sierraMatch) {
        // Insert after sierra line
        content = content.replace(
          /(\[\[target\.starknet-contract\]\][\s\S]*?sierra\s*=\s*(?:true|false))/,
          "$1\ncasm = true",
        );
      } else {
        // Insert right after [[target.starknet-contract]]
        content = content.replace(
          /(\[\[target\.starknet-contract\]\]\s*\n)/,
          "$1casm = true\n",
        );
      }

      fs.writeFileSync(scarbTomlPath, content, "utf8");

      vscode.window.showInformationMessage(
        "Updated Scarb.toml: Added casm = true (required for ANKH)",
      );
    } catch (error) {
      console.error("Error updating Scarb.toml:", error);
      vscode.window.showWarningMessage(
        "Failed to update Scarb.toml. Please manually add 'casm = true' to [[target.starknet-contract]]",
      );
    }
  }

  getRpcUrl(): string {
    let rpcUrl = "";
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const envPath = path.join(workspaceFolders[0].uri.fsPath, ".env");

        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const envLines = envContent.split("\n");

          envLines.forEach((line) => {
            const [key, value] = line.split("=");
            if (key && value) {
              const trimmedKey = key.trim();
              const trimmedValue = value.trim();

              if (trimmedKey === "RPC_URL_SEPOLIA") {
                rpcUrl = trimmedValue;
              }
            }
          });
        }
      }

      return rpcUrl;
    } catch (err) {
      console.error("Failed to get rpc url: ", err);
      return "";
    }
  }

  private async parseContractArtifact(
    filePath: string,
  ): Promise<ContractArtifact | null> {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const artifact = JSON.parse(content);

      const name = path.basename(filePath, ".contract_class.json");
      const casmPathParts = filePath.split(".").slice(0, -2);
      const casmBaseName = casmPathParts.join(".");

      const casmPath = `${casmBaseName}.compiled_contract_class.json`;

      const casmContent = fs.readFileSync(casmPath, "utf8");

      if (!casmContent || casmContent === "") {
        return null;
      }

      const casmArtifact = JSON.parse(casmContent);

      return {
        name,
        abi: artifact?.abi || [],
        sierraProgram: artifact?.sierra_program || [],
        sierraProgramDebugInfo: artifact?.sierra_program_debug_info,
        contractClassVersion: artifact?.contract_class_version,
        entryPointsByType: artifact?.entry_points_by_type,
        compiledCasm: casmArtifact,
      };
    } catch (error) {
      console.error(`Error parsing contract artifact ${filePath}:`, error);
      return null;
    }
  }
}
