import { FC, RefObject } from "react";
import { createPortal } from "react-dom";
import { HeaderCelContextMenu } from "@/components/Header/HeaderCelContextMenu";
import { RowContextMenu } from "@/components/Row/RowContextMenu";
import { Search } from "@/components/Search";

interface SearchProps {
  isMatching?: boolean;
  machedCount: number;
  searchedSelectedItemIdx: number;
  onSearch: (text: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

interface ContextMenuProps {
  itemIdx: number;
  top: number;
  left: number;
}

interface RowContextMenuComponentProps {
  isContextMenuOpen: boolean;
  menuRef: RefObject<HTMLElement | null>;
  contextMenuProps: ContextMenuProps | null;
  className: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface HeaderContextMenuComponentProps {
  isContextMenuOpen: boolean;
  menuRef: RefObject<HTMLElement | null>;
  contextMenuProps: ContextMenuProps | null;
  className: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface Props {
  // Search関連
  isShowSearch: boolean;
  searchProps: SearchProps;
  
  // Row Context Menu関連
  isRowContextMenuOpen: boolean;
  rowContextMenuProps: RowContextMenuComponentProps;
  
  // Header Context Menu関連
  isHeaderContextMenuOpen: boolean;
  headerContextMenuProps: HeaderContextMenuComponentProps;
}

export const PortalManager: FC<Props> = ({
  isShowSearch,
  searchProps,
  isRowContextMenuOpen,
  rowContextMenuProps,
  isHeaderContextMenuOpen,
  headerContextMenuProps,
}) => {
  return (
    <>
      {isShowSearch &&
        createPortal(
          <Search {...searchProps} />,
          document.body
        )}
      
      {isRowContextMenuOpen &&
        createPortal(
          <RowContextMenu {...rowContextMenuProps} />,
          document.body
        )}
      
      {isHeaderContextMenuOpen &&
        createPortal(
          <HeaderCelContextMenu {...headerContextMenuProps} />,
          document.body
        )}
    </>
  );
};