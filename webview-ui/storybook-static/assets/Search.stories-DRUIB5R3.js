import{j as c}from"./iframe-Bd5iukMj.js";import{S as s}from"./Search-W93azvAP.js";import"./preload-helper-PPVm8Dsz.js";import"./VscodeTreeItem-COO8tQji.js";const{fn:e,userEvent:i,expect:d}=__STORYBOOK_MODULE_TEST__,x={title:"components/header/Search",component:s,args:{isMatching:!1,machedCount:0,searchedSelectedItemIdx:0,onSearch:e(),onNext:e(),onPrevious:e(),onClose:e()},render:function(n){return c.jsx(s,{...n})}},t={},o={args:{isMatching:!0,machedCount:3,searchedSelectedItemIdx:1},play:async({canvasElement:a})=>{const r=a.querySelector("vscode-textfield")?.shadowRoot?.querySelector("input");await d(r).toBeVisible(),await i.type(r,"test")}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    isMatching: true,
    machedCount: 3,
    searchedSelectedItemIdx: 1
  },
  play: async ({
    canvasElement
  }) => {
    const textbox = canvasElement.querySelector("vscode-textfield");
    const input = textbox?.shadowRoot?.querySelector("input");
    await expect(input).toBeVisible();
    await userEvent.type(input!, "test");
  }
}`,...o.parameters?.docs?.source}}};const h=["Default","Matching"];export{t as Default,o as Matching,h as __namedExportsOrder,x as default};
