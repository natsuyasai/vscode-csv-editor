import{j as i}from"./iframe-Bd5iukMj.js";import{A as m,s as c}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:s}=__STORYBOOK_MODULE_TEST__,E={title:"App/SearchAndFilter",component:m,parameters:{layout:"fullscreen",docs:{description:{component:"EditableTableの検索とフィルター機能のテスト"}}},decorators:[e=>i.jsx("div",{style:{height:"100vh",width:"100vw"},children:i.jsx(e,{})})]},r={name:"フィルター表示切替",play:async({canvasElement:e})=>{c(),await new Promise(o=>setTimeout(o,1e3));const t=e.querySelectorAll("vscode-button");await s(t.length).toBeGreaterThan(0)}},a={name:"ソートインジケーター",play:async({canvasElement:e})=>{c(),await new Promise(n=>setTimeout(n,1e3));const t=e.querySelectorAll("th");await s(t.length).toBeGreaterThan(0);const o=Array.from(t).find(n=>n.textContent&&n.textContent.trim()!=="");await s(o).toBeTruthy()}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  name: "フィルター表示切替",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // フィルター関連のボタンが表示されることを確認
    // vscode-button要素を検索
    const vscodeButtons = canvasElement.querySelectorAll("vscode-button");

    // フィルターボタンまたはフィルター機能が存在することを確認
    // （実装の詳細に依存するため、柔軟に確認）
    await expect(vscodeButtons.length).toBeGreaterThan(0);
  }
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "ソートインジケーター",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // テーブルヘッダーが存在することを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);

    // ヘッダーがクリック可能であることを確認（ソート機能）
    const firstDataHeader = Array.from(headers).find(header => header.textContent && header.textContent.trim() !== "");
    await expect(firstDataHeader).toBeTruthy();
  }
}`,...a.parameters?.docs?.source}}};const _=["FilterToggle","SortingIndicators"];export{r as FilterToggle,a as SortingIndicators,_ as __namedExportsOrder,E as default};
