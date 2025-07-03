import { RowSizeType } from "@/types";

export const getRowHeightFromSize = (size: RowSizeType): number => {
  switch (size) {
    case "small":
      return 24;
    case "normal":
      return 40;
    case "large":
      return 80;
    case "extra large":
      return 120;
    default:
      return 40;
  }
};

export const clampRowHeight = (height: number, maxHeight: number = 500): number => {
  return Math.min(height, maxHeight);
};