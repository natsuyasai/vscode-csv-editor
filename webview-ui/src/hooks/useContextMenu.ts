import { useCallback, useRef, useState } from "react";
import { useEventListener } from "./useEventListener";

interface DefaultContextMenuProps {
  itemIdx: number;
  top: number;
  left: number;
}

export function useContextMenu<T extends DefaultContextMenuProps = DefaultContextMenuProps>() {
  const [contextMenuProps, setContextMenuProps] = useState<T | null>(null);
  const menuRef = useRef<HTMLElement>(null);
  const isContextMenuOpen = contextMenuProps !== null;

  const onMouseDown = useCallback((event: MouseEvent) => {
    if (event.target instanceof Node && menuRef.current?.contains(event.target)) {
      return;
    }
    setContextMenuProps(null);
  }, []);

  useEventListener("mousedown", onMouseDown, document, { enabled: isContextMenuOpen });

  return { contextMenuProps, setContextMenuProps, menuRef, isContextMenuOpen };
}
