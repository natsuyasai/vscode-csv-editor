import{j as m}from"./iframe-Bd5iukMj.js";import{A as C,C as d,s as v,w as R}from"./utils-Bt2FCyF2.js";import{DeleteHeader as x}from"./App.HeaderActions.stories-CXqbjHL7.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:w,userEvent:u}=__STORYBOOK_MODULE_TEST__;async function _(t,n){const e=t.getByLabelText("Row size"),o=e.shadowRoot?.querySelector("div[class*='select-face']");await w(o).toBeVisible(),await u.click(o);const s=e.shadowRoot?.querySelector("div[class*='dropdown']");await w(s).toBeVisible();const g=[...s.querySelector("ul[class*='options']")?.querySelectorAll("li")??[]].filter(h=>(h.textContent?.indexOf(n)??-1)>=0)[0];await u.click(g)}const{expect:a,userEvent:p,within:y,waitFor:l}=__STORYBOOK_MODULE_TEST__,M={title:"App/Utilities",component:C,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のその他機能"}}},decorators:[t=>m.jsx("div",{style:{height:"100vh",width:"100vw"},children:m.jsx(t,{})})]},i={name:"元に戻す・やり直し",play:async({context:t})=>{await x.play(t),await new Promise(e=>setTimeout(e,200)),await p.keyboard("{Control>}z{/Control}");const n=y(document.body);await l(async()=>{const e=n.getAllByRole("columnheader");return await a(e).toHaveLength(d),await a(e[2].textContent).toContain("Age"),!0},{timeout:2e3}),await new Promise(e=>setTimeout(e,200)),await p.keyboard("{Control>}y{/Control}"),await l(async()=>{const e=n.getAllByRole("columnheader");return await a(e).toHaveLength(d-1),await a(e[2].textContent).toContain("City"),!0},{timeout:2e3})}},r={name:"行サイズ調整機能",play:async({canvasElement:t})=>{const n=y(t);v(),await R(t);const o=n.getByRole("gridcell",{name:"Alice"}).getBoundingClientRect().height;await _(n,"large"),await l(async()=>{const c=n.getByRole("gridcell",{name:"Alice"}).getBoundingClientRect().height;return await a(c).toBeGreaterThan(o),!0},{timeout:3e3})}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "元に戻す・やり直し",
  play: async ({
    context
  }) => {
    await DeleteHeader.play!(context);

    // 少し待機してから元に戻す
    await new Promise(resolve => setTimeout(resolve, 200));

    // Ctrl+Z で元に戻す
    await userEvent.keyboard("{Control>}z{/Control}");

    // 削除した列が戻っていること
    const newCanvas = within(document.body);
    await waitFor(async () => {
      const headers = newCanvas.getAllByRole("columnheader");
      await expect(headers).toHaveLength(COL_MAX_WITH_HEADER);
      await expect(headers[2].textContent).toContain("Age");
      return true;
    }, {
      timeout: 2000
    });

    // 少し待機してからやり直し
    await new Promise(resolve => setTimeout(resolve, 200));

    // Ctrl+Y でやり直し
    await userEvent.keyboard("{Control>}y{/Control}");
    await waitFor(async () => {
      const headers = newCanvas.getAllByRole("columnheader");
      await expect(headers).toHaveLength(COL_MAX_WITH_HEADER - 1);
      await expect(headers[2].textContent).toContain("City");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...i.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  name: "行サイズ調整機能",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // 初期状態の高さを確認
    const initialCell = canvas.getByRole("gridcell", {
      name: "Alice"
    });
    const initialHeight = initialCell.getBoundingClientRect().height;
    await setRowSize(canvas, "large");

    // DOM更新を待機してサイズが変更されることを確認
    await waitFor(async () => {
      const cell = canvas.getByRole("gridcell", {
        name: "Alice"
      });
      const cellHeight = cell.getBoundingClientRect().height;
      // largeサイズの高さが初期サイズより大きいことを確認
      await expect(cellHeight).toBeGreaterThan(initialHeight);
      return true;
    }, {
      timeout: 3000
    });
  }
}`,...r.parameters?.docs?.source}}};const U=["UndoRedo","RowSizeAdjustment"];export{r as RowSizeAdjustment,i as UndoRedo,U as __namedExportsOrder,M as default};
