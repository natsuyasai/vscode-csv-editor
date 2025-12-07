import{j as c}from"./iframe-Bd5iukMj.js";import{A as m,s as l,w as u}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:e,userEvent:i,within:w}=__STORYBOOK_MODULE_TEST__,S={title:"App/Sorting",component:m,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のソート機能"}}},decorators:[n=>c.jsx("div",{style:{height:"100vh",width:"100vw"},children:c.jsx(n,{})})]},r={name:"ソート機能",play:async({canvasElement:n})=>{const s=w(n);l(),await u(n);const a=await s.findByRole("columnheader",{name:/Name/}),t=a.querySelector('[role="button"]');if(!t)throw new Error("Draggable button not found in header");t.focus(),await i.click(t),await new Promise(o=>setTimeout(o,100)),await e(a.textContent).not.toContain("🔼"),await e(a.textContent).not.toContain("🔽"),t.focus(),await i.click(t),await new Promise(o=>setTimeout(o,600)),await e(a.textContent).toContain("🔼"),t.focus(),await i.click(t),await new Promise(o=>setTimeout(o,600)),await e(a.textContent).toContain("🔽"),t.focus(),await i.click(t),await new Promise(o=>setTimeout(o,600)),await e(a.textContent).not.toContain("🔼"),await e(a.textContent).not.toContain("🔽"),await e(s.getByRole("gridcell",{name:"Alice"})).toBeInTheDocument(),await e(s.getByRole("gridcell",{name:"Bob"})).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  name: "ソート機能",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // Nameヘッダーのドラッグ可能な要素（role="button"）を取得
    const nameHeader = await canvas.findByRole("columnheader", {
      name: /Name/
    });
    const draggableButton = nameHeader.querySelector('[role="button"]') as HTMLElement;
    if (!draggableButton) {
      throw new Error("Draggable button not found in header");
    }

    // 1回目のクリック: 未選択のセルをクリック → 選択状態になるだけでソートしない
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise(resolve => setTimeout(resolve, 100));

    // ソートインジケーターが表示されないことを確認（まだソートされていない）
    await expect(nameHeader.textContent).not.toContain("🔼");
    await expect(nameHeader.textContent).not.toContain("🔽");

    // 2回目のクリック: 既に選択されているセルをクリック → ダブルクリック判定待ち（500ms）後にソート実行
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise(resolve => setTimeout(resolve, 600)); // 500ms + 余裕

    // ソートインジケーター（🔼）が表示されることを確認
    await expect(nameHeader.textContent).toContain("🔼");

    // 3回目のクリック: 降順ソートに切り替わり
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise(resolve => setTimeout(resolve, 600));

    // ソートインジケーター（🔽）が表示されることを確認
    await expect(nameHeader.textContent).toContain("🔽");

    // 4回目のクリック: ソート解除
    draggableButton.focus();
    await userEvent.click(draggableButton);
    await new Promise(resolve => setTimeout(resolve, 600));

    // ソートインジケーターが表示されないことを確認
    await expect(nameHeader.textContent).not.toContain("🔼");
    await expect(nameHeader.textContent).not.toContain("🔽");

    // データが表示されることを確認（ソート後も表示は継続）
    await expect(canvas.getByRole("gridcell", {
      name: "Alice"
    })).toBeInTheDocument();
    await expect(canvas.getByRole("gridcell", {
      name: "Bob"
    })).toBeInTheDocument();
  }
}`,...r.parameters?.docs?.source}}};const D=["SortingFunctionality"];export{r as SortingFunctionality,D as __namedExportsOrder,S as default};
