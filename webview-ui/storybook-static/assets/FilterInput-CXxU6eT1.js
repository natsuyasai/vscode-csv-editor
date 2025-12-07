import{j as r}from"./iframe-Bd5iukMj.js";const u="_filterInput_ctmid_1",a={filterInput:u},i=({column:e})=>{const t=e.getFilterValue();return r.jsx("input",{type:"text",className:a.filterInput,value:t??"",onChange:n=>{e.setFilterValue(n.target.value)},placeholder:"フィルター..."})};i.__docgenInfo={description:`フィルター入力コンポーネント

列のフィルタリングを行うための入力フィールドを提供します。
ユーザーが入力したテキストに基づいて列の値をフィルタリングします。`,methods:[],displayName:"FilterInput",props:{column:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  getFilterValue: () => unknown;
  setFilterValue: (value: string) => void;
}`,signature:{properties:[{key:"getFilterValue",value:{name:"signature",type:"function",raw:"() => unknown",signature:{arguments:[],return:{name:"unknown"}},required:!0}},{key:"setFilterValue",value:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}},required:!0}}]}},description:""}}};export{i as F};
