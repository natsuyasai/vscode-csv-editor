// import { describe, it, expect, vi, beforeEach } from "vitest";
// import { render, fireEvent, screen, act } from "@testing-library/react";
// import { EditableTableRoot } from "@/components/EditableTableRoot";

// // Mock hooks and components
// vi.mock("@/hooks/useDirection", () => ({
//   useDirection: () => "ltr",
// }));
// vi.mock("@/hooks/useRows", () => ({
//   useRows: (csvArray: Array<Array<string>>) => ({
//     rows: csvArray.slice(1).map((row, i) =>
//       Object.fromEntries(row.map((cell, j) => [`col${j}`, cell]))
//     ),
//   }),
// }));
// vi.mock("@/hooks/useColumns", () => ({
//   useColumns: (csvArray: Array<Array<string>>) => ({
//     columns: csvArray[0].map((_, i) => ({
//       key: `col${i}`,
//       name: `Col${i}`,
//     })),
//   }),
// }));
// vi.mock("@/hooks/useContextMenu", () => {
//   let contextMenuProps: any = null;
//   let isContextMenuOpen = false;
//   return {
//     useContextMenu: () => ({
//       contextMenuProps,
//       setContextMenuProps: vi.fn((props) => {
//         contextMenuProps = props;
//         isContextMenuOpen = !!props;
//       }),
//       menuRef: { current: null },
//       isContextMenuOpen,
//     }),
//   };
// });
// vi.mock("@/hooks/useCellCopy", () => ({
//   useCellCopy: () => ({
//     handleCellCopy: vi.fn(),
//   }),
// }));
// vi.mock("./ContextMenu", () => ({
//   ContextMenu: (props: any) => (
// //     <div data-testid="context-menu" {...props}>
// //     ContextMenu
// //     <button onClick={() => props.onSelect("deleteRow")}>Delete Row</button>
// //     <button onClick={() => props.onSelect("insertRowAbove")}>Insert Row Above</button>
// //     <button onClick={() => props.onSelect("insertRowBelow")}>Insert Row Below</button>
// //     <button onClick={props.onClose}>Close</button>
// //   </div>
//   )
// }));

// const csvArrayFixture = [
//   ["A", "B", "C"],
//   ["1", "2", "3"],
//   ["4", "5", "6"],
// ];

// describe("EditableTableRoot", () => {
//   let setCSVArray: ReturnType<typeof vi.fn>;

//   beforeEach(() => {
//     setCSVArray = vi.fn();
//   });

//   it("renders DataGrid with correct rows and columns", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     expect(screen.getByRole("grid")).toBeInTheDocument();
//   });

//   it("calls setCSVArray when a row is changed", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     // Simulate onRowsChange
//     act(() => {
//       // @ts-ignore
//       screen.getByRole("grid").props.onRowsChange([
//         { col0: "10", col1: "20", col2: "30" },
//         { col0: "40", col1: "50", col2: "60" },
//       ]);
//     });
//     expect(setCSVArray).toHaveBeenCalled();
//   });

//   it("inserts a row above on Ctrl+Shift+I", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     const grid = screen.getByRole("grid");
//     fireEvent.keyDown(grid, { key: "I", ctrlKey: true, shiftKey: true });
//     // Should call setCSVArray to insert a row
//     expect(setCSVArray).toHaveBeenCalled();
//   });

//   it("inserts a row below on Ctrl+Shift+B", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     const grid = screen.getByRole("grid");
//     fireEvent.keyDown(grid, { key: "B", ctrlKey: true, shiftKey: true });
//     expect(setCSVArray).toHaveBeenCalled();
//   });

//   it("deletes a row on Ctrl+Shift+D", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     const grid = screen.getByRole("grid");
//     fireEvent.keyDown(grid, { key: "D", ctrlKey: true, shiftKey: true });
//     expect(setCSVArray).toHaveBeenCalled();
//   });

//   it("opens context menu and handles menu actions", () => {
//     render(<EditableTableRoot csvArray={csvArrayFixture} setCSVArray={setCSVArray} />);
//     // Simulate right click to open context menu
//     act(() => {
//       // @ts-ignore
//       screen.getByRole("grid").props.onCellContextMenu(
//         { row: { col0: "1", col1: "2", col2: "3" } },
//         { preventGridDefault: () => {}, preventDefault: () => {}, clientY: 10, clientX: 20 }
//       );
//     });
//     // Context menu should be rendered
//     expect(screen.queryByTestId("context-menu")).toBeInTheDocument();
//     // Simulate menu actions
//     fireEvent.click(screen.getByText("Delete Row"));
//     expect(setCSVArray).toHaveBeenCalled();
//     fireEvent.click(screen.getByText("Insert Row Above"));
//     expect(setCSVArray).toHaveBeenCalled();
//     fireEvent.click(screen.getByText("Insert Row Below"));
//     expect(setCSVArray).toHaveBeenCalled();
//     fireEvent.click(screen.getByText("Close"));
//   });
// });
