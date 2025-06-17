# CLAUDE.md
必ず日本語で回答してください。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a VSCode extension that provides a custom CSV editor with a React-based webview UI. The extension uses a dual-architecture approach:

- **Extension side** (`src/`): TypeScript code running in VSCode's extension host
- **Webview side** (`webview-ui/`): React application that renders the CSV editor interface

Key components:
- `CSVEditorProvider` implements VSCode's CustomTextEditorProvider interface
- React app uses `react-data-grid` for the editable table interface
- Communication between extension and webview via postMessage API
- Uses Zustand for state management and custom hooks for data operations

## Communication Architecture

Message passing uses typed interfaces in `src/message/`:
- `messageTypeToWebview.ts`: Extension → Webview messages (init, update, updateTheme)
- `messageTypeToExtention.ts`: Webview → Extension messages (init, update, reload, save)
- Data flow: VSCode Document ↔ Extension ↔ Webview with debounced updates

## Build Commands

### Extension Development
```bash
# Install dependencies for both extension and webview
npm run install:all

# Development build with watching (builds extension + webview, watches TypeScript)
npm run watch

# Production build (includes webview build)
npm run package

# Type checking
npm run check-types

# Linting
npm run lint

# Run tests (requires pre-compilation)
npm test

# Run single test file
npx vscode-test --grep "test name"
```

### Webview Development
```bash
cd webview-ui

# Start development server (for isolated webview development)
npm start

# Build for production (called automatically by extension package command)
npm run build

# Run tests with Vitest
npm test

# Run tests in watch mode
npm test -- --watch

# Run Storybook for component development
npm run storybook

# Type checking
npm run check-types

# Linting (includes ESLint + markuplint for JSX/TSX)
npm run lint
```

## Testing

- Extension tests use VSCode's test framework (`@vscode/test-cli`)
- Webview tests use Vitest with React Testing Library
- Storybook for component development and testing

## Architecture Notes

The extension registers a custom editor for CSV files that:
1. Creates a webview panel with React UI
2. Parses CSV content using `csv-parse` library  
3. Renders editable table using `react-data-grid`
4. Supports features like sorting, searching, row/column operations, drag & drop
5. Updates the underlying VSCode document when changes are made
6. Handles theme changes and VS Code integration

Key architectural decisions:
- **State Management**: Combination of React state + Zustand store for cell editing
- **Custom Hooks**: Extensive use of custom hooks (`useRows`, `useColumns`, `useFilters`, etc.)
- **Performance**: Virtual scrolling, debounced updates, React.memo optimizations
- **History Management**: Built-in undo/redo functionality with state history
- **Keyboard Shortcuts**: Ctrl+S (save), Ctrl+F (search), Ctrl+Z/Y (undo/redo)

## Key Files for Development

- `src/editor/csvEditorProvider.ts`: Main extension logic and webview communication
- `webview-ui/src/App.tsx`: Main React component with state management
- `webview-ui/src/components/EditableTable.tsx`: Core table component with extensive features
- `webview-ui/src/hooks/useUpdateCsvArray.ts`: CSV data operations with history management