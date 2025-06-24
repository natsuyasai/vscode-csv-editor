import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CellAlignmentControls } from "@/components/Header/CellAlignmentControls";
import { CellAlignment } from "@/types";

describe("CellAlignmentControls", () => {
  const mockOnAlignmentChange = vi.fn();
  const defaultAlignment: CellAlignment = {
    vertical: "center",
    horizontal: "left",
  };

  beforeEach(() => {
    mockOnAlignmentChange.mockClear();
  });

  describe("列が選択されていない場合", () => {
    it("プレースホルダーメッセージを表示する", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey={null}
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.getByText("列ヘッダーを選択してください")).toBeInTheDocument();
    });

    it("配置ボタンを表示しない", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey={null}
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.queryByText("垂直配置:")).not.toBeInTheDocument();
      expect(screen.queryByText("水平配置:")).not.toBeInTheDocument();
    });
  });

  describe("列が選択されている場合", () => {
    it("垂直配置と水平配置のセクションを表示する", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.getByText("垂直配置:")).toBeInTheDocument();
      expect(screen.getByText("水平配置:")).toBeInTheDocument();
    });

    it("垂直配置の全てのボタンを表示する", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.getByRole("button", { name: "上" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "中" })).toHaveLength(2); // 垂直と水平の両方
      expect(screen.getByRole("button", { name: "下" })).toBeInTheDocument();
    });

    it("水平配置の全てのボタンを表示する", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.getAllByRole("button", { name: "左" })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: "中" })).toHaveLength(2); // 垂直と水平の両方
      expect(screen.getByRole("button", { name: "右" })).toBeInTheDocument();
    });
  });

  describe("現在の配置の表示", () => {
    it("現在選択されている垂直配置ボタンがプライマリスタイルになる", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={{ vertical: "top", horizontal: "left" }}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      const topButton = screen.getByRole("button", { name: "上" });
      const centerButton = screen.getAllByRole("button", { name: "中" })[0]; // 垂直配置の「中」
      const bottomButton = screen.getByRole("button", { name: "下" });

      // 上ボタンは選択状態（secondaryプロパティがない）
      expect(topButton).not.toHaveAttribute("secondary");
      // その他は非選択状態（secondaryプロパティがある）
      expect(centerButton).toHaveAttribute("secondary");
      expect(bottomButton).toHaveAttribute("secondary");
    });

    it("現在選択されている水平配置ボタンがプライマリスタイルになる", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={{ vertical: "center", horizontal: "right" }}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      const leftButton = screen.getByRole("button", { name: "左" });
      const centerButton = screen.getAllByRole("button", { name: "中" })[1]; // 水平配置の「中」
      const rightButton = screen.getByRole("button", { name: "右" });

      // 右ボタンは選択状態
      expect(rightButton).not.toHaveAttribute("secondary");
      // その他は非選択状態
      expect(leftButton).toHaveAttribute("secondary");
      expect(centerButton).toHaveAttribute("secondary");
    });
  });

  describe("ボタンクリック時の動作", () => {
    it("垂直配置ボタンをクリックすると正しいアライメントでコールバックが呼ばれる", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "上" }));

      expect(mockOnAlignmentChange).toHaveBeenCalledWith({
        vertical: "top",
        horizontal: "left", // 現在の水平配置は維持される
      });
    });

    it("水平配置ボタンをクリックすると正しいアライメントでコールバックが呼ばれる", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "右" }));

      expect(mockOnAlignmentChange).toHaveBeenCalledWith({
        vertical: "center", // 現在の垂直配置は維持される
        horizontal: "right",
      });
    });

    it("複数の配置変更が正しく動作する", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      // 垂直配置を変更
      fireEvent.click(screen.getByRole("button", { name: "下" }));
      expect(mockOnAlignmentChange).toHaveBeenLastCalledWith({
        vertical: "bottom",
        horizontal: "left",
      });

      // 水平配置を変更
      fireEvent.click(screen.getAllByRole("button", { name: "中" })[1]); // 水平配置の「中」
      expect(mockOnAlignmentChange).toHaveBeenLastCalledWith({
        vertical: "center", // デフォルト値が使用される
        horizontal: "center",
      });
    });
  });

  describe("すべての配置パターン", () => {
    const verticalOptions = [
      { label: "上", value: "top" },
      { label: "中", value: "center" },
      { label: "下", value: "bottom" },
    ] as const;

    const horizontalOptions = [
      { label: "左", value: "left" },
      { label: "中", value: "center" },
      { label: "右", value: "right" },
    ] as const;

    verticalOptions.forEach(({ label: vLabel, value: vValue }) => {
      it(`垂直配置「${vLabel}」ボタンが正しく動作する`, () => {
        render(
          <CellAlignmentControls
            selectedColumnKey="col0"
            currentAlignment={{ vertical: "center", horizontal: "left" }}
            onAlignmentChange={mockOnAlignmentChange}
          />
        );

        // 垂直配置の「中」ボタンは複数あるので、最初の要素（垂直配置）を選択
        const buttons = screen.getAllByRole("button", { name: vLabel });
        const verticalButton = vLabel === "中" ? buttons[0] : buttons[0];
        
        fireEvent.click(verticalButton);

        expect(mockOnAlignmentChange).toHaveBeenCalledWith({
          vertical: vValue,
          horizontal: "left",
        });
      });
    });

    horizontalOptions.forEach(({ label: hLabel, value: hValue }) => {
      it(`水平配置「${hLabel}」ボタンが正しく動作する`, () => {
        render(
          <CellAlignmentControls
            selectedColumnKey="col0"
            currentAlignment={{ vertical: "center", horizontal: "left" }}
            onAlignmentChange={mockOnAlignmentChange}
          />
        );

        // 水平配置の「中」ボタンは2つあるので（垂直と水平）、適切なものを選択
        const buttons = screen.getAllByRole("button", { name: hLabel });
        const horizontalButton = hLabel === "中" ? buttons[1] : buttons[0];
        
        fireEvent.click(horizontalButton);

        expect(mockOnAlignmentChange).toHaveBeenCalledWith({
          vertical: "center",
          horizontal: hValue,
        });
      });
    });
  });

  describe("アクセシビリティ", () => {
    it("すべてのボタンにaria-labelまたはテキストが設定されている", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(
          button.getAttribute("aria-label") || button.textContent
        ).toBeTruthy();
      });
    });

    it("セクションラベルが適切に表示される", () => {
      render(
        <CellAlignmentControls
          selectedColumnKey="col0"
          currentAlignment={defaultAlignment}
          onAlignmentChange={mockOnAlignmentChange}
        />
      );

      expect(screen.getByText("垂直配置:")).toBeInTheDocument();
      expect(screen.getByText("水平配置:")).toBeInTheDocument();
    });
  });

  describe("エッジケース", () => {
    it("onAlignmentChangeがundefinedでもエラーにならない", () => {
      expect(() => {
        render(
          <CellAlignmentControls
            selectedColumnKey="col0"
            currentAlignment={defaultAlignment}
            onAlignmentChange={undefined as any}
          />
        );
      }).not.toThrow();
    });

    it("currentAlignmentが部分的に不正でもエラーにならない", () => {
      expect(() => {
        render(
          <CellAlignmentControls
            selectedColumnKey="col0"
            currentAlignment={{ vertical: "invalid" as any, horizontal: "left" }}
            onAlignmentChange={mockOnAlignmentChange}
          />
        );
      }).not.toThrow();
    });
  });
});