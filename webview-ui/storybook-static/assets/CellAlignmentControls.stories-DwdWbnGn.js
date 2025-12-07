import{j as e}from"./iframe-Bd5iukMj.js";import{C as t}from"./CellAlignmentControls-DBTyiEVQ.js";import"./preload-helper-PPVm8Dsz.js";import"./VscodeTreeItem-COO8tQji.js";const{fn:d}=__STORYBOOK_MODULE_TEST__,A={title:"components/header/CellAlignmentControls",component:t,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{selectedColumnKey:{control:"text",description:"選択中の列キー"},currentAlignment:{control:"object",description:"現在の配置設定"}},args:{onAlignmentChange:d()}},m={vertical:"center",horizontal:"left"},r={args:{selectedColumnKey:"col0",currentAlignment:m}},l={args:{selectedColumnKey:null,currentAlignment:m}},o={args:{selectedColumnKey:"col0",currentAlignment:{vertical:"top",horizontal:"left"}}},c={args:{selectedColumnKey:"col0",currentAlignment:{vertical:"center",horizontal:"center"}}},i={args:{selectedColumnKey:"col0",currentAlignment:{vertical:"bottom",horizontal:"right"}}},s={args:{selectedColumnKey:"col0",currentAlignment:{vertical:"top",horizontal:"left"}},render:n=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:[e.jsxs("div",{children:[e.jsx("h3",{children:"上寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"top",horizontal:"left"}})]}),e.jsxs("div",{children:[e.jsx("h3",{children:"中央寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"center",horizontal:"left"}})]}),e.jsxs("div",{children:[e.jsx("h3",{children:"下寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"bottom",horizontal:"left"}})]})]})},a={args:{selectedColumnKey:"col0",currentAlignment:{vertical:"center",horizontal:"left"}},render:n=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:[e.jsxs("div",{children:[e.jsx("h3",{children:"左寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"center",horizontal:"left"}})]}),e.jsxs("div",{children:[e.jsx("h3",{children:"中央寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"center",horizontal:"center"}})]}),e.jsxs("div",{children:[e.jsx("h3",{children:"右寄せ"}),e.jsx(t,{...n,currentAlignment:{vertical:"center",horizontal:"right"}})]})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: defaultAlignment
  }
}`,...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: null,
    currentAlignment: defaultAlignment
  }
}`,...l.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "top",
      horizontal: "left"
    }
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "center",
      horizontal: "center"
    }
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "bottom",
      horizontal: "right"
    }
  }
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "top",
      horizontal: "left"
    }
  },
  render: args => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  }}>
      <div>
        <h3>上寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "top",
        horizontal: "left"
      }} />
      </div>
      <div>
        <h3>中央寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "center",
        horizontal: "left"
      }} />
      </div>
      <div>
        <h3>下寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "bottom",
        horizontal: "left"
      }} />
      </div>
    </div>
}`,...s.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    selectedColumnKey: "col0",
    currentAlignment: {
      vertical: "center",
      horizontal: "left"
    }
  },
  render: args => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  }}>
      <div>
        <h3>左寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "center",
        horizontal: "left"
      }} />
      </div>
      <div>
        <h3>中央寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "center",
        horizontal: "center"
      }} />
      </div>
      <div>
        <h3>右寄せ</h3>
        <CellAlignmentControls {...args} currentAlignment={{
        vertical: "center",
        horizontal: "right"
      }} />
      </div>
    </div>
}`,...a.parameters?.docs?.source}}};const v=["Default","NoColumnSelected","TopLeftAlignment","CenterCenterAlignment","BottomRightAlignment","AllVerticalAlignments","AllHorizontalAlignments"];export{a as AllHorizontalAlignments,s as AllVerticalAlignments,i as BottomRightAlignment,c as CenterCenterAlignment,r as Default,l as NoColumnSelected,o as TopLeftAlignment,v as __namedExportsOrder,A as default};
