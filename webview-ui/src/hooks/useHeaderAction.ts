import { useState } from "react";
import { RowSizeType } from "@/types";

export function useHeaderAction() {
  const [isIgnoreHeaderRow, setIsIgnoreHeaderRow] = useState(false);
  const [rowSize, setRowSize] = useState<RowSizeType>("normal");

  return { isIgnoreHeaderRow, setIsIgnoreHeaderRow, rowSize, setRowSize };
}
