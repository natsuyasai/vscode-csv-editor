import{j as r,R as g}from"./iframe-Bd5iukMj.js";import{D as x,H as y}from"./index-C4LYco7Y.js";import{R as m}from"./RowIndexCell-FX_pJQHc.js";import"./preload-helper-PPVm8Dsz.js";const{expect:v,userEvent:p,within:u}=__STORYBOOK_MODULE_TEST__,E={title:"components/table-cell/RowIndexCell",component:m,parameters:{layout:"centered",docs:{description:{component:"行番号を表示するセル。行の選択、ドラッグ&ドロップによる行の並び替え、コンテキストメニューの表示をサポートします。"}}},decorators:[e=>r.jsx(x,{backend:y,children:r.jsx("div",{style:{width:"60px",height:"40px"},children:r.jsx(e,{})})})],tags:["autodocs"]},s=e=>({isSelected:!1,onSelect:()=>console.log("Row selected"),rowIndex:0,getValue:(()=>"1"),row:{},column:{},table:{},cell:{},renderValue:()=>"1",...e}),n={args:s()},a={args:s({isSelected:!0,getValue:(()=>"5")})},o={render:()=>r.jsx("div",{style:{display:"flex",gap:"4px"},children:[1,2,3,4,5].map(e=>r.jsx("div",{style:{width:"60px",height:"40px"},children:r.jsx(m,{...s({getValue:(()=>String(e)),rowIndex:e-1})})},e))})},c={args:s(),play:async({canvasElement:e})=>{const t=u(e).getByText("1");await v(t).toBeInTheDocument(),await p.click(t)}},i={args:s(),play:async({canvasElement:e})=>{const t=u(e).getByText("1");t.focus(),await p.keyboard("{Enter}"),t.focus(),await p.keyboard(" ")}},S=()=>{const[e,d]=g.useState(!1);return r.jsx(m,{...s({isSelected:e,onSelect:()=>d(!e)})})},l={render:()=>r.jsx(S,{})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: createMockProps()
}`,...n.parameters?.docs?.source},description:{story:"デフォルトの行番号セル",...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: createMockProps({
    isSelected: true,
    getValue: (() => "5") as never
  })
}`,...a.parameters?.docs?.source},description:{story:"選択された状態の行番号セル",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    gap: "4px"
  }}>
      {[1, 2, 3, 4, 5].map(num => <div key={num} style={{
      width: "60px",
      height: "40px"
    }}>
          <RowIndexCell {...createMockProps({
        getValue: (() => String(num)) as never,
        rowIndex: num - 1
      })} />
        </div>)}
    </div>
}`,...o.parameters?.docs?.source},description:{story:"異なる行番号",...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: createMockProps(),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);

    // 行番号セルを取得
    const cell = canvas.getByText("1");
    await expect(cell).toBeInTheDocument();

    // クリック
    await userEvent.click(cell);
  }
}`,...c.parameters?.docs?.source},description:{story:"クリックインタラクションのテスト",...c.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: createMockProps(),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByText("1");
    cell.focus();

    // Enterキー
    await userEvent.keyboard("{Enter}");

    // フォーカスを再設定
    cell.focus();

    // Spaceキー
    await userEvent.keyboard(" ");
  }
}`,...i.parameters?.docs?.source},description:{story:"キーボード操作のテスト",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <SelectionToggleWrapper />
}`,...l.parameters?.docs?.source},description:{story:"選択状態の切り替え",...l.parameters?.docs?.description}}};const T=["Default","Selected","DifferentRowNumbers","ClickInteraction","KeyboardInteraction","SelectionToggle"];export{c as ClickInteraction,n as Default,o as DifferentRowNumbers,i as KeyboardInteraction,a as Selected,l as SelectionToggle,T as __namedExportsOrder,E as default};
