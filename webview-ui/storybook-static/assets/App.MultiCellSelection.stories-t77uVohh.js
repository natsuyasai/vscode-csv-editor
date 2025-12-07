import{j as u}from"./iframe-Bd5iukMj.js";import{A as l,s as m}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:i}=__STORYBOOK_MODULE_TEST__,f={title:"App/MultiCellSelection",component:l,parameters:{layout:"fullscreen",docs:{description:{component:"EditableTableの複数セル選択機能のテスト"}}},decorators:[o=>u.jsx("div",{style:{height:"100vh",width:"100vw"},children:u.jsx(o,{})})]},n={name:"複数セル選択",play:async({canvasElement:o})=>{m(),await new Promise(t=>setTimeout(t,1e3));const a=o.querySelectorAll("vscode-button"),c=Array.from(a).map(t=>t.textContent?.trim()).some(t=>t?.includes("一括編集"));await i(c).toBeTruthy()}},s={name:"コピー&ペーストボタン",play:async({canvasElement:o})=>{m(),await new Promise(e=>setTimeout(e,1e3));const a=o.querySelectorAll("vscode-button"),r=Array.from(a).map(e=>e.textContent?.trim()),c=r.some(e=>e?.includes("コピー")),t=r.some(e=>e?.includes("ペースト"));await i(c).toBeTruthy(),await i(t).toBeTruthy()}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "複数セル選択",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 複数セル選択のボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map(btn => btn.textContent?.trim());
    const hasBulkEditButton = buttonTexts.some(text => text?.includes("一括編集"));
    await expect(hasBulkEditButton).toBeTruthy();
  }
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "コピー&ペーストボタン",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // コピーとペーストのボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map(btn => btn.textContent?.trim());
    const hasCopyButton = buttonTexts.some(text => text?.includes("コピー"));
    const hasPasteButton = buttonTexts.some(text => text?.includes("ペースト"));
    await expect(hasCopyButton).toBeTruthy();
    await expect(hasPasteButton).toBeTruthy();
  }
}`,...s.parameters?.docs?.source}}};const _=["MultipleSelection","CopyPasteButtons"];export{s as CopyPasteButtons,n as MultipleSelection,_ as __namedExportsOrder,f as default};
