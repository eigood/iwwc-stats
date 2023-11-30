import{r as u}from"./index.03be2d59.js";var f={exports:{}},i={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var p=u,y=Symbol.for("react.element"),a=Symbol.for("react.fragment"),c=Object.prototype.hasOwnProperty,m=p.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,x={key:!0,ref:!0,__self:!0,__source:!0};function _(t,e,s){var r,n={},o=null,l=null;s!==void 0&&(o=""+s),e.key!==void 0&&(o=""+e.key),e.ref!==void 0&&(l=e.ref);for(r in e)c.call(e,r)&&!x.hasOwnProperty(r)&&(n[r]=e[r]);if(t&&t.defaultProps)for(r in e=t.defaultProps,e)n[r]===void 0&&(n[r]=e[r]);return{$$typeof:y,type:t,key:o,ref:l,props:n,_owner:m.current}}i.Fragment=a;i.jsx=_;i.jsxs=_;f.exports=i;var S=f.exports;function d(t,e,s){let r=new Set([...e,void 0]);return t.listen((n,o)=>{r.has(o)&&s(n,o)})}function v(t,e={}){let s=u.useCallback(n=>e.keys?d(t,e.keys,n):t.listen(n),[e.keys,t]),r=t.get.bind(t);return u.useSyncExternalStore(s,r,r)}export{S as j,v as u};
