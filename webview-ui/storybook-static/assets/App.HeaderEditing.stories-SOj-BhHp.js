import{j as v}from"./iframe-Bd5iukMj.js";import{A as T,s as c,w as s}from"./utils-Bt2FCyF2.js";import"./preload-helper-PPVm8Dsz.js";import"./EditableTable-zfY_aA70.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{expect:n,userEvent:o,within:m,waitFor:u}=__STORYBOOK_MODULE_TEST__,V={title:"App/HeaderEditing",component:T,parameters:{layout:"fullscreen",docs:{description:{component:"VSCode CSV Editor のヘッダーセル編集機能"}}},decorators:[e=>v.jsx("div",{style:{height:"100vh",width:"100vw"},children:v.jsx(e,{})})]},l={name:"ヘッダーセル編集機能",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.dblClick(i),await u(async()=>{const t=a.queryByDisplayValue("Name");return await n(t).toBeInTheDocument(),await n(t?.tagName).toBe("TEXTAREA"),!0},{timeout:1e3})}},d={name:"ヘッダーセル編集機能_Backspace（内容クリア→編集モード）",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.click(i),await o.keyboard("{Backspace}"),await u(async()=>{const t=a.queryByRole("textbox");return await n(t).toBeInTheDocument(),await n(t?.tagName).toBe("TEXTAREA"),await n(t).toHaveValue(""),!0},{timeout:1e3})}},w={name:"ヘッダーセル編集機能_Delete（内容クリア→編集モード移行なし）",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.click(i),await o.keyboard("{Delete}"),await new Promise(B=>setTimeout(B,200));const t=a.queryByRole("textbox");await n(t).not.toBeInTheDocument();const r=a.queryByRole("button",{name:/Name/});await n(r).not.toBeInTheDocument()}};async function H(e,a){const i=m(e);c(),await s(e);const t=await i.findByRole("button",{name:/Name/});await o.click(t),await o.keyboard(a),await u(async()=>{const r=i.queryByRole("textbox");return await n(r).toBeInTheDocument(),await n(r?.tagName).toBe("TEXTAREA"),await n(r).toHaveValue(a),!0},{timeout:1e3})}const y={name:"ヘッダーセル編集機能_文字入力（内容クリア→編集モード）",play:async({canvasElement:e})=>{await H(e,"X")}},p={name:"ヘッダーセル編集機能_F2キー（編集モード）",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.click(i),await o.keyboard("{F2}"),await u(async()=>{const t=a.queryByDisplayValue("Name");return await n(t).toBeInTheDocument(),await n(t?.tagName).toBe("TEXTAREA"),await n(t).toHaveValue("Name"),!0},{timeout:1e3})}},x={name:"ヘッダーセル編集機能_特殊キー入力",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.click(i),await o.keyboard("{F1}"),await new Promise(r=>setTimeout(r,100));let t=a.queryByRole("textbox");await n(t).not.toBeInTheDocument(),await o.click(i),await o.keyboard("{Escape}"),await new Promise(r=>setTimeout(r,100)),t=a.queryByRole("textbox"),await n(t).not.toBeInTheDocument()}},E={name:"ヘッダーセル編集機能_変更保存",play:async({canvasElement:e})=>{const a=m(e);c(),await s(e);const i=await a.findByRole("button",{name:/Name/});await o.dblClick(i);const t=await u(async()=>{const r=a.queryByDisplayValue("Name");return await n(r).toBeInTheDocument(),await n(r?.tagName).toBe("TEXTAREA"),r},{timeout:1e3});await o.clear(t),await o.type(t,"新しい名前"),await o.keyboard("{Enter}"),await u(async()=>{const r=a.queryByRole("columnheader",{name:/新しい名前/});return await n(r).toBeInTheDocument(),await n(r?.textContent).toContain("新しい名前"),!0},{timeout:2e3})}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをダブルクリックして編集モードに入る
    const nameHeader = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.dblClick(nameHeader);

    // 編集可能なtextarea要素が表示されることを確認
    await waitFor(async () => {
      const textarea = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
      await expect(textarea).toBeInTheDocument();
      await expect(textarea?.tagName).toBe("TEXTAREA");
      return true;
    }, {
      timeout: 1000
    });
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_Backspace（内容クリア→編集モード）",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.click(nameHeader);

    // ヘッダーセルが選択された状態でBackspaceキーを押す
    await userEvent.keyboard("{Backspace}");

    // 編集モードに入り、textarea要素が表示される（内容はクリアされている）
    await waitFor(async () => {
      const textarea = canvas.queryByRole("textbox") as HTMLTextAreaElement;
      await expect(textarea).toBeInTheDocument();
      await expect(textarea?.tagName).toBe("TEXTAREA");
      // 内容がクリアされていることを確認
      await expect(textarea).toHaveValue("");
      return true;
    }, {
      timeout: 1000
    });
  }
}`,...d.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_Delete（内容クリア→編集モード移行なし）",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルのボタンをクリックしてフォーカスを当てる
    const nameHeaderButton = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.click(nameHeaderButton);

    // ヘッダーセルが選択された状態でDeleteキーを押す
    await userEvent.keyboard("{Delete}");

    // 少し待機してDOM更新を待つ
    await new Promise(resolve => setTimeout(resolve, 200));

    // 内容がクリアされるが、編集モードには移行しない
    // 編集用のtextarea要素が作成されていないことを確認
    const textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();

    // ヘッダーセルの内容が空になっていることを確認
    // "Name"というテキストを含むヘッダーが存在しないことを確認
    const nameHeaderAfterDelete = canvas.queryByRole("button", {
      name: /Name/
    });
    await expect(nameHeaderAfterDelete).not.toBeInTheDocument();
  }
}`,...w.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_文字入力（内容クリア→編集モード）",
  play: async ({
    canvasElement
  }) => {
    await insertHeaderTextTest(canvasElement, "X");
  }
}`,...y.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_F2キー（編集モード）",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.click(nameHeader);

    // F2キーで編集モードに入る
    await userEvent.keyboard("{F2}");

    // 編集モードに入り、元の内容が保持されたtextarea要素が表示される
    await waitFor(async () => {
      const textarea = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
      await expect(textarea).toBeInTheDocument();
      await expect(textarea?.tagName).toBe("TEXTAREA");
      await expect(textarea).toHaveValue("Name");
      return true;
    }, {
      timeout: 1000
    });
  }
}`,...p.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_特殊キー入力",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをクリックして選択状態にする
    const nameHeader = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.click(nameHeader);

    // 以下のキーは編集モードに入らない（特殊動作をする）

    // F1キー（何も起こらない）
    await userEvent.keyboard("{F1}");
    await new Promise(resolve => setTimeout(resolve, 100));
    let textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();

    // ヘッダーセルを再度クリックして選択状態にする
    await userEvent.click(nameHeader);

    // Escapeキー（編集モードに入らない）
    await userEvent.keyboard("{Escape}");
    await new Promise(resolve => setTimeout(resolve, 100));
    textarea = canvas.queryByRole("textbox");
    await expect(textarea).not.toBeInTheDocument();
  }
}`,...x.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  name: "ヘッダーセル編集機能_変更保存",
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    setInitData();
    await waitReadyForGrid(canvasElement);

    // ヘッダーセルをダブルクリックして編集モードに入る
    const nameHeader = await canvas.findByRole("button", {
      name: /Name/
    });
    await userEvent.dblClick(nameHeader);

    // 編集可能なtextarea要素が表示されることを確認
    const textarea = await waitFor(async () => {
      const element = canvas.queryByDisplayValue("Name") as HTMLTextAreaElement;
      await expect(element).toBeInTheDocument();
      await expect(element?.tagName).toBe("TEXTAREA");
      return element;
    }, {
      timeout: 1000
    });

    // 内容を変更する
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "新しい名前");

    // Enterキーで変更を確定
    await userEvent.keyboard("{Enter}");

    // 編集モードが終了し、新しい内容が反映されることを確認
    await waitFor(async () => {
      const updatedHeader = canvas.queryByRole("columnheader", {
        name: /新しい名前/
      });
      await expect(updatedHeader).toBeInTheDocument();
      await expect(updatedHeader?.textContent).toContain("新しい名前");
      return true;
    }, {
      timeout: 2000
    });
  }
}`,...E.parameters?.docs?.source}}};const X=["HeaderEditingFunctionality","HeaderEditingFunctionality_Backspace","HeaderEditingFunctionality_Delete","HeaderEditingFunctionality_CharacterInput","HeaderEditingFunctionality_F2Key","HeaderEditingFunctionality_SpecialKeyInput","HeaderEditingFunctionality_SaveChanges"];export{l as HeaderEditingFunctionality,d as HeaderEditingFunctionality_Backspace,y as HeaderEditingFunctionality_CharacterInput,w as HeaderEditingFunctionality_Delete,p as HeaderEditingFunctionality_F2Key,E as HeaderEditingFunctionality_SaveChanges,x as HeaderEditingFunctionality_SpecialKeyInput,X as __namedExportsOrder,V as default};
