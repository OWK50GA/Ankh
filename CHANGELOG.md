# Change Log

All notable changes to the "Ankh Client" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added:
- External Contract interaction with simple loading using address
- Vs Code settings integration for account info and provider, with backwards compatibility for `.env`
- Data and argument entry as raw JSON
- Refreshing single contract
- Persistent state for deployment Info
- Displays class hash as well as contract address

### Fixed:
- Now rejects loading contract with different class hash
- Improved contract loading workflow for smoother UX
- Shorter toasts when deployments and other actions fail
- Better handling of malformed or incomplete JSON in Raw Args mode
- Improved responsiveness and rendering of the contract panel
- More stable communication between Webview and Extension backend
- Failsafe modes for actions to avoid extension breaking
- Optimized class hash and contract address parsing
- Synchronized updates across all panels when contract data changes

### Internal

- Refactored state management for contract and account info
- Improved typing across the webview (stronger TypeScript safety)
- Reduced unnecessary webview reloads on contract changes
- Added utility function for persisting state and loading state
- Streamlined updateState message handling in panel
- Better separation of concerns between provider, panel, and webview

### Known Issues

- Raw JSON editor only shows the first variant of an enum by default. Manually enter other variants
- Enums that have structs as variants will lose state when switching tab between formdata and raw json formats
- Persistent state still experimental
- No logs yet


## [0.0.8] 

### Added:
- Support for RPC 0.9
- Code changed to use Starknet 0.14 (8.6.3)
- UI Changes made
- Button colours changed to depict read or write functions
- Bugs Fixed


## [0.0.7] 

### Added:
- Bugs Fixed


## [0.0.6] 

### Added:
- Bugs Fixed


## [0.0.5] 

### Added:
- UI Changed to Postman-Style
- Request and Response section separated
- Function listing with search feature
- Contract Setup Box
- Load and Interact with already-deployed version of contract
- ABI Copying Enabled

### Removed:
- Save current panel state


## [0.0.4] 

### Added:
- Save current panel state
- Bugs Fixed


## [0.0.3] 

### Added:
- Bugs Fixed


## [0.0.2] 

### Added:
- Bugs Fixed


- Initial release
## [0.0.1] - 10-06-2025

### Features:
- Use `env` for account and keys handling
- List form format
- Interact with local smart contract within codebase
- Easy deploy to sepolia with interaction