import { FC } from "react";
import { BaseContextMenu, ContextMenuItem } from "../common/BaseContextMenu";

interface RowContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: React.RefObject<HTMLElement | null>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

const rowMenuData: ContextMenuItem[] = [
  {
    label: "Delete Row",
    keybinding: "Ctrl+Shift+D",
    value: "deleteRow",
    tabindex: 0,
  },
  {
    label: "Insert Row Above",
    keybinding: "Ctrl+Shift+I",
    value: "insertRowAbove",
    tabindex: 1,
  },
  {
    label: "Insert Row Below",
    keybinding: "Ctrl+Shift+B",
    value: "insertRowBelow",
    tabindex: 2,
  },
];

export const RowContextMenu: FC<RowContextMenuProps> = (props) => {
  return <BaseContextMenu {...props} data={rowMenuData} />;
};
