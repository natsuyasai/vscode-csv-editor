import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import App from "./App";

const meta: Meta<typeof App> = {
  title: "App/ParseError",
  component: App,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "CSVとして解析できない場合のエラー表示と、不揃いな列数の補完表示",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", width: "100vw" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

function postCsv(payload: string) {
  window.postMessage({ type: "update", payload, epoch: 0 }, "*");
}

export const QuoteNotClosed: Story = {
  name: "閉じていないクォートのエラー表示",
  play: async ({ canvasElement }) => {
    postCsv('a,b\n"x,1\n');
    const canvas = within(canvasElement);

    const alert = await canvas.findByRole("alert");
    await expect(alert.textContent).toContain("2行目");
    await expect(
      canvas.getByRole("button", { name: "テキストエディタで開き直す" })
    ).toBeInTheDocument();
    await expect(canvasElement.querySelector("table")).toBeNull();
  },
};

export const InconsistentColumns: Story = {
  name: "列数不揃いは空セルで補って表示",
  play: async ({ canvasElement }) => {
    postCsv("a,b,c\n1,2\n");

    await waitFor(async () => {
      await expect(canvasElement.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });
    await expect(within(canvasElement).queryByRole("alert")).toBeNull();
  },
};
