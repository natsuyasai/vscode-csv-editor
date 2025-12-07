import{j as v}from"./iframe-Bd5iukMj.js";import{A as x,s as l,w as s}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:c,userEvent:i,within:r}=__STORYBOOK_MODULE_TEST__,q={title:"App/CellEditing",component:x,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のセル編集機能"}}},decorators:[e=>v.jsx("div",{style:{height:"100vh",width:"100vw"},children:v.jsx(e,{})})]},p={name:"セル編集機能",play:async({canvasElement:e})=>{const a=r(e);l(),await s(e);const n=await a.findByRole("button",{name:"Alice"});await i.dblClick(n);const t=a.queryByDisplayValue("Alice");await c(t).toBeInTheDocument(),await c(t?.type).toBe("textarea")}},u={name:"セル編集機能_Backspace（内容クリア→編集モード）",play:async({canvasElement:e})=>{const a=r(e);l(),await s(e);const n=await a.findByRole("button",{name:"Alice"});await i.click(n),await i.keyboard("{Backspace}");const t=a.queryByRole("textbox");await c(t).toBeInTheDocument(),await c(t?.type).toBe("textarea"),await c(t).toHaveValue("")}},m={name:"セル編集機能_Delete（内容クリア→編集モード移行なし）",play:async({canvasElement:e})=>{const a=r(e);l(),await s(e);const n=await a.findByRole("button",{name:"Alice"});await i.click(n),await i.keyboard("{Delete}");const t=a.queryByRole("textbox");if(t&&t.tagName==="INPUT")throw new Error("編集モードに移行してはいけません");const o=a.getByRole("button",{name:""});await c(o).toBeInTheDocument()}};async function B(e,a){const n=r(e);l(),await s(e);const t=await n.findByRole("button",{name:"Alice"});await i.click(t),await i.keyboard(a);const o=n.queryByRole("textbox");await c(o).toBeInTheDocument(),await c(o?.type).toBe("textarea"),await c(o).toHaveValue(a)}const y={name:"セル編集機能_文字入力（内容クリア→編集モード）",play:async({canvasElement:e})=>{await B(e,"X")}},w={name:"セル編集機能_英数字入力",play:async({canvasElement:e})=>{await B(e,"a")}},d={name:"セル編集機能_特殊キー入力",play:async({canvasElement:e})=>{const a=r(e);l(),await s(e);const n=await a.findByRole("button",{name:"Alice"});await i.click(n),await i.keyboard("{F1}");let t=a.queryByRole("textbox");await c(t).not.toBeInTheDocument(),await i.click(n),await i.keyboard("{Escape}"),t=a.queryByRole("textbox"),await c(t).not.toBeInTheDocument()}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // セルをダブルクリックして編集モードに入る
    const aliceCell = await canvas.findByRole("button", {
      name: "Alice"
    });
    await userEvent.dblClick(aliceCell);

    // 編集可能な入力フィールドが表示されることを確認
    // 編集中にtextarea要素が作成される
    const input = canvas.queryByDisplayValue("Alice") as HTMLTextAreaElement;
    await expect(input).toBeInTheDocument();
    await expect(input?.type).toBe("textarea");
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能_Backspace（内容クリア→編集モード）",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("button", {
      name: "Alice"
    });
    await userEvent.click(aliceCell);

    // セルが選択された状態でBackspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // 編集モードに入り、入力フィールドが表示される（内容はクリアされている）
    // 編集中にtextarea要素が作成される
    const input = canvas.queryByRole("textbox") as HTMLTextAreaElement;
    await expect(input).toBeInTheDocument();
    await expect(input?.type).toBe("textarea");
    // 内容がクリアされていることを確認
    await expect(input).toHaveValue("");
  }
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能_Delete（内容クリア→編集モード移行なし）",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("button", {
      name: "Alice"
    });
    await userEvent.click(aliceCell);

    // セルが選択された状態でDeleteキーを押す
    await userEvent.keyboard("{Delete}");

    // 内容がクリアされるが、編集モードには移行しない
    // 編集用のinput要素が作成されていないことを確認
    const input = canvas.queryByRole("textbox");
    if (input && input.tagName === "INPUT") {
      // 編集モードに入った場合はテスト失敗
      throw new Error("編集モードに移行してはいけません");
    }

    // セルの内容が空になっていることを確認
    const updatedCell = canvas.getByRole("button", {
      name: ""
    });
    await expect(updatedCell).toBeInTheDocument();
  }
}`,...m.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能_文字入力（内容クリア→編集モード）",
  play: async ({
    canvasElement
  }) => {
    await insertTextTest(canvasElement, "X");
  }
}`,...y.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能_英数字入力",
  play: async ({
    canvasElement
  }) => {
    // 英小文字のみテスト（他の文字はこれで代表される）
    await insertTextTest(canvasElement, "a");
  }
}`,...w.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "セル編集機能_特殊キー入力",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // セルをクリックして選択状態にする
    const aliceCell = await canvas.findByRole("button", {
      name: "Alice"
    });
    await userEvent.click(aliceCell);

    // 以下のキーは編集モードに入らない（特殊動作をする）

    // F1キー（何も起こらない）
    await userEvent.keyboard("{F1}");
    let input = canvas.queryByRole("textbox");
    await expect(input).not.toBeInTheDocument();

    // Arrow keys（セル移動）のテストを簡略化
    // セルを再度クリックして選択状態にする
    await userEvent.click(aliceCell);

    // 特殊キーの一部のみテスト
    await userEvent.keyboard("{Escape}");
    input = canvas.queryByRole("textbox");
    await expect(input).not.toBeInTheDocument();
  }
}`,...d.parameters?.docs?.source}}};const V=["CellEditingFunctionality","CellEditingFunctionality_Backspace","CellEditingFunctionality_Delete","CellEditingFunctionality_CharacterInput","CellEditingFunctionality_AlphanumericInput","CellEditingFunctionality_SpecialKeyInput"];export{p as CellEditingFunctionality,w as CellEditingFunctionality_AlphanumericInput,u as CellEditingFunctionality_Backspace,y as CellEditingFunctionality_CharacterInput,m as CellEditingFunctionality_Delete,d as CellEditingFunctionality_SpecialKeyInput,V as __namedExportsOrder,q as default};
