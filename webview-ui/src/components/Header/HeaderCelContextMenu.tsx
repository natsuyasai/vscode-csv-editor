import { FC, Ref } from "react";
import { BaseContextMenu } from "@/components/common";
import { MenuItemProps } from "@/types/components";

interface HeaderCelContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: Ref<HTMLElement>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

const headerMenuItems: MenuItemProps[] = [
  {
    label: "Delete HeaderCel",
    keybinding: "Ctrl+Shift+D",
    value: "deleteHeaderCel",
  },
  {
    label: "Insert HeaderCel Left",
    keybinding: "Ctrl+Shift+L",
    value: "insertHeaderCelLeft",
  },
  {
    label: "Insert HeaderCel Right",
    keybinding: "Ctrl+Shift+R",
    value: "insertHeaderCelRight",
  },
];

export const HeaderCelContextMenu: FC<HeaderCelContextMenuProps> = ({
  isContextMenuOpen,
  menuRef: _menuRef,
  contextMenuProps,
  onSelect,
  onClose,
  className,
}) => {
  if (!contextMenuProps) return null;

  return (
    <BaseContextMenu
      isOpen={isContextMenuOpen}
      position={{ top: contextMenuProps.top, left: contextMenuProps.left }}
      onSelect={onSelect}
      onClose={onClose}
      items={headerMenuItems}
      className={className}
    />
  );
};
