import { useState, useRef, useLayoutEffect } from "react";

interface DefaultContextMenuProps {
  itemIdx: number;
  top: number;
  left: number;
}

export function useContextMenu<T extends DefaultContextMenuProps = DefaultContextMenuProps>() {
  const [contextMenuProps, setContextMenuProps] = useState<T | null>(null);
  const menuRef = useRef<HTMLElement>(null);
  const isContextMenuOpen = contextMenuProps !== null;

  useLayoutEffect(() => {
    if (!isContextMenuOpen) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
        return;
      }
      setContextMenuProps(null);
    }

    addEventListener("mousedown", onMouseDown);

    return () => {
      removeEventListener("mousedown", onMouseDown);
    };
  }, [isContextMenuOpen]);

  return { contextMenuProps, setContextMenuProps, menuRef, isContextMenuOpen };
}
