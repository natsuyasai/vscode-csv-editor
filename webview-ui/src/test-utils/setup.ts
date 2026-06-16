import "@testing-library/jest-dom";
import React from "react";

vi.mock("zustand");

// VSCode要素のモック
vi.mock("@vscode-elements/react-elements", () => ({
  VscodeButton: ({
    children,
    onClick,
    secondary,
    ...props
  }: React.ComponentProps<"button"> & { secondary?: boolean }) =>
    React.createElement(
      "button",
      {
        onClick,
        ...(secondary ? { secondary: "true" } : {}),
        ...props,
      },
      children
    ),
}));
