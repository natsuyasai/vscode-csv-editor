import { DataGridHandle } from "react-data-grid";
import { createContext } from "react";

export const DataGridContext = createContext<DataGridHandle | null>(null);
