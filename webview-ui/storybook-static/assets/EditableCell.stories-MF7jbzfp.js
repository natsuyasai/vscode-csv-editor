import{j as B}from"./iframe-Bd5iukMj.js";import{E as T}from"./EditableCell-DxQWItSe.js";import"./preload-helper-PPVm8Dsz.js";const{expect:n,userEvent:c,waitFor:r,within:i}=__STORYBOOK_MODULE_TEST__,R={title:"components/table-cell/EditableCell",component:T,parameters:{layout:"centered",docs:{description:{component:"編集可能なセルコンポーネント。ダブルクリックまたはキーボード操作で編集モードに入り、テキストを編集できます。"}}},decorators:[t=>B.jsx("div",{style:{width:"200px",height:"40px",border:"1px solid #ccc"},children:B.jsx(t,{})})],tags:["autodocs"]},s=(t="Sample Text",e)=>({getValue:(()=>t),row:{index:0},column:{id:"col0"},table:{options:{meta:{updateData:(o,a,b)=>{console.log(`Updated [${o}][${a}] = "${b}"`)},selectedCells:new Set}}},cell:{},renderValue:()=>t,...e}),l={args:s()},p={args:s("This is a very long text that will be truncated with ellipsis when displayed in the cell")},d={args:s("")},m={args:s("12345")},u={args:s("Selected Cell",{table:{options:{meta:{selectedCells:new Set(["0-0"]),updateData:()=>{}}}}})},y={args:s("Double click me"),play:async({canvasElement:t})=>{const e=i(t),o=e.getByRole("button");await n(o).toBeInTheDocument(),await c.dblClick(o),await r(async()=>{const a=e.getByRole("textbox");await n(a).toBeInTheDocument()},{timeout:2e3})}},w={args:s("Press Enter to edit"),play:async({canvasElement:t})=>{const e=i(t);e.getByRole("button").focus(),await c.keyboard("{Enter}"),await r(async()=>{const a=e.getByRole("textbox");await n(a).toBeInTheDocument()},{timeout:2e3})}},x={args:s("Press Delete to clear"),play:async({canvasElement:t})=>{const e=i(t);e.getByRole("button").focus(),await c.keyboard("{Delete}"),await r(async()=>{await n(e.queryByRole("textbox")).not.toBeInTheDocument()})}},g={args:s("Press Backspace"),play:async({canvasElement:t})=>{const e=i(t);e.getByRole("button").focus(),await c.keyboard("{Backspace}"),await r(async()=>{const a=e.getByRole("textbox");await n(a).toBeInTheDocument(),await n(a).toHaveValue("")},{timeout:2e3})}},E={args:s("Type to replace"),play:async({canvasElement:t})=>{const e=i(t);e.getByRole("button").focus(),await c.keyboard("a"),await r(async()=>{const a=e.getByRole("textbox");await n(a).toBeInTheDocument(),await n(a).toHaveValue("a")},{timeout:2e3})}},v={args:s("Edit and press Escape"),play:async({canvasElement:t})=>{const e=i(t),o=e.getByRole("button");await c.dblClick(o),await r(async()=>{const a=e.getByRole("textbox");await n(a).toBeInTheDocument(),await c.clear(a),await c.type(a,"Changed"),await c.keyboard("{Escape}")},{timeout:3e3}),await r(async()=>{await n(e.queryByRole("textbox")).not.toBeInTheDocument(),await n(e.getByText("Edit and press Escape")).toBeInTheDocument()},{timeout:2e3})}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: createMockProps()
}`,...l.parameters?.docs?.source},description:{story:"デフォルトのセル表示",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: createMockProps("This is a very long text that will be truncated with ellipsis when displayed in the cell")
}`,...p.parameters?.docs?.source},description:{story:"長いテキストのセル",...p.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: createMockProps("")
}`,...d.parameters?.docs?.source},description:{story:"空のセル",...d.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: createMockProps("12345")
}`,...m.parameters?.docs?.source},description:{story:"数値のセル",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Selected Cell", {
    table: {
      options: {
        meta: {
          selectedCells: new Set(["0-0"]),
          updateData: () => {}
        }
      }
    } as never
  })
}`,...u.parameters?.docs?.source},description:{story:"選択状態のセル",...u.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Double click me"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);

    // セルを取得
    const cell = canvas.getByRole("button");
    await expect(cell).toBeInTheDocument();

    // ダブルクリック
    await userEvent.dblClick(cell);

    // textareaが表示されることを確認
    await waitFor(async () => {
      const textarea = canvas.getByRole("textbox");
      await expect(textarea).toBeInTheDocument();
    }, {
      timeout: 2000
    });
  }
}`,...y.parameters?.docs?.source},description:{story:"ダブルクリックで編集モードに入る",...y.parameters?.docs?.description}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Press Enter to edit"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");
    cell.focus();

    // Enterキーを押す
    await userEvent.keyboard("{Enter}");

    // textareaが表示されることを確認
    await waitFor(async () => {
      const textarea = canvas.getByRole("textbox");
      await expect(textarea).toBeInTheDocument();
    }, {
      timeout: 2000
    });
  }
}`,...w.parameters?.docs?.source},description:{story:"Enterキーで編集モードに入る",...w.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Press Delete to clear"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");
    cell.focus();

    // Deleteキーを押す
    await userEvent.keyboard("{Delete}");

    // セルがクリアされることを確認（編集モードには入らない）
    await waitFor(async () => {
      await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
    });
  }
}`,...x.parameters?.docs?.source},description:{story:"Deleteキーでクリア",...x.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Press Backspace"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");
    cell.focus();

    // Backspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // textareaが表示され、空であることを確認
    await waitFor(async () => {
      const textarea = canvas.getByRole("textbox");
      await expect(textarea).toBeInTheDocument();
      await expect(textarea).toHaveValue("");
    }, {
      timeout: 2000
    });
  }
}`,...g.parameters?.docs?.source},description:{story:"Backspaceキーでクリアして編集",...g.parameters?.docs?.description}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Type to replace"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");
    cell.focus();

    // 文字を入力
    await userEvent.keyboard("a");

    // textareaが表示され、入力した文字が設定されることを確認
    await waitFor(async () => {
      const textarea = canvas.getByRole("textbox");
      await expect(textarea).toBeInTheDocument();
      await expect(textarea).toHaveValue("a");
    }, {
      timeout: 2000
    });
  }
}`,...E.parameters?.docs?.source},description:{story:"文字入力で編集開始",...E.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: createMockProps("Edit and press Escape"),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getByRole("button");

    // ダブルクリックして編集モードに入る
    await userEvent.dblClick(cell);
    await waitFor(async () => {
      const textarea = canvas.getByRole("textbox");
      await expect(textarea).toBeInTheDocument();

      // テキストを変更
      await userEvent.clear(textarea);
      await userEvent.type(textarea, "Changed");

      // Escapeキーで キャンセル
      await userEvent.keyboard("{Escape}");
    }, {
      timeout: 3000
    });

    // 元のテキストが表示されることを確認
    await waitFor(async () => {
      await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument();
      await expect(canvas.getByText("Edit and press Escape")).toBeInTheDocument();
    }, {
      timeout: 2000
    });
  }
}`,...v.parameters?.docs?.source},description:{story:"Escapeキーで編集キャンセル",...v.parameters?.docs?.description}}};const S=["Default","LongText","Empty","Numeric","Selected","DoubleClickToEdit","EnterKeyToEdit","DeleteKeyToClear","BackspaceKeyToClearAndEdit","TypeToStartEditing","EscapeToCancel"];export{g as BackspaceKeyToClearAndEdit,l as Default,x as DeleteKeyToClear,y as DoubleClickToEdit,d as Empty,w as EnterKeyToEdit,v as EscapeToCancel,p as LongText,m as Numeric,u as Selected,E as TypeToStartEditing,S as __namedExportsOrder,R as default};
