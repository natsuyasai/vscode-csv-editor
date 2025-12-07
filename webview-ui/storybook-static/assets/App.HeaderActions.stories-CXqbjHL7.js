import{j as C}from"./iframe-Bd5iukMj.js";import{A as H,s as w,w as l,C as p}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:n,userEvent:u,within:d,waitFor:m}=__STORYBOOK_MODULE_TEST__,O={title:"App/HeaderActions",component:H,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のヘッダー操作機能"}}},decorators:[e=>C.jsx("div",{style:{height:"100vh",width:"100vw"},children:C.jsx(e,{})})]};async function h(e,t){const a=await d(e).findByRole("columnheader",{name:/Age/});await u.click(a),await u.pointer({keys:"[MouseRight]",target:a}),await m(async()=>{const r=document.body.querySelector("vscode-context-menu");return await n(r).toBeInTheDocument(),!0},{timeout:2e3});const y=document.body.querySelector("vscode-context-menu")?.shadowRoot?.querySelector(`vscode-context-menu-item[value="${t}"]`);if(y){const r=y.shadowRoot?.querySelector("a");if(r)await u.click(r);else throw new Error(`Link not found in menu item "${t}"`)}else throw new Error(`Menu item with value "${t}" not found`)}const i={name:"ヘッダーを左側に追加",play:async({canvasElement:e})=>{w(),await l(e),await h(e,"insertHeaderCelLeft");const t=d(document.body);await m(async()=>{const o=t.getByRole("columnheader",{name:/new column/});await n(o).toBeInTheDocument();const a=t.getAllByRole("columnheader");return await n(a).toHaveLength(p+1),await n(a[2].textContent).toContain("new column"),!0},{timeout:2e3})}},s={name:"ヘッダーを右側に追加",play:async({canvasElement:e})=>{w(),await l(e),await h(e,"insertHeaderCelRight");const t=d(document.body);await m(async()=>{const o=t.getByRole("columnheader",{name:/new column/});await n(o).toBeInTheDocument();const a=t.getAllByRole("columnheader");return await n(a).toHaveLength(p+1),await n(a[3].textContent).toContain("new column"),!0},{timeout:2e3})}},c={name:"ヘッダーを削除",play:async({canvasElement:e})=>{w(),await l(e),await h(e,"deleteHeaderCel");const t=d(document.body);await m(async()=>{const o=t.getAllByRole("columnheader");return await n(o).toHaveLength(p-1),await n(o[2].textContent).toContain("City"),!0},{timeout:2e3})}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーを左側に追加",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerHeaderContextMenu(canvasElement, "insertHeaderCelLeft");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      // 左側に新しいヘッダーが追加されていることを確認
      const newHeader = newCanvas.getByRole("columnheader", {
        name: /new column/
      });
      await expect(newHeader).toBeInTheDocument();
      const headers = newCanvas.getAllByRole("columnheader");
      await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認

      await expect(headers[2].textContent).toContain("new column"); // 新しいヘッダーの内容を確認
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーを右側に追加",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerHeaderContextMenu(canvasElement, "insertHeaderCelRight");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      // 右側に新しいヘッダーが追加されていることを確認
      const newHeader = newCanvas.getByRole("columnheader", {
        name: /new column/
      });
      await expect(newHeader).toBeInTheDocument();
      const headers = newCanvas.getAllByRole("columnheader");
      await expect(headers).toHaveLength(COL_MAX_WITH_HEADER + 1); // 新しいヘッダーが追加されていることを確認
      await expect(headers[3].textContent).toContain("new column"); // 新しいヘッダーの内容を確認
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...s.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーを削除",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);
    await triggerHeaderContextMenu(canvasElement, "deleteHeaderCel");
    const newCanvas = within(document.body);
    await waitFor(async () => {
      const headers = newCanvas.getAllByRole("columnheader");
      await expect(headers).toHaveLength(COL_MAX_WITH_HEADER - 1);
      await expect(headers[2].textContent).toContain("City");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...c.parameters?.docs?.source}}};const b=["AddHeaderForLeft","AddHeaderForRight","DeleteHeader"];export{i as AddHeaderForLeft,s as AddHeaderForRight,c as DeleteHeader,b as __namedExportsOrder,O as default};
