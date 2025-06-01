import { RowSizeType } from "@/types";
import { useState } from "react";

export function useHeaderAction() {
  const [isIgnoreHeaderRow, setIsIgnoreHeaderRow] = useState(false);
  const [rowSize, setRowSize] = useState<RowSizeType>("normal");

  return { isIgnoreHeaderRow, setIsIgnoreHeaderRow, rowSize, setRowSize };
}
