import{j as u}from"./iframe-Bd5iukMj.js";import{A as p,s as m}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:n}=__STORYBOOK_MODULE_TEST__,_={title:"App/DragAndDrop",component:p,parameters:{layout:"fullscreen",docs:{description:{component:"EditableTableのドラッグ&ドロップとコンテキストメニュー機能のテスト"}}},decorators:[e=>u.jsx("div",{style:{height:"100vh",width:"100vw"},children:u.jsx(e,{})})]},s={name:"ドラッグ可能要素の確認",play:async({canvasElement:e})=>{m(),await new Promise(c=>setTimeout(c,1e3));const r=e.querySelector("tbody");await n(r).toBeTruthy();const o=e.querySelectorAll("th");await n(o.length).toBeGreaterThan(0)}},a={name:"行/列の追加削除ボタン",play:async({canvasElement:e})=>{m(),await new Promise(t=>setTimeout(t,1e3));const r=e.querySelectorAll("vscode-button"),o=Array.from(r).map(t=>t.textContent?.trim()),c=o.some(t=>t?.includes("行を追加")),i=o.some(t=>t?.includes("行を削除")),l=o.some(t=>t?.includes("列を追加")),d=o.some(t=>t?.includes("列を削除"));await n(c).toBeTruthy(),await n(i).toBeTruthy(),await n(l).toBeTruthy(),await n(d).toBeTruthy()}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "ドラッグ可能要素の確認",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 行番号セル（ドラッグ可能）が存在することを確認
    const tbody = canvasElement.querySelector("tbody");
    await expect(tbody).toBeTruthy();

    // 列ヘッダー（ドラッグ可能）が存在することを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);
  }
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "行/列の追加削除ボタン",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 行と列の追加/削除ボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");
    const buttonTexts = Array.from(vscodeButtons).map(btn => btn.textContent?.trim());
    const hasRowAddButton = buttonTexts.some(text => text?.includes("行を追加"));
    const hasRowDeleteButton = buttonTexts.some(text => text?.includes("行を削除"));
    const hasColumnAddButton = buttonTexts.some(text => text?.includes("列を追加"));
    const hasColumnDeleteButton = buttonTexts.some(text => text?.includes("列を削除"));
    await expect(hasRowAddButton).toBeTruthy();
    await expect(hasRowDeleteButton).toBeTruthy();
    await expect(hasColumnAddButton).toBeTruthy();
    await expect(hasColumnDeleteButton).toBeTruthy();
  }
}`,...a.parameters?.docs?.source}}};const f=["DraggableElements","RowColumnButtons"];export{s as DraggableElements,a as RowColumnButtons,f as __namedExportsOrder,_ as default};
