import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PortalManager } from "@/components/EditableTable/PortalManager";
import { HeaderCelContextMenu } from "@/components/Header/HeaderCelContextMenu";
import { RowContextMenu } from "@/components/Row/RowContextMenu";
import { Search } from "@/components/Search";

// モックは変数を使わずに直接定義
vi.mock("@/components/Search", () => ({
  Search: vi.fn(() => <div data-testid="search">Search Component</div>),
}));

vi.mock("@/components/Row/RowContextMenu", () => ({
  RowContextMenu: vi.fn(() => <div data-testid="row-context-menu">Row Context Menu</div>),
}));

vi.mock("@/components/Header/HeaderCelContextMenu", () => ({
  HeaderCelContextMenu: vi.fn(() => <div data-testid="header-context-menu">Header Context Menu</div>),
}));

// モックへの参照を取得
const MockSearch = vi.mocked(Search);
const MockRowContextMenu = vi.mocked(RowContextMenu);
const MockHeaderContextMenu = vi.mocked(HeaderCelContextMenu);

describe("PortalManager", () => {
  const mockProps = {
    // Search関連
    isShowSearch: false,
    searchProps: {
      isMatching: false,
      machedCount: 0,
      searchedSelectedItemIdx: 0,
      onSearch: vi.fn(),
      onClose: vi.fn(),
      onNext: vi.fn(),
      onPrevious: vi.fn(),
    },
    
    // Row Context Menu関連
    isRowContextMenuOpen: false,
    rowContextMenuProps: {
      isContextMenuOpen: false,
      menuRef: { current: null },
      contextMenuProps: null,
      className: "test-class",
      onSelect: vi.fn(),
      onClose: vi.fn(),
    },
    
    // Header Context Menu関連
    isHeaderContextMenuOpen: false,
    headerContextMenuProps: {
      isContextMenuOpen: false,
      menuRef: { current: null },
      contextMenuProps: null,
      className: "test-class",
      onSelect: vi.fn(),
      onClose: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("すべてのポータルが非表示の場合は何もレンダリングしないこと", () => {
    render(<PortalManager {...mockProps} />);
    
    expect(screen.queryByTestId("search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("row-context-menu")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-context-menu")).not.toBeInTheDocument();
  });

  it("検索が表示されている場合はSearchコンポーネントをレンダリングすること", () => {
    const props = {
      ...mockProps,
      isShowSearch: true,
    };
    
    render(<PortalManager {...props} />);
    
    expect(screen.getByTestId("search")).toBeInTheDocument();
    expect(MockSearch).toHaveBeenCalledWith(props.searchProps, undefined);
  });

  it("行コンテキストメニューが表示されている場合はRowContextMenuをレンダリングすること", () => {
    const props = {
      ...mockProps,
      isRowContextMenuOpen: true,
    };
    
    render(<PortalManager {...props} />);
    
    expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    expect(MockRowContextMenu).toHaveBeenCalledWith(props.rowContextMenuProps, undefined);
  });

  it("ヘッダーコンテキストメニューが表示されている場合はHeaderContextMenuをレンダリングすること", () => {
    const props = {
      ...mockProps,
      isHeaderContextMenuOpen: true,
    };
    
    render(<PortalManager {...props} />);
    
    expect(screen.getByTestId("header-context-menu")).toBeInTheDocument();
    expect(MockHeaderContextMenu).toHaveBeenCalledWith(props.headerContextMenuProps, undefined);
  });

  it("複数のポータルが同時に表示されることができること", () => {
    const props = {
      ...mockProps,
      isShowSearch: true,
      isRowContextMenuOpen: true,
      isHeaderContextMenuOpen: true,
    };
    
    render(<PortalManager {...props} />);
    
    expect(screen.getByTestId("search")).toBeInTheDocument();
    expect(screen.getByTestId("row-context-menu")).toBeInTheDocument();
    expect(screen.getByTestId("header-context-menu")).toBeInTheDocument();
  });

  it("ポータルがdocument.bodyに作成されること", () => {
    const props = {
      ...mockProps,
      isShowSearch: true,
    };
    
    render(<PortalManager {...props} />);
    
    // ポータルはdocument.bodyの直下に作成される
    const portalElements = document.body.querySelectorAll('[data-testid="search"]');
    expect(portalElements).toHaveLength(1);
  });

  it("検索プロパティの変更が正しく反映されること", () => {
    const props = {
      ...mockProps,
      isShowSearch: true,
      searchProps: {
        ...mockProps.searchProps,
        isMatching: true,
        machedCount: 5,
        searchedSelectedItemIdx: 2,
      },
    };
    
    render(<PortalManager {...props} />);
    
    expect(MockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        isMatching: true,
        machedCount: 5,
        searchedSelectedItemIdx: 2,
      }),
      undefined
    );
  });

  it("コンテキストメニューのpropsが正しく渡されること", () => {
    const mockMenuRef = { current: document.createElement("div") };
    const mockContextMenuProps = { itemIdx: 0, top: 100, left: 200 };
    
    const props = {
      ...mockProps,
      isRowContextMenuOpen: true,
      rowContextMenuProps: {
        ...mockProps.rowContextMenuProps,
        isContextMenuOpen: true,
        menuRef: mockMenuRef,
        contextMenuProps: mockContextMenuProps,
      },
    };
    
    render(<PortalManager {...props} />);
    
    expect(MockRowContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        isContextMenuOpen: true,
        menuRef: mockMenuRef,
        contextMenuProps: mockContextMenuProps,
      }),
      undefined
    );
  });
});