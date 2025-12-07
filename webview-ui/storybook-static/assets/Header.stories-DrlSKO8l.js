import{r as p,j as S}from"./iframe-Bd5iukMj.js";import{H as w}from"./Header-DxH-wpyX.js";import"./preload-helper-PPVm8Dsz.js";import"./VscodeTreeItem-COO8tQji.js";import"./CellAlignmentControls-DBTyiEVQ.js";const{fn:e,userEvent:g,expect:u}=__STORYBOOK_MODULE_TEST__,B={title:"components/header/Header",component:w,args:{isIgnoreHeaderRow:!1,isEnabledRedo:!0,isEnabledUndo:!0,onSearch:e(),onUndo:e(),onRedo:e(),onUpdateIgnoreHeaderRow:e(),rowSize:"normal",onUpdateRowSize:e(),onClickApply:e(),showFilters:!1,onToggleFilters:e(),onClearFilters:e(),hasActiveFilters:!1},render:function(s){const[o,d]=p.useState("normal"),[m,f]=p.useState(!1),[F,R]=p.useState(!1);return S.jsx(w,{...s,rowSize:o,onUpdateRowSize:d,showFilters:m,onToggleFilters:()=>f(!m),hasActiveFilters:F,onClearFilters:()=>R(!1)})}},a={args:{isIgnoreHeaderRow:!1}},r={args:{isEnabledRedo:!1,isEnabledUndo:!1}},i={play:async({canvas:t})=>{const s=t.getByLabelText("Row size"),o=s.shadowRoot?.querySelector("div[class*='select-face']");await u(o).toBeVisible(),await g.click(o);const d=s.shadowRoot?.querySelector("div[class*='dropdown']");await u(d).toBeVisible()}},n={args:{showFilters:!0,hasActiveFilters:!1}},l={args:{showFilters:!0,hasActiveFilters:!0}},c={play:async({canvas:t})=>{const s=t.getByLabelText("toggle filters");await u(s).toBeVisible(),await g.click(s)}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    isIgnoreHeaderRow: false
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    isEnabledRedo: false,
    isEnabledUndo: false
  }
}`,...r.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvas
  }) => {
    const listbox = canvas.getByLabelText("Row size");
    const listItem = listbox.shadowRoot?.querySelector("div[class*='select-face']");
    await expect(listItem).toBeVisible();
    await userEvent.click(listItem!);
    const option = listbox.shadowRoot?.querySelector("div[class*='dropdown']");
    await expect(option).toBeVisible();
  }
}`,...i.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    showFilters: true,
    hasActiveFilters: false
  }
}`,...n.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    showFilters: true,
    hasActiveFilters: true
  }
}`,...l.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvas
  }) => {
    const filterButton = canvas.getByLabelText("toggle filters");
    await expect(filterButton).toBeVisible();
    await userEvent.click(filterButton);
  }
}`,...c.parameters?.docs?.source}}};const E=["Default","DisabledUndoRedo","OpenSlectRow","WithFilters","WithActiveFilters","FilterToggleInteraction"];export{a as Default,r as DisabledUndoRedo,c as FilterToggleInteraction,i as OpenSlectRow,l as WithActiveFilters,n as WithFilters,E as __namedExportsOrder,B as default};
