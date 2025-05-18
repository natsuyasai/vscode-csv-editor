import { FC } from "react";
import { VscodeContextMenu } from "@vscode-elements/react-elements";

interface HeaderCelContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: React.RefObject<any>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

export const HeaderCelContextMenu: FC<HeaderCelContextMenuProps> = ({
  isContextMenuOpen,
  menuRef,
  contextMenuProps,
  onSelect,
  onClose,
  className,
}) => {
  if (!isContextMenuOpen || !contextMenuProps) return null;

  return (
    <VscodeContextMenu
      ref={menuRef}
      show={isContextMenuOpen}
      className={className}
      data={[
        {
          label: "Delete HeaderCel",
          keybinding: "Ctrl+Shift+D",
          value: "deleteHeaderCel",
          tabindex: 0,
        },
        {
          label: "Insert HeaderCel Above",
          keybinding: "Ctrl+Shift+I",
          value: "insertHeaderCelAbove",
          tabindex: 1,
        },
        {
          label: "Insert HeaderCel Below",
          keybinding: "Ctrl+Shift+B",
          value: "insertHeaderCelBelow",
          tabindex: 2,
        },
      ]}
      onVscContextMenuSelect={(item) => {
        onSelect(item.detail.value);
        onClose();
      }}
      style={{
        top: contextMenuProps.top,
        left: contextMenuProps.left,
      }}
    />
  );
};
