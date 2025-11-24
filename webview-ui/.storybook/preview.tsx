import type { Preview } from "@storybook/react-vite";
import "../src/styles/index.css";
import "@vscode/codicons/dist/codicon.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    tags: ["autodocs"],
  },
  decorators: [
    (Story) => (
      <div>
        <link
          rel="stylesheet"
          href="../node_modules/@vscode/codicons/dist/codicon.css"
          id="vscode-codicon-stylesheet"></link>
        <Story />
      </div>
    ),
  ],
};

export default preview;
