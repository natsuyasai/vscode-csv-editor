import { createContext, useContext } from "react";

export type Direction = "ltr" | "rtl";

export const DirectionContext = createContext<Direction>("ltr");

export function useDirection(): Direction {
  return useContext(DirectionContext);
}
