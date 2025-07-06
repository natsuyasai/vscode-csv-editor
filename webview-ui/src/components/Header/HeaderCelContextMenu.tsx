import { FC, Ref } from "react";
import { BaseContextMenu, ContextMenuItem } from "../common/BaseContextMenu";

interface HeaderCelContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: Ref<HTMLElement>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

const headerCelMenuData: ContextMenuItem[] = [
  {
    label: "Delete HeaderCel",
    keybinding: "Ctrl+Shift+D",
    value: "deleteHeaderCel",
    tabindex: 0,
  },
  {
    label: "Insert HeaderCel Left",
    keybinding: "Ctrl+Shift+L",
    value: "insertHeaderCelLeft",
    tabindex: 1,
  },
  {
    label: "Insert HeaderCel Right",
    keybinding: "Ctrl+Shift+R",
    value: "insertHeaderCelRight",
    tabindex: 2,
  },
];

export const HeaderCelContextMenu: FC<HeaderCelContextMenuProps> = (props) => {
  return <BaseContextMenu {...props} data={headerCelMenuData} />;
};
