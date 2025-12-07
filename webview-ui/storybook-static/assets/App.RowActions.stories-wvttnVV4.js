import{j as C}from"./iframe-Bd5iukMj.js";import{A as h,s as y,w as R,R as p}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:s,userEvent:d,within:o,waitFor:u}=__STORYBOOK_MODULE_TEST__,N={title:"App/RowActions",component:h,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor の行操作機能"}}},decorators:[t=>C.jsx("div",{style:{height:"100vh",width:"100vw"},children:C.jsx(t,{})})]};async function v(t,e){const a=o(t).queryAllByRole("row");if(a.length===0)throw new Error("No rows found");const c=a.find(l=>o(l).queryAllByRole("gridcell").length>0);if(!c)throw new Error("No data row found");const r=o(c).getAllByRole("gridcell")[0],g=r.querySelector('[role="button"]');if(!g)throw new Error("Row number button not found");await d.click(g),await d.pointer({keys:"[MouseRight]",target:r}),await u(async()=>{const l=document.body.querySelector("vscode-context-menu");return await s(l).toBeInTheDocument(),!0},{timeout:2e3});const A=document.body.querySelector("vscode-context-menu")?.shadowRoot?.querySelector(`vscode-context-menu-item[value="${e}"]`);if(A){const l=A.shadowRoot?.querySelector("a");if(l)await d.click(l);else throw new Error(`Link not found in menu item "${e}"`)}else throw new Error(`Menu item with value "${e}" not found`)}const i={name:"選択行の前に追加",play:async({canvasElement:t})=>{y(),await R(t),await v(t,"insertRowAbove");const e=o(document.body);await u(async()=>{const n=e.getAllByRole("row");await s(n).toHaveLength(1+p+1);const a=n[1],r=o(a).getAllByRole("gridcell")[1];return await s(r).toHaveTextContent(""),!0},{timeout:2e3})}},w={name:"選択行の後ろに追加",play:async({canvasElement:t})=>{y(),await R(t),await v(t,"insertRowBelow");const e=o(document.body);await u(async()=>{const n=e.getAllByRole("row");await s(n).toHaveLength(1+p+1);const a=n[2],r=o(a).getAllByRole("gridcell")[1];return await s(r).toHaveTextContent(""),!0},{timeout:2e3})}},m={name:"選択行を削除",play:async({canvasElement:t})=>{y(),await R(t),await v(t,"deleteRow");const e=o(document.body);await u(async()=>{const n=e.getAllByRole("row");await s(n).toHaveLength(1+p-1);const a=n[1],r=o(a).getAllByRole("gridcell")[1];return await s(r).toHaveTextContent("Bob"),!0},{timeout:2e3})}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "選択行の前に追加",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerRowContextMenu(canvasElement, "insertRowAbove");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      const rows = newCanvas.getAllByRole("row");
      await expect(rows).toHaveLength(1 + ROW_MAX + 1); // ヘッダー行 + 元の行数 + 新しい行

      // 新しい行が追加されていることを確認（空の行が追加される）
      const newRow = rows[1]; // 最初のデータ行
      const cells = within(newRow).getAllByRole("gridcell");
      // 新しい行の最初のデータセル（行番号以外）が空であることを確認
      const firstDataCell = cells[1];
      await expect(firstDataCell).toHaveTextContent("");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...i.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "選択行の後ろに追加",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerRowContextMenu(canvasElement, "insertRowBelow");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      const rows = newCanvas.getAllByRole("row");
      await expect(rows).toHaveLength(1 + ROW_MAX + 1); // ヘッダー行 + 元の行数 + 新しい行

      // 新しい行が選択行の後ろに追加されていることを確認
      const newRow = rows[2]; // 2番目のデータ行（選択行の後ろ）
      const cells = within(newRow).getAllByRole("gridcell");
      // 新しい行の最初のデータセル（行番号以外）が空であることを確認
      const firstDataCell = cells[1];
      await expect(firstDataCell).toHaveTextContent("");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...w.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "選択行を削除",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerRowContextMenu(canvasElement, "deleteRow");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      const rows = newCanvas.getAllByRole("row");
      await expect(rows).toHaveLength(1 + ROW_MAX - 1); // ヘッダー行 + 元の行数 - 削除した行

      // 最初の行（Alice）が削除されて、2番目の行（Bob）が最初に来ていることを確認
      const firstDataRow = rows[1];
      const cells = within(firstDataRow).getAllByRole("gridcell");
      const nameCell = cells[1]; // 行番号の次のセル（Name列）
      await expect(nameCell).toHaveTextContent("Bob");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...m.parameters?.docs?.source}}};const j=["AddRowAbove","AddRowBelow","DeleteRow"];export{i as AddRowAbove,w as AddRowBelow,m as DeleteRow,j as __namedExportsOrder,N as default};
