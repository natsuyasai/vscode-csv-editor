import{j as n,r as c}from"./iframe-Bd5iukMj.js";import{D as I,H as T}from"./index-C4LYco7Y.js";import{D as l}from"./DraggableHeaderCell-CyeAS6hi.js";import"./preload-helper-PPVm8Dsz.js";const{expect:a,userEvent:s,within:u}=__STORYBOOK_MODULE_TEST__,W={title:"components/header/DraggableHeaderCell",component:l,decorators:[o=>n.jsx(I,{backend:T,children:n.jsx("div",{style:{padding:"20px"},children:n.jsx(o,{})})})],parameters:{layout:"centered"},tags:["autodocs"]},d={args:{columnIndex:0,children:"Column Header",onColumnReorder:()=>console.log("Column reordered"),isSelected:!1}},i={args:{columnIndex:0,children:"Selected Header",onColumnReorder:()=>console.log("Column reordered"),isSelected:!0}},b=()=>{const[o,e]=c.useState(["Column A","Column B","Column C"]),[t,r]=c.useState(null),w=(m,p)=>{const y=[...o],[R]=y.splice(m,1);y.splice(p,0,R),e(y)};return n.jsx("div",{style:{display:"flex",gap:"8px"},children:o.map((m,p)=>n.jsx(l,{columnIndex:p,onColumnReorder:w,onColumnSelect:r,isSelected:t===p,children:m},m))})},g={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(b,{})},k=()=>{const[o,e]=c.useState(null);return n.jsx(l,{columnIndex:0,onColumnReorder:()=>console.log("Reordered"),onColumnSelect:e,isSelected:o===0,children:"Click to select"})},C={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(k,{}),play:async({canvasElement:o})=>{const t=u(o).getByRole("button");await s.click(t),await s.click(t),await a(t).toBeInTheDocument()}},B=()=>{const[o,e]=c.useState(!1);return n.jsxs("div",{children:[n.jsx(l,{columnIndex:0,onColumnReorder:()=>console.log("Reordered"),onSort:()=>e(!0),isSelected:!0,children:"Click to sort (500ms delay)"}),o&&n.jsx("div",{"data-testid":"sort-indicator",children:"Sorted!"})]})},x={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(B,{}),play:async({canvasElement:o})=>{const e=u(o),t=e.getByRole("button");await s.click(t),await s.click(t),await new Promise(r=>setTimeout(r,600)),await a(e.getByTestId("sort-indicator")).toBeInTheDocument()}},f=()=>{const[o,e]=c.useState(!1),[t,r]=c.useState(!1);return n.jsxs("div",{children:[n.jsx(l,{columnIndex:0,onColumnReorder:()=>console.log("Reordered"),onSort:()=>r(!0),onDoubleClick:()=>e(!0),isSelected:!0,children:"Double-click to edit"}),o&&n.jsx("div",{"data-testid":"double-click-indicator",children:"Double clicked!"}),t&&n.jsx("div",{"data-testid":"sort-indicator",children:"Sorted!"})]})},S={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(f,{}),play:async({canvasElement:o})=>{const e=u(o),t=e.getByRole("button");await s.click(t),await s.dblClick(t),await a(e.getByTestId("double-click-indicator")).toBeInTheDocument(),await new Promise(r=>setTimeout(r,600)),await a(e.queryByTestId("sort-indicator")).not.toBeInTheDocument()}},E=()=>{const[o,e]=c.useState(0);return n.jsxs("div",{children:[n.jsx(l,{columnIndex:0,onColumnReorder:()=>console.log("Reordered"),onSort:()=>e(t=>t+1),isSelected:!0,children:"Press Enter or Space to sort"}),n.jsxs("div",{"data-testid":"sort-count",children:["Sort count: ",o]})]})},v={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(E,{}),play:async({canvasElement:o})=>{const e=u(o);e.getByRole("button").focus(),await s.keyboard("{Enter}"),await a(e.getByTestId("sort-count")).toHaveTextContent("Sort count: 1"),await s.keyboard(" "),await a(e.getByTestId("sort-count")).toHaveTextContent("Sort count: 2")}},j=()=>{const[o,e]=c.useState(!1);return n.jsxs("div",{children:[n.jsx(l,{columnIndex:0,onColumnReorder:()=>console.log("Reordered"),onFocusChange:e,isSelected:!1,children:"Focus and blur"}),n.jsxs("div",{"data-testid":"focus-status",children:["Focused: ",o?"Yes":"No"]})]})},h={args:{columnIndex:0,children:"Placeholder",onColumnReorder:()=>console.log("Reordered"),isSelected:!1},render:()=>n.jsx(j,{}),play:async({canvasElement:o})=>{const e=u(o),t=e.getByRole("button");await s.click(t),await a(e.getByTestId("focus-status")).toHaveTextContent("Focused: Yes"),t.blur(),await new Promise(r=>setTimeout(r,50)),await a(e.getByTestId("focus-status")).toHaveTextContent("Focused: No")}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Column Header",
    onColumnReorder: () => console.log("Column reordered"),
    isSelected: false
  }
}`,...d.parameters?.docs?.source},description:{story:"デフォルトの状態",...d.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Selected Header",
    onColumnReorder: () => console.log("Column reordered"),
    isSelected: true
  }
}`,...i.parameters?.docs?.source},description:{story:"選択状態",...i.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <MultipleHeadersWrapper />
}`,...g.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <ColumnSelectionWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // 選択する
    await userEvent.click(cell);

    // 選択状態になることを確認（視覚的にoutlineが表示される）
    await expect(cell).toBeInTheDocument();
  }
}`,...C.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <SortOnClickWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // クリック
    await userEvent.click(cell);

    // 500ms待機
    await new Promise(resolve => setTimeout(resolve, 600));

    // ソートが呼ばれることを確認
    await expect(canvas.getByTestId("sort-indicator")).toBeInTheDocument();
  }
}`,...x.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <DoubleClickToEditWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);

    // ダブルクリック
    await userEvent.dblClick(cell);

    // onDoubleClickが呼ばれることを確認
    await expect(canvas.getByTestId("double-click-indicator")).toBeInTheDocument();

    // 500ms待ってもソートは実行されない
    await new Promise(resolve => setTimeout(resolve, 600));
    await expect(canvas.queryByTestId("sort-indicator")).not.toBeInTheDocument();
  }
}`,...S.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <KeyboardSortWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    cell.focus();

    // Enterキーでソート
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("sort-count")).toHaveTextContent("Sort count: 1");

    // Spaceキーでソート
    await userEvent.keyboard(" ");
    await expect(canvas.getByTestId("sort-count")).toHaveTextContent("Sort count: 2");
  }
}`,...v.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    columnIndex: 0,
    children: "Placeholder",
    onColumnReorder: () => console.log("Reordered"),
    isSelected: false
  },
  render: () => <FocusChangeWrapper />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // フォーカスを当てる
    await userEvent.click(cell);
    await expect(canvas.getByTestId("focus-status")).toHaveTextContent("Focused: Yes");

    // フォーカスを外す
    cell.blur();
    // blurイベントの処理を待つ
    await new Promise(resolve => setTimeout(resolve, 50));
    await expect(canvas.getByTestId("focus-status")).toHaveTextContent("Focused: No");
  }
}`,...h.parameters?.docs?.source}}};const O=["Default","Selected","MultipleHeaders","ColumnSelection","SortOnClick","DoubleClickToEdit","KeyboardSort","FocusChange"];export{C as ColumnSelection,d as Default,S as DoubleClickToEdit,h as FocusChange,v as KeyboardSort,g as MultipleHeaders,i as Selected,x as SortOnClick,O as __namedExportsOrder,W as default};
