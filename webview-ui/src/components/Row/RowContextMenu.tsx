import { FC } from "react";
import { BaseContextMenu } from "@/components/common";
import { MenuItemProps } from "@/types/components";

interface RowContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: React.RefObject<HTMLElement | null>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

const rowMenuItems: MenuItemProps[] = [
  {
    label: "Delete Row",
    keybinding: "Ctrl+Shift+D",
    value: "deleteRow",
  },
  {
    label: "Insert Row Above",
    keybinding: "Ctrl+Shift+I",
    value: "insertRowAbove",
  },
  {
    label: "Insert Row Below",
    keybinding: "Ctrl+Shift+B",
    value: "insertRowBelow",
  },
];

export const RowContextMenu: FC<RowContextMenuProps> = ({
  isContextMenuOpen,
  menuRef,
  contextMenuProps,
  onSelect,
  onClose,
  className,
}) => {
  if (!contextMenuProps) return null;

  return (
    <BaseContextMenu
      ref={menuRef as never}
      isOpen={isContextMenuOpen}
      position={{ top: contextMenuProps.top, left: contextMenuProps.left }}
      onSelect={onSelect}
      onClose={onClose}
      items={rowMenuItems}
      className={className}
    />
  );
};
