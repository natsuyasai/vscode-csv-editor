import { VscodeContextMenu } from "@vscode-elements/react-elements";
import { FC, Ref } from "react";

export interface ContextMenuItem {
  label: string;
  keybinding: string;
  value: string;
  tabindex: number;
}

interface BaseContextMenuProps {
  isContextMenuOpen: boolean;
  menuRef: Ref<HTMLElement>;
  contextMenuProps: { itemIdx: number; top: number; left: number } | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  className?: string;
  data: ContextMenuItem[];
}

export const BaseContextMenu: FC<BaseContextMenuProps> = ({
  isContextMenuOpen,
  menuRef,
  contextMenuProps,
  onSelect,
  onClose,
  className,
  data,
}) => {
  if (!isContextMenuOpen || !contextMenuProps) return null;

  return (
    <VscodeContextMenu
      ref={menuRef as never}
      show={isContextMenuOpen}
      className={className}
      data={data}
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