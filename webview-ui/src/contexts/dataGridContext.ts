import { createContext } from "react";
import { DataGridHandle } from "react-data-grid";

export const DataGridContext = createContext<DataGridHandle | null>(null);
