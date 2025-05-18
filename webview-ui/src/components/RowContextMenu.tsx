import { FC } from "react";
import { VscodeContextMenu } from "@vscode-elements/react-elements";

interface RowContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: React.RefObject<any>;
  contextMenuProps: { rowIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
}

export const RowContextMenu: FC<RowContextMenuProps> = ({
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
