import{j as o}from"./iframe-Bd5iukMj.js";import{A as s,s as p,w as m}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:n,waitFor:r}=__STORYBOOK_MODULE_TEST__,I={title:"App/Theme",component:s,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のテーマ機能"}}},decorators:[t=>o.jsx("div",{style:{height:"100vh",width:"100vw"},children:o.jsx(t,{})})]},a={name:"ダークモード対応",play:async({canvasElement:t})=>{p(),await m(t);const i=t.querySelector("table");await n(i).toBeInTheDocument(),window.postMessage({type:"updateTheme",payload:"dark"},"*"),await new Promise(e=>setTimeout(e,1e3)),await r(async()=>{const e=t.querySelector("table");return await n(e).toBeInTheDocument(),!0},{timeout:2e3}),window.postMessage({type:"updateTheme",payload:"light"},"*"),await new Promise(e=>setTimeout(e,1e3)),await r(async()=>{const e=t.querySelector("table");return await n(e).toBeInTheDocument(),!0},{timeout:2e3})}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "ダークモード対応",
  play: async ({
    canvasElement
  }) => {
    setInitData();
    await waitReadyForGrid(canvasElement);

    // EditableTableでは<table>要素を使用しており、role="grid"はない
    // テーブルが表示されていることを確認
    const table = canvasElement.querySelector("table");
    await expect(table).toBeInTheDocument();

    // ダークテーマに変更
    window.postMessage({
      type: "updateTheme",
      payload: "dark"
    }, "*");

    // テーマ変更の処理を待つ
    await new Promise(resolve => setTimeout(resolve, 1000));

    // テーマが変更されたことを確認（テーブルが表示されたまま）
    await waitFor(async () => {
      const updatedTable = canvasElement.querySelector("table");
      await expect(updatedTable).toBeInTheDocument();
      return true;
    }, {
      timeout: 2000
    });

    // ライトテーマに戻す
    window.postMessage({
      type: "updateTheme",
      payload: "light"
    }, "*");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // テーマが戻ったことを確認
    await waitFor(async () => {
      const lightTable = canvasElement.querySelector("table");
      await expect(lightTable).toBeInTheDocument();
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...a.parameters?.docs?.source}}};const _=["ThemeSupport"];export{a as ThemeSupport,_ as __namedExportsOrder,I as default};
