import{u as d,j as e}from"./index.c7fe8516.js";import{R as s}from"./index.03be2d59.js";import{r as n,$ as c}from"./iwwc-stats.b0b1f4b9.js";const u=i=>{const t=d(c)||{},[a,o]=s.useState(null);s.useEffect(()=>{o(t.$formatted)},[t.$formatted]);const l=s.useCallback(r=>{r.preventDefault(),r.stopPropagation(),n()});return e.jsxs("header",{className:"(group ? '' : 'loading')",children:[e.jsxs("div",{className:"agent-search",children:[e.jsx("input",{type:"text"}),e.jsx("span",{className:"clear-search fa-solid fa-remove"})]}),e.jsx("div",{className:"reload-button",onClick:l,children:"Reload"}),e.jsx("div",{className:"last-refresh",children:a?.lastRefresh}),e.jsx("div",{className:"start-date",children:a?.startDate}),e.jsx("div",{className:"end-date",children:a?.endDate})]})};export{u as default};
