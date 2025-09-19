# ANKH README

> A comprehensive vscode extension for interacting with smart contracts as you build

Ankh brings the power of Starknet development directly into your VS Code workspace. Declare, deploy, and interact with Cairo smart contracts through an intuitive interface that streamlines your entire development workflow.

## Features

### Smart Contract Management

- Automatic Discovery: Automatically scans your workspace for compiled Cairo contracts (target/dev/*.contract_class.json)
- Tree View Interface: Organized view of all contracts in your project with dedicated sections for local and deployed contracts
- Multi-Contract Support: Work with multiple contracts simultaneously, each in its own persistent tab

### Full Contract Lifecycle

- Declare Contracts: Deploy contract classes to Starknet and receive class hashes
- Deploy Instances: Deploy contract instances from declared classes
- Function Interaction: Call both view and write functions directly from the interface
- Real-time Logging: Track all operations with timestamped logs

### Developer Experience

- Remix-like Interface: Familiar UI similar to Remix IDE with modern VS Code theming
- Persistent State: Contract deployment info and logs persist across VS Code sessions
- Environment Integration: Automatically loads account credentials from .env files
- Monorepo Support: Configure custom workspace roots for projects within larger repositories

### Advanced Capabilities

- Multiple Network Support: Works with Sepolia testnet, mainnet, and local devnets
- ABI-Based Interface: Dynamically generates function interfaces from contract ABIs
- Input Validation: Smart input handling for different Cairo data types
- State Management: Remembers deployment information and interaction history

<!-- Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace: -->

<!-- \!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->


### Installation

- Install the extension from the VS Code Marketplace
- Open a Cairo project with compiled contracts in target/dev/
- View contracts in the Ankh panel in the Explorer sidebar

<!-- ## Requirements -->

## Quick Start

### Prerequisites:

- Scarb, for compilation of contracts
- `.env` file, for deployment/interaction settings, with starknet credentials

### Environment Setup

- Create a `.env` file in your project root

```env
PRIVATE_KEY_SEPOLIA=0x1234...
ACCOUNT_ADDRESS_SEPOLIA=0x5678...
RPC_URL_SEPOLIA=https://starknet-sepolia.public.blastapi.io/rpc/v0_8
```

### Basic Usage
- View Contracts: Compiled contracts appear automatically in the Ankh tree view

\!\[Contracts Tree View\]\(./assets/ankh-tree-view.png\)

- Open Interface: Click any contract to open its interaction interface
- Declare: Click "Declare Contract" to deploy the contract class
- Deploy: After declaration, click "Deploy Contract" to create an instance
- Interact: Use the generated function interface to call contract methods

\!\[Sidebar view\]\(./assets/show-ankh-sidebar.png\)

## Configuration

### Workspace Root Selection

For monorepos where cairo contracts are not in the root workspace root:
- Click "Configure Cairo workspace root" in the tree view
- Select the directory containing your Cairo project
- Ankh will remember this setting per workspace

### Multiple Panels

- Click different contracts to open multiple interaction panels
- Each contract maintains its own state and deployment information
- Switch between panels using VS Code's tab system

## Commands
Access these commands via the Command Palette (```Ctrl+Shift+P```):

- ```Ankh: Refresh Contracts``` - Rescan workspace for contracts
- ```Ankh: Select Cairo Workspace Root``` - Configure custom project root
- ```Ankh: Clear Cairo Workspace Root``` - Reset to default workspace scanning
- ```Ankh: Show Current Workspace Root``` - Display current configuration
- ```Ankh: Close All Contract Panels``` - Close all open contract interfaces
- ```Ankh: Show Active Panels``` - List currently open contract panels

## Interface Overview

### Contract Declaration & Deployment

- One-click contract declare and deploy to Starknet
- Automatic class hash generation and display
- Interact with an already-deployed address of a contract provided it is the same abi (or even similar enough)
<!-- - Persistent deployment information across sessions -->

\!\[Ankh UI\]\(./assets/ankh-panel-view.png\)

### Function Interaction

Constructor CallData can be set once the panel is opened, before clicking deploy. 
If there is an already deployed version of the contract, interact with it by simply putting the contract address in the right input field, and clicking on Load Contract
View functions and Write functions are displayed on separate tabs.

### Supported Networks

Sepolia Testnet (default)

Support for devnet coming soon...

Network configuration is handled through environment variables.

## Requirements

- VS Code 1.74.0 or higher
- Cairo project with Scarb configuration
- Compiled contracts in target/dev/ directory

## Extension Settings
Ankh stores workspace-specific settings including:

- Custom workspace root paths
- Panel state and logs

All settings are automatically saved and restored per workspace.

## Troubleshooting

### No Contracts Found

- Ensure contracts are compiled with ```scarb build```
- Check that ```.contract_class.json``` files exist in ```target/dev/```
- Use "Configure Cairo workspace root" for monorepos

### Connection Issues

- Verify .env file configuration
- Check RPC endpoint availability
- Ensure account has sufficient balance for transactions

### Panel Not Loading

- Try refreshing with Ankh: Refresh Contracts
- Check VS Code Developer Tools console for errors
- Verify React build completed successfully

### Contributing
Issues and feature requests are welcome. This extension is built with:

- TypeScript for VS Code extension logic
- React with Vite for the webview interface
- Tailwind CSS for styling
- Starknet.js for blockchain interactions

## Support

You can do one of the following
<!-- - Watch {YouTube video link} for demonstration -->
- Reach the Publisher at wilfridokorie@gmail.com
- Raise an issue at https://github.com/OWK50GA/Ankh/issues


License
MIT

Ankh - Bringing life to your Cairo smart contracts ⚱️

<!-- ## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!** -->
