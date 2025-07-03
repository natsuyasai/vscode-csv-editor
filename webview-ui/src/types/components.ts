import { ReactNode } from "react";

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface MenuItemProps {
  label: string;
  value: string;
  keybinding?: string;
  disabled?: boolean;
}

export interface ContextMenuProps extends BaseComponentProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  onSelect: (value: string) => void;
}

export interface BaseContextMenuProps extends ContextMenuProps {
  menuRef: React.RefObject<HTMLElement>;
  items: MenuItemProps[];
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
}

export type KeyboardModifiers = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
};