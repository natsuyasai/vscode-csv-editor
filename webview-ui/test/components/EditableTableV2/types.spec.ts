import { describe, it, expect } from "vitest";
import type {
  EditableTableV2Props,
  RowData,
  FilterInputProps,
  DraggableHeaderCellProps,
  ContextMenuPosition,
} from "@/components/EditableTableV2/types";

describe("EditableTableV2/types", () => {
  describe("EditableTableV2Props", () => {
    it("should have correct property types", () => {
      const props: EditableTableV2Props = {
        csvArray: [["header1", "header2"]],
        theme: "light",
        setCSVArray: () => {},
        onApply: () => {},
      };

      expect(props.csvArray).toBeInstanceOf(Array);
      expect(props.theme).toBe("light");
      expect(typeof props.setCSVArray).toBe("function");
      expect(typeof props.onApply).toBe("function");
    });

    it("should accept dark theme", () => {
      const props: EditableTableV2Props = {
        csvArray: [],
        theme: "dark",
        setCSVArray: () => {},
        onApply: () => {},
      };

      expect(props.theme).toBe("dark");
    });
  });

  describe("RowData", () => {
    it("should be a record of string to string", () => {
      const rowData: RowData = {
        col0: "value1",
        col1: "value2",
        rowIdx: "1",
      };

      expect(rowData.col0).toBe("value1");
      expect(rowData.col1).toBe("value2");
      expect(rowData.rowIdx).toBe("1");
    });
  });

  describe("FilterInputProps", () => {
    it("should have column with filter methods", () => {
      const mockGetFilterValue = () => "test";
      const mockSetFilterValue = () => {};

      const props: FilterInputProps = {
        column: {
          getFilterValue: mockGetFilterValue,
          setFilterValue: mockSetFilterValue,
        },
      };

      expect(props.column.getFilterValue()).toBe("test");
      expect(typeof props.column.setFilterValue).toBe("function");
    });
  });

  describe("DraggableHeaderCellProps", () => {
    it("should have all required properties", () => {
      const props: DraggableHeaderCellProps = {
        columnIndex: 0,
        children: "Header",
        onColumnReorder: () => {},
        isSelected: false,
      };

      expect(props.columnIndex).toBe(0);
      expect(props.children).toBe("Header");
      expect(typeof props.onColumnReorder).toBe("function");
      expect(props.isSelected).toBe(false);
    });

    it("should accept optional properties", () => {
      const props: DraggableHeaderCellProps = {
        columnIndex: 1,
        children: "Header",
        onColumnReorder: () => {},
        onSort: () => {},
        onDoubleClick: () => {},
        onColumnSelect: () => {},
        onFocusChange: () => {},
        isSelected: true,
      };

      expect(props.onSort).toBeDefined();
      expect(props.onDoubleClick).toBeDefined();
      expect(props.onColumnSelect).toBeDefined();
      expect(props.onFocusChange).toBeDefined();
      expect(props.isSelected).toBe(true);
    });
  });

  describe("ContextMenuPosition", () => {
    it("should have position properties", () => {
      const position: ContextMenuPosition = {
        itemIdx: 0,
        top: 100,
        left: 200,
      };

      expect(position.itemIdx).toBe(0);
      expect(position.top).toBe(100);
      expect(position.left).toBe(200);
    });
  });
});
