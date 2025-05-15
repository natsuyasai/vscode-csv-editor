import { useState, useRef, useLayoutEffect } from "react";

export function useContextMenu() {
  const [contextMenuProps, setContextMenuProps] = useState<{
    rowIdx: number;
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<any>(null);
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
