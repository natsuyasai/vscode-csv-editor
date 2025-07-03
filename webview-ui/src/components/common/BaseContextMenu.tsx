import { FC, forwardRef } from "react";
import { VscodeContextMenu } from "@vscode-elements/react-elements";
import { BaseContextMenuProps } from "@/types/components";

export const BaseContextMenu: FC<BaseContextMenuProps> = forwardRef<
  HTMLElement,
  BaseContextMenuProps
>(({
  isOpen,
  position,
  onClose,
  onSelect,
  items,
  className,
  children,
}, ref) => {
  if (!isOpen) return null;

  const menuData = items.map((item, index) => ({
    label: item.label,
    keybinding: item.keybinding,
    value: item.value,
    tabindex: index,
    disabled: item.disabled,
  }));

  return (
    <VscodeContextMenu
      ref={ref as never}
      show={isOpen}
      className={className}
      data={menuData}
      onVscContextMenuSelect={(item) => {
        onSelect(item.detail.value);
        onClose();
      }}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {children}
    </VscodeContextMenu>
  );
});

BaseContextMenu.displayName = "BaseContextMenu";