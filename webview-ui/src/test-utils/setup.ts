import "@testing-library/jest-dom";
import { setVitestCucumberConfiguration } from "@amiceli/vitest-cucumber";
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

// Gherkin (.feature) を日本語キーワードで記述するための設定
setVitestCucumberConfiguration({ language: "ja", predefinedSteps: [], mappedExamples: {} });
