import { useState } from "react";
import { Column } from "react-data-grid";

export function useCellCopy() {
  const [copiedCell, setCopiedCell] = useState<{
    readonly row: Record<string, string>;
    readonly column: Column<Record<string, string>>;
  } | null>(null);

  function handleCellCopy(
    { row, column }: { row: Record<string, string>; column: Column<Record<string, string>> },
    event: React.ClipboardEvent<HTMLDivElement>
  ): void {
    if (window.getSelection()?.isCollapsed === false) {
      setCopiedCell(null);
      return;
    }

    setCopiedCell({ row, column });
    event.clipboardData.setData("text/plain", row[column.key as string] || "");
    event.preventDefault();
  }

  return { copiedCell, handleCellCopy };
}
