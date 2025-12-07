import{j as s}from"./iframe-Bd5iukMj.js";import{A as m,s as i}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:t}=__STORYBOOK_MODULE_TEST__,g={title:"App/Basic",component:m,parameters:{layout:"fullscreen",docs:{description:{component:"EditableTableを使用したVSCode CSV Editor の基本表示機能"}}},decorators:[e=>s.jsx("div",{style:{height:"100vh",width:"100vw"},children:s.jsx(e,{})})]},n={name:"基本表示",play:async({canvasElement:e})=>{i(),await new Promise(c=>setTimeout(c,1e3));const a=e.querySelectorAll("table");await t(a.length).toBeGreaterThan(0);const r=e.querySelectorAll("th");await t(r.length).toBeGreaterThan(0);const l=e.querySelectorAll("tbody tr");await t(l.length).toBeGreaterThan(0)}},o={name:"データあり表示",play:async({canvasElement:e})=>{i(),await new Promise(r=>setTimeout(r,1e3));const a=e.textContent;await t(a).toContain("Alice"),await t(a).toContain("Bob"),await t(a).toContain("Charlie")}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "基本表示",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // テーブルが存在することを確認
    const tables = canvasElement.querySelectorAll("table");
    await expect(tables.length).toBeGreaterThan(0);

    // ヘッダーが表示されることを確認
    const headers = canvasElement.querySelectorAll("th");
    await expect(headers.length).toBeGreaterThan(0);

    // データ行が表示されることを確認
    const rows = canvasElement.querySelectorAll("tbody tr");
    await expect(rows.length).toBeGreaterThan(0);
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "データあり表示",
  play: async ({
    canvasElement
  }) => {
    setInitData();

    // テーブルが表示されるまで待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Name列のデータを確認
    const nameCell = canvasElement.textContent;
    await expect(nameCell).toContain("Alice");
    await expect(nameCell).toContain("Bob");
    await expect(nameCell).toContain("Charlie");
  }
}`,...o.parameters?.docs?.source}}};const D=["Default","WithData"];export{n as Default,o as WithData,D as __namedExportsOrder,g as default};
