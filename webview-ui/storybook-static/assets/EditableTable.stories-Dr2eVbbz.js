import{E as i}from"./EditableTable-zfY_aA70.js";import"./iframe-Bd5iukMj.js";import"./preload-helper-PPVm8Dsz.js";import"./index-BJV2zsg5.js";import"./index-BtVw76ZD.js";import"./VscodeTreeItem-COO8tQji.js";import"./index-C4LYco7Y.js";import"./Search-W93azvAP.js";import"./Header-DxH-wpyX.js";import"./CellAlignmentControls-DBTyiEVQ.js";import"./EditableCell-DxQWItSe.js";import"./RowIndexCell-FX_pJQHc.js";import"./FilterInput-CXxU6eT1.js";import"./DraggableHeaderCell-CyeAS6hi.js";const{fn:p,expect:l}=__STORYBOOK_MODULE_TEST__,T={title:"components/editable-table/EditableTable",component:i,args:{csvArray:[["A","B","CCCCCCCCCCCCCCCCC","D","E"],["1","11","111","1111",`1
1
1
1
1`],["2","22","222","2222","22222"],["","","","",""],["3","33","333","3333","33333"],["","","","",""],["","","","",""],["4","44","444","4444","44444"],["","","","",""]],theme:"light",setCSVArray:p(),onApply:p()}},a={play:async({canvas:m})=>{const e=m.getByRole("table");await l(e).toBeInTheDocument()}},r={args:{theme:"light"}},t={args:{theme:"dark"}},s={args:{csvArray:[["Column 1","Column 2","Column 3"]]}},o={args:{csvArray:[["ID","Name","Email","Department","Salary","StartDate","Status"],...Array.from({length:100},(m,e)=>[String(e+1),`Employee ${e+1}`,`employee${e+1}@company.com`,["Engineering","Marketing","Sales","HR"][e%4],String(5e4+e*1e3),`2023-0${e%12+1}-01`,["Active","Inactive"][e%2]])]}},n={args:{csvArray:[["名前","年齢","都市","国"],["田中太郎","30","東京","日本"],["佐藤花子","25","大阪","日本"],["鈴木一郎","35","名古屋","日本"],["高橋美子","28","福岡","日本"],["渡辺健太","32","札幌","日本"]]}},c={args:{csvArray:[]}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvas
  }) => {
    const table = canvas.getByRole("table");
    await expect(table).toBeInTheDocument();
  }
}`,...a.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    theme: "light"
  }
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    theme: "dark"
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    csvArray: [["Column 1", "Column 2", "Column 3"]]
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:'{\n  args: {\n    csvArray: [["ID", "Name", "Email", "Department", "Salary", "StartDate", "Status"], ...Array.from({\n      length: 100\n    }, (_, i) => [String(i + 1), `Employee ${i + 1}`, `employee${i + 1}@company.com`, ["Engineering", "Marketing", "Sales", "HR"][i % 4], String(50000 + i * 1000), `2023-0${i % 12 + 1}-01`, ["Active", "Inactive"][i % 2]])]\n  }\n}',...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    csvArray: [["名前", "年齢", "都市", "国"], ["田中太郎", "30", "東京", "日本"], ["佐藤花子", "25", "大阪", "日本"], ["鈴木一郎", "35", "名古屋", "日本"], ["高橋美子", "28", "福岡", "日本"], ["渡辺健太", "32", "札幌", "日本"]]
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    csvArray: []
  }
}`,...c.parameters?.docs?.source}}};const k=["Default","Light","Dark","EmptyData","LargeDataset","JapaneseData","Empty"];export{t as Dark,a as Default,c as Empty,s as EmptyData,n as JapaneseData,o as LargeDataset,r as Light,k as __namedExportsOrder,T as default};
