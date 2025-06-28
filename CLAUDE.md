# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the official Visual Studio Code (Code - OSS) repository where Microsoft develops VS Code together with the community. This is a large, mature codebase with a modular architecture built on TypeScript, using Electron for desktop deployment.

## Development Commands

### Build and Compilation
```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Watch mode for development
npm run watch

# Launch development instance
./scripts/code.sh     # macOS/Linux
scripts/code.bat      # Windows
```

### Testing
```bash
# Run unit tests
npm run test-node

# Run browser tests
npm run test-browser

# Run extension tests
npm run test-extension

# Run smoke tests (UI automation)
npm run smoketest

# Run specific test file
npm run test-node -- --grep "TestName"
```

### Code Quality
```bash
# Run all pre-commit checks
npm run precommit

# ESLint for TypeScript/JavaScript
npm run eslint

# StyleLint for CSS/SCSS
npm run stylelint  

# Comprehensive hygiene checks
npm run hygiene
```

## Architecture Overview

### Core Structure
```
src/vs/
├── base/          # Foundation layer - utilities, data structures, async operations
├── platform/      # Service layer - cross-platform functionality (file system, terminal, etc.)
├── editor/        # Monaco editor core - standalone editor component
├── workbench/     # VS Code specific UI and features built on Monaco
└── server/        # Remote development server components
```

### Key Architectural Patterns

1. **Service-Based Architecture**: Dependency injection pattern with services registered in service collections
2. **Layered Design**: Clear separation between base → platform → editor → workbench layers
3. **Extension Model**: Extensions are first-class citizens with defined APIs
4. **Monaco Modularity**: Editor can be used standalone without VS Code workbench

### Important Service Types
- `IFileService`: File system operations
- `IConfigurationService`: Settings and configuration management
- `IExtensionService`: Extension loading and management
- `ITerminalService`: Integrated terminal functionality
- `IEditorService`: Editor management and operations

## Code Style Guidelines

### TypeScript Conventions
- Use tabs for indentation
- PascalCase for types and enums
- camelCase for functions, methods, properties, and variables
- Use single quotes for internal strings, double quotes for user-visible strings
- Always use curly braces for control structures
- Arrow functions preferred over anonymous functions

### Import Organization
```typescript
// 1. Node modules
import * as path from 'path';

// 2. VS Code modules (ordered by layer)
import { Event } from 'vs/base/common/event';
import { IFileService } from 'vs/platform/files/common/files';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

// 3. Relative imports
import { MyClass } from './myClass';
```

## Extension Development

Extensions live in the `extensions/` folder. Each extension typically includes:
- `package.json`: Extension manifest
- `src/extension.ts`: Main extension entry point
- Language extensions: Grammar files, snippets, language configuration

## Performance Considerations

1. **Lazy Loading**: Features are loaded on-demand to improve startup time
2. **Web Workers**: Heavy computations run in separate threads
3. **Virtual Scrolling**: Large lists and editors use virtualization
4. **Efficient IPC**: Minimize data transfer between processes
5. **Bundle Optimization**: Webpack configuration for optimal bundling

## Testing Best Practices

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test service interactions and API contracts
3. **Smoke Tests**: Automated UI testing for critical user workflows
4. **Test Location**: Place tests next to source files (e.g., `file.ts` → `file.test.ts`)

## Common Development Tasks

### Adding a New Command
1. Define command in `src/vs/workbench/contrib/*/browser/*.contribution.ts`
2. Register command handler
3. Add to command palette if user-facing
4. Include keybinding if appropriate

### Creating a New Service
1. Define interface in `common/` folder
2. Implement in `browser/` or `node/` folder
3. Register in appropriate service collection
4. Add to dependency injection where needed

### Modifying Monaco Editor
1. Core editor changes go in `src/vs/editor/`
2. VS Code specific features go in `src/vs/workbench/`
3. Consider standalone editor compatibility
4. Test in both contexts

## Debugging

Use VS Code launch configurations in `.vscode/launch.json`:
- "Launch VS Code": Debug main process
- "Attach to Extension Host": Debug extensions
- "Run Unit Tests": Debug test execution

## Important Notes

- This is an Electron-based application with separate main and renderer processes
- The codebase uses AMD module system with custom loader
- Many features support both desktop and web deployment
- Respect the layering - don't import workbench code into platform or base layers
- All user-visible strings must be externalized for localization