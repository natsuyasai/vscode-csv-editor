import{j as a,r as x}from"./iframe-Bd5iukMj.js";import{F as m}from"./FilterInput-CXxU6eT1.js";import"./preload-helper-PPVm8Dsz.js";const{expect:p,userEvent:l,within:v}=__STORYBOOK_MODULE_TEST__,I={title:"components/table-header/FilterInput",component:m,parameters:{layout:"centered",docs:{description:{component:"列のフィルタリングを行うための入力フィールド。ユーザーが入力したテキストに基づいて列の値をフィルタリングします。"}}},tags:["autodocs"]},u=()=>{const[t,n]=x.useState(""),e={getFilterValue:()=>t,setFilterValue:d=>n(d)};return a.jsxs("div",{style:{width:"200px"},children:[a.jsx(m,{column:e}),a.jsxs("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666"},children:["Current filter: ",t||"(empty)"]})]})},r={render:()=>a.jsx(u,{})},y=()=>{const[t,n]=x.useState("initial value"),e={getFilterValue:()=>t,setFilterValue:d=>n(d)};return a.jsxs("div",{style:{width:"200px"},children:[a.jsx(m,{column:e}),a.jsxs("div",{style:{marginTop:"16px",fontSize:"12px",color:"#666"},children:["Current filter: ",t]})]})},s={render:()=>a.jsx(y,{})},o={render:()=>a.jsx(u,{}),play:async({canvasElement:t})=>{const e=v(t).getByPlaceholderText("フィルター...");await p(e).toBeInTheDocument(),await l.type(e,"test"),await p(e).toHaveValue("test")}},c={render:()=>a.jsx(u,{}),play:async({canvasElement:t})=>{const e=v(t).getByPlaceholderText("フィルター...");await l.type(e,"test value"),await p(e).toHaveValue("test value"),await l.clear(e),await p(e).toHaveValue("")}},i={render:()=>a.jsx(u,{}),play:async({canvasElement:t})=>{const e=v(t).getByPlaceholderText("フィルター...");await l.type(e,"テスト"),await p(e).toHaveValue("テスト")}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <FilterInputWrapper />
}`,...r.parameters?.docs?.source},description:{story:"デフォルトのフィルター入力フィールド",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <FilterInputWithValueWrapper />
}`,...s.parameters?.docs?.source},description:{story:"フィルター値が初期値として設定されている場合",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <FilterInputWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);

    // 入力フィールドを取得
    const input = canvas.getByPlaceholderText("フィルター...");
    await expect(input).toBeInTheDocument();

    // テキストを入力
    await userEvent.type(input, "test");

    // 入力値が反映されていることを確認
    await expect(input).toHaveValue("test");
  }
}`,...o.parameters?.docs?.source},description:{story:"テキスト入力のインタラクションテスト",...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <FilterInputWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText("フィルター...");

    // テキストを入力
    await userEvent.type(input, "test value");
    await expect(input).toHaveValue("test value");

    // クリア
    await userEvent.clear(input);
    await expect(input).toHaveValue("");
  }
}`,...c.parameters?.docs?.source},description:{story:"クリアのインタラクションテスト",...c.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <FilterInputWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText("フィルター...");

    // 日本語を入力
    await userEvent.type(input, "テスト");
    await expect(input).toHaveValue("テスト");
  }
}`,...i.parameters?.docs?.source},description:{story:"日本語入力のテスト",...i.parameters?.docs?.description}}};const g=["Default","WithInitialValue","TextInput","ClearInput","JapaneseInput"];export{c as ClearInput,r as Default,i as JapaneseInput,o as TextInput,s as WithInitialValue,g as __namedExportsOrder,I as default};
