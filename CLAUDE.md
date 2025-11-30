# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- 必ず日本語で回答してください。
- ユーザーからの指示や仕様に疑問などがあれば作業を中断し、質問すること。
- Robert C. Martinが提唱する原則に従ってコードを作成してください。
- TDDおよびテスト駆動開発で実装する際は、すべてt-wadaの推奨する進め方に従ってください。
- リファクタリングはMartin Fowloerが推奨する進め方に従ってください。
- セキュリティルールに従うこと。
- 実装完了時に必ず「npm run check-types」と「npm run lint」を実行し、エラーや警告がない状態としてください。
- エラーや警告が発生する場合は、必ず修正してください。
- Before doing any UI, frontend or React development, ALWAYS call the storybook MCP server to get further instructions.

## Project Structure

This is a VSCode extension that provides a custom CSV editor with a React-based webview UI. The extension uses a dual-architecture approach:

- **Extension side** (`src/`): TypeScript code running in VSCode's extension host
- **Webview side** (`webview-ui/`): React application that renders the CSV editor interface

Key components:
- `CSVEditorProvider` implements VSCode's CustomTextEditorProvider interface
- React app uses `tanstack/react-table` for the editable table interface
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
3. Renders editable table using `@tanstack/react-table` with virtual scrolling (`@tanstack/react-virtual`)
4. Supports features like sorting, searching, filtering, row/column operations, drag & drop
5. Provides row and column resizing with Excel-like behavior
6. Updates the underlying VSCode document when changes are made
7. Handles theme changes and VS Code integration

Key architectural decisions:
- **State Management**: Combination of React state + Zustand store for cell editing
- **Custom Hooks**: Extensive use of custom hooks for modularity:
  - `useRowResize`: Row height resizing with drag-to-resize functionality
  - `useColumnResize`: Column width resizing with drag-to-resize functionality
  - `useCellSelection`: Cell selection and copy/paste with TSV escaping (RFC 4180)
  - `useAutoFill`: Excel-like auto-fill functionality
  - `useUpdateCsvArray`: CSV data operations with history management
  - `useTableSearch`: Search functionality with highlighting
  - `useColumnAlignment`: Column alignment controls
  - `useContextMenus`: Context menu management
- **Performance**:
  - Virtual scrolling with `@tanstack/react-virtual` for handling large datasets
  - Variable row heights support (for cells with newlines)
  - Debounced updates and React.memo optimizations
- **History Management**: Built-in undo/redo functionality with state history
- **Keyboard Shortcuts**: Ctrl+S (save), Ctrl+F (search), Ctrl+Z/Y (undo/redo), Ctrl+C/V (copy/paste)
- **Copy/Paste**: TSV format with proper escaping for newlines, tabs, and quotes (RFC 4180 compatible)

## Key Files for Development

### Extension Side
- `src/editor/csvEditorProvider.ts`: Main extension logic and webview communication

### Webview Side - Core Components
- `webview-ui/src/App.tsx`: Main React component with state management
- `webview-ui/src/components/EditableTable/index.tsx`: Core table component with virtual scrolling
- `webview-ui/src/components/EditableTable/EditableCell.tsx`: Editable cell component with auto-fill
- `webview-ui/src/components/EditableTable/HeaderCell.tsx`: Header cell with editing and column resize
- `webview-ui/src/components/EditableTable/RowIndexCell.tsx`: Row index cell with row reordering and resize
- `webview-ui/src/components/Header.tsx`: Top header with toolbar controls

### Webview Side - Custom Hooks
- `webview-ui/src/hooks/useUpdateCsvArray.ts`: CSV data operations with history management
- `webview-ui/src/hooks/useRowResize.ts`: Row height resizing (20-500px range)
- `webview-ui/src/hooks/useColumnResize.ts`: Column width resizing (50-1000px range)
- `webview-ui/src/hooks/useCellSelection.ts`: Cell selection, copy/paste, TSV escaping
- `webview-ui/src/hooks/useAutoFill.ts`: Excel-like auto-fill functionality
- `webview-ui/src/hooks/useTableSearch.ts`: Search with match navigation

### Webview Side - Styling
- `webview-ui/src/components/EditableTable/index.module.scss`: Main table styles
- `webview-ui/src/components/EditableTable/EditableCell.module.scss`: Cell styles with fill handle
- `webview-ui/src/components/EditableTable/RowIndexCell.module.scss`: Row index cell with resize handle
- Note: Uses SCSS with VSCode CSS variables for theming

## Feature Implementation Details

### Table Rendering
- **Framework**: `@tanstack/react-table` with custom cell renderers
- **Virtual Scrolling**: `@tanstack/react-virtual` for performance with large datasets
  - Variable row heights support via `estimateSize`
  - Row heights recalculated on `rowHeight` or individual `rowHeights` changes
- **Layout**: Fixed table layout with explicit column widths
- **Styling**: SCSS modules with VSCode theme variables

### Cell Editing
- **Edit Mode**: Click to edit, escape to cancel, enter/tab to save
- **Text Area**: Auto-resize textarea for multi-line content
- **Newline Support**: `white-space: pre-wrap` and `word-wrap: break-word` for proper display
- **Focus Management**: Automatic focus on edit, cursor position at end

### Row Operations
- **Row Selection**: Click row index to select entire row
- **Row Reordering**: Drag and drop rows using `react-dnd`
- **Row Resizing**: Drag handle at bottom of row index cell
  - Uses `useRef` for synchronous state access
  - Height range: 20-500px
  - Row height applied to both `<tr>` and cell `<div>` elements
- **Row Addition/Deletion**: Context menu or keyboard shortcuts
- **Row Index Column**: Fixed at 40px width, not resizable

### Column Operations
- **Column Selection**: Click column header to select entire column
- **Column Reordering**: Drag and drop column headers using `react-dnd`
- **Column Resizing**: Drag handle at right edge of column header
  - Uses `useRef` for synchronous state access
  - Width range: 50-1000px, default 150px
  - Resize handles use `position: absolute` with z-index 10
- **Column Addition/Deletion**: Context menu
- **Column Alignment**: Left/Center/Right alignment per column via context menu
- **Header Editing**: Double-click, F2, or type to edit column headers

### Sorting and Filtering
- **Sorting**: Click header to sort (ascending/descending/none), visual indicators (🔼/🔽)
- **Filtering**: Toggle filter row with input fields per column
- **Filter Persistence**: Filters maintained during data updates

### Cell Selection and Clipboard
- **Selection**: Click and drag to select range, Shift+Click for rectangular selection
- **Copy/Paste**: Ctrl+C/V with TSV format
  - RFC 4180 compliant escaping:
    - Values with newlines, tabs, or quotes wrapped in double quotes
    - Double quotes escaped by doubling (`"` → `""`)
  - Custom parser handles Unix (`\n`) and Windows (`\r\n`) line endings
- **Auto-fill**: Excel-like fill handle (drag from bottom-right of selection)
- **Bulk Edit**: Apply value to all selected cells

### Search Functionality
- **Activation**: Ctrl+F to open search
- **Navigation**: Previous/Next buttons or Enter/Shift+Enter
- **Highlighting**: Matched cells highlighted, current match emphasized
- **Auto-scroll**: Automatic scroll to matched cell

### History and Undo/Redo
- **Undo**: Ctrl+Z to undo last change
- **Redo**: Ctrl+Y to redo
- **History Stack**: Maintains full edit history per session
- **Operations Tracked**: Cell edits, row/column operations, bulk operations

### Context Menus
- **Row Context Menu**: Right-click row index
  - Insert row above/below
  - Delete row
  - Select row
- **Column Context Menu**: Right-click column header
  - Insert column left/right
  - Delete column
  - Set alignment (left/center/right)
  - Edit header

### Keyboard Shortcuts
- **Save**: Ctrl+S (triggers VSCode save)
- **Search**: Ctrl+F
- **Copy/Paste**: Ctrl+C/V
- **Undo/Redo**: Ctrl+Z/Y
- **Cell Navigation**: Arrow keys, Tab/Shift+Tab
- **Edit**: Enter, F2, or type to start editing
- **Delete**: Delete or Backspace to clear cell/header

### Theme Integration
- **VSCode Themes**: Automatic light/dark theme detection
- **CSS Variables**: Uses VSCode theme variables for colors
- **Dynamic Updates**: Theme changes applied without reload

### Data Persistence
- **Auto-save**: Debounced updates to VSCode document
- **Change Detection**: Tracks modifications, triggers dirty state
- **Format Preservation**: Maintains CSV formatting on save

### Testing Guidelines
- **Framework**: Vitest with React Testing Library
- **Component Testing**: Test user interactions, not implementation details
- **Multiple Buttons**: Use specific text or aria-label selectors when multiple `role="button"` elements exist
- **Coverage**: All features covered by unit tests
- **Pre-commit**: `npm test`, `npm run check-types`, `npm run lint` must pass