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

## Build Commands

### Extension Development
```bash
# Install dependencies for both extension and webview
npm run install:all

# Development build with watching
npm run watch

# Production build
npm run package

# Type checking
npm run check-types

# Linting
npm run lint

# Run tests
npm test
```

### Webview Development
```bash
cd webview-ui

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run Storybook
npm run storybook

# Type checking
npm run check-types

# Linting (includes markup linting)
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
4. Supports features like sorting, searching, row/column operations
5. Updates the underlying VSCode document when changes are made
6. Handles theme changes and VS Code integration

Message passing between extension and webview uses typed interfaces defined in `src/message/`.