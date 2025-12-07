import{R as _}from"./iframe-Bd5iukMj.js";const qs=new Set(["children","localName","ref","style","className"]),jt=new WeakMap,qt=(n,e,t,s,i)=>{const o=i?.[e];o===void 0?(n[e]=t,t==null&&e in HTMLElement.prototype&&n.removeAttribute(e)):t!==s&&((r,l,c)=>{let h=jt.get(r);h===void 0&&jt.set(r,h=new Map);let f=h.get(l);c!==void 0?f===void 0?(h.set(l,f={handleEvent:c}),r.addEventListener(l,f)):f.handleEvent=c:f!==void 0&&(h.delete(l),r.removeEventListener(l,f))})(n,o,t)},g=({react:n,tagName:e,elementClass:t,events:s,displayName:i})=>{const o=new Set(Object.keys(s??{})),r=n.forwardRef(((l,c)=>{const h=n.useRef(new Map),f=n.useRef(null),p={},I={};for(const[v,S]of Object.entries(l))qs.has(v)?p[v==="className"?"class":v]=S:o.has(v)||v in t.prototype?I[v]=S:p[v]=S;return n.useLayoutEffect((()=>{if(f.current===null)return;const v=new Map;for(const S in I)qt(f.current,S,l[S],h.current.get(S),s),h.current.delete(S),v.set(S,l[S]);for(const[S,te]of h.current)qt(f.current,S,void 0,te,s);h.current=v})),n.useLayoutEffect((()=>{f.current?.removeAttribute("defer-hydration")}),[]),p.suppressHydrationWarning=!0,n.createElement(e,{...p,ref:n.useCallback((v=>{f.current=v,typeof c=="function"?c(v):c!==null&&(c.current=v)}),[c])})}));return r.displayName=i??t.name,r};const ct=globalThis,Pt=ct.ShadowRoot&&(ct.ShadyCSS===void 0||ct.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,At=Symbol(),Ut=new WeakMap;let vs=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==At)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(Pt&&e===void 0){const s=t!==void 0&&t.length===1;s&&(e=Ut.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&Ut.set(t,e))}return e}toString(){return this.cssText}};const bt=n=>new vs(typeof n=="string"?n:n+"",void 0,At),m=(n,...e)=>{const t=n.length===1?n[0]:e.reduce(((s,i,o)=>s+(r=>{if(r._$cssResult$===!0)return r.cssText;if(typeof r=="number")return r;throw Error("Value passed to 'css' function must be a 'css' function result: "+r+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+n[o+1]),n[0]);return new vs(t,n,At)},Us=(n,e)=>{if(Pt)n.adoptedStyleSheets=e.map((t=>t instanceof CSSStyleSheet?t:t.styleSheet));else for(const t of e){const s=document.createElement("style"),i=ct.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,n.appendChild(s)}},Gt=Pt?n=>n:n=>n instanceof CSSStyleSheet?(e=>{let t="";for(const s of e.cssRules)t+=s.cssText;return bt(t)})(n):n;const{is:Gs,defineProperty:Ws,getOwnPropertyDescriptor:Ks,getOwnPropertyNames:Ys,getOwnPropertySymbols:Xs,getPrototypeOf:Zs}=Object,_t=globalThis,Wt=_t.trustedTypes,Js=Wt?Wt.emptyScript:"",Qs=_t.reactiveElementPolyfillSupport,qe=(n,e)=>n,ht={toAttribute(n,e){switch(e){case Boolean:n=n?Js:null;break;case Object:case Array:n=n==null?n:JSON.stringify(n)}return n},fromAttribute(n,e){let t=n;switch(e){case Boolean:t=n!==null;break;case Number:t=n===null?null:Number(n);break;case Object:case Array:try{t=JSON.parse(n)}catch{t=null}}return t}},Rt=(n,e)=>!Gs(n,e),Kt={attribute:!0,type:String,converter:ht,reflect:!1,useDefault:!1,hasChanged:Rt};Symbol.metadata??=Symbol("metadata"),_t.litPropertyMetadata??=new WeakMap;let Re=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Kt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&Ws(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){const{get:i,set:o}=Ks(this.prototype,e)??{get(){return this[t]},set(r){this[t]=r}};return{get:i,set(r){const l=i?.call(this);o?.call(this,r),this.requestUpdate(e,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Kt}static _$Ei(){if(this.hasOwnProperty(qe("elementProperties")))return;const e=Zs(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(qe("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(qe("properties"))){const t=this.properties,s=[...Ys(t),...Xs(t)];for(const i of s)this.createProperty(i,t[i])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const i of s)t.unshift(Gt(i))}else e!==void 0&&t.push(Gt(e));return t}static _$Eu(e,t){const s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise((e=>this.enableUpdating=e)),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((e=>e(this)))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Us(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((e=>e.hostConnected?.()))}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach((e=>e.hostDisconnected?.()))}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){const s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){const o=(s.converter?.toAttribute!==void 0?s.converter:ht).toAttribute(t,s.type);this._$Em=e,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(e,t){const s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){const o=s.getPropertyOptions(i),r=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:ht;this._$Em=i;const l=r.fromAttribute(t,o.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(e,t,s){if(e!==void 0){const i=this.constructor,o=this[e];if(s??=i.getPropertyOptions(e),!((s.hasChanged??Rt)(o,t)||s.useDefault&&s.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(i._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:o},r){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),o!==!0||r!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}const s=this.constructor.elementProperties;if(s.size>0)for(const[i,o]of s){const{wrapped:r}=o,l=this[i];r!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,o,l)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach((s=>s.hostUpdate?.())),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach((t=>t.hostUpdated?.())),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach((t=>this._$ET(t,this[t]))),this._$EM()}updated(e){}firstUpdated(e){}};Re.elementStyles=[],Re.shadowRootOptions={mode:"open"},Re[qe("elementProperties")]=new Map,Re[qe("finalized")]=new Map,Qs?.({ReactiveElement:Re}),(_t.reactiveElementVersions??=[]).push("2.1.1");const Vt=globalThis,pt=Vt.trustedTypes,Yt=pt?pt.createPolicy("lit-html",{createHTML:n=>n}):void 0,bs="$lit$",ue=`lit$${Math.random().toFixed(9).slice(2)}$`,_s="?"+ue,eo=`<${_s}>`,Ce=document,Ue=()=>Ce.createComment(""),Ge=n=>n===null||typeof n!="object"&&typeof n!="function",Bt=Array.isArray,to=n=>Bt(n)||typeof n?.[Symbol.iterator]=="function",Ct=`[ 	
\f\r]`,Fe=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Xt=/-->/g,Zt=/>/g,me=RegExp(`>|${Ct}(?:([^\\s"'>=/]+)(${Ct}*=${Ct}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Jt=/'/g,Qt=/"/g,gs=/^(?:script|style|textarea|title)$/i,ms=n=>(e,...t)=>({_$litType$:n,strings:e,values:t}),d=ms(1),so=ms(2),ie=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),es=new WeakMap,we=Ce.createTreeWalker(Ce,129);function ys(n,e){if(!Bt(n)||!n.hasOwnProperty("raw"))throw Error("invalid template strings array");return Yt!==void 0?Yt.createHTML(e):e}const oo=(n,e)=>{const t=n.length-1,s=[];let i,o=e===2?"<svg>":e===3?"<math>":"",r=Fe;for(let l=0;l<t;l++){const c=n[l];let h,f,p=-1,I=0;for(;I<c.length&&(r.lastIndex=I,f=r.exec(c),f!==null);)I=r.lastIndex,r===Fe?f[1]==="!--"?r=Xt:f[1]!==void 0?r=Zt:f[2]!==void 0?(gs.test(f[2])&&(i=RegExp("</"+f[2],"g")),r=me):f[3]!==void 0&&(r=me):r===me?f[0]===">"?(r=i??Fe,p=-1):f[1]===void 0?p=-2:(p=r.lastIndex-f[2].length,h=f[1],r=f[3]===void 0?me:f[3]==='"'?Qt:Jt):r===Qt||r===Jt?r=me:r===Xt||r===Zt?r=Fe:(r=me,i=void 0);const v=r===me&&n[l+1].startsWith("/>")?" ":"";o+=r===Fe?c+eo:p>=0?(s.push(h),c.slice(0,p)+bs+c.slice(p)+ue+v):c+ue+(p===-2?l:v)}return[ys(n,o+(n[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]};class We{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let o=0,r=0;const l=e.length-1,c=this.parts,[h,f]=oo(e,t);if(this.el=We.createElement(h,s),we.currentNode=this.el.content,t===2||t===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(i=we.nextNode())!==null&&c.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(const p of i.getAttributeNames())if(p.endsWith(bs)){const I=f[r++],v=i.getAttribute(p).split(ue),S=/([.?@])?(.*)/.exec(I);c.push({type:1,index:o,name:S[2],strings:v,ctor:S[1]==="."?no:S[1]==="?"?ro:S[1]==="@"?lo:gt}),i.removeAttribute(p)}else p.startsWith(ue)&&(c.push({type:6,index:o}),i.removeAttribute(p));if(gs.test(i.tagName)){const p=i.textContent.split(ue),I=p.length-1;if(I>0){i.textContent=pt?pt.emptyScript:"";for(let v=0;v<I;v++)i.append(p[v],Ue()),we.nextNode(),c.push({type:2,index:++o});i.append(p[I],Ue())}}}else if(i.nodeType===8)if(i.data===_s)c.push({type:2,index:o});else{let p=-1;for(;(p=i.data.indexOf(ue,p+1))!==-1;)c.push({type:7,index:o}),p+=ue.length-1}o++}}static createElement(e,t){const s=Ce.createElement("template");return s.innerHTML=e,s}}function Ve(n,e,t=n,s){if(e===ie)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl;const o=Ge(e)?void 0:e._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(n),i._$AT(n,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=Ve(n,i._$AS(n,e.values),i,s)),e}let io=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??Ce).importNode(t,!0);we.currentNode=i;let o=we.nextNode(),r=0,l=0,c=s[0];for(;c!==void 0;){if(r===c.index){let h;c.type===2?h=new Te(o,o.nextSibling,this,e):c.type===1?h=new c.ctor(o,c.name,c.strings,this,e):c.type===6&&(h=new ao(o,this,e)),this._$AV.push(h),c=s[++l]}r!==c?.index&&(o=we.nextNode(),r++)}return we.currentNode=Ce,i}p(e){let t=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}};class Te{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Ve(this,e,t),Ge(e)?e===u||e==null||e===""?(this._$AH!==u&&this._$AR(),this._$AH=u):e!==this._$AH&&e!==ie&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):to(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==u&&Ge(this._$AH)?this._$AA.nextSibling.data=e:this.T(Ce.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=We.createElement(ys(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{const o=new io(i,this),r=o.u(this.options);o.p(t),this.T(r),this._$AH=o}}_$AC(e){let t=es.get(e.strings);return t===void 0&&es.set(e.strings,t=new We(e)),t}k(e){Bt(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let s,i=0;for(const o of e)i===t.length?t.push(s=new Te(this.O(Ue()),this.O(Ue()),this,this.options)):s=t[i],s._$AI(o),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const s=e.nextSibling;e.remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}}class gt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=u}_$AI(e,t=this,s,i){const o=this.strings;let r=!1;if(o===void 0)e=Ve(this,e,t,0),r=!Ge(e)||e!==this._$AH&&e!==ie,r&&(this._$AH=e);else{const l=e;let c,h;for(e=o[0],c=0;c<o.length-1;c++)h=Ve(this,l[s+c],t,c),h===ie&&(h=this._$AH[c]),r||=!Ge(h)||h!==this._$AH[c],h===u?e=u:e!==u&&(e+=(h??"")+o[c+1]),this._$AH[c]=h}r&&!i&&this.j(e)}j(e){e===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class no extends gt{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===u?void 0:e}}class ro extends gt{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==u)}}class lo extends gt{constructor(e,t,s,i,o){super(e,t,s,i,o),this.type=5}_$AI(e,t=this){if((e=Ve(this,e,t,0)??u)===ie)return;const s=this._$AH,i=e===u&&s!==u||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,o=e!==u&&(s===u||i);i&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ao{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){Ve(this,e)}}const co={I:Te},ho=Vt.litHtmlPolyfillSupport;ho?.(We,Te),(Vt.litHtmlVersions??=[]).push("3.3.1");const xs=(n,e,t)=>{const s=t?.renderBefore??e;let i=s._$litPart$;if(i===void 0){const o=t?.renderBefore??null;s._$litPart$=i=new Te(e.insertBefore(Ue(),o),o,void 0,t??{})}return i._$AI(n),i};const Tt=globalThis;let se=class extends Re{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=xs(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return ie}};se._$litElement$=!0,se.finalized=!0,Tt.litElementHydrateSupport?.({LitElement:se});const po=Tt.litElementPolyfillSupport;po?.({LitElement:se});(Tt.litElementVersions??=[]).push("4.2.1");const uo={attribute:!0,type:String,converter:ht,reflect:!1,hasChanged:Rt},fo=(n=uo,e,t)=>{const{kind:s,metadata:i}=t;let o=globalThis.litPropertyMetadata.get(i);if(o===void 0&&globalThis.litPropertyMetadata.set(i,o=new Map),s==="setter"&&((n=Object.create(n)).wrapped=!0),o.set(t.name,n),s==="accessor"){const{name:r}=t;return{set(l){const c=e.get.call(this);e.set.call(this,l),this.requestUpdate(r,c,n)},init(l){return l!==void 0&&this.C(r,void 0,n,l),l}}}if(s==="setter"){const{name:r}=t;return function(l){const c=this[r];e.call(this,l),this.requestUpdate(r,c,n)}}throw Error("Unsupported decorator location: "+s)};function a(n){return(e,t)=>typeof t=="object"?fo(n,e,t):((s,i,o)=>{const r=i.hasOwnProperty(o);return i.constructor.createProperty(o,s),r?Object.getOwnPropertyDescriptor(i,o):void 0})(n,e,t)}function b(n){return a({...n,state:!0,attribute:!1})}const Ke=(n,e,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(n,e,t),t);function j(n,e){return(t,s,i)=>{const o=r=>r.renderRoot?.querySelector(n)??null;if(e){const{get:r,set:l}=typeof s=="object"?t:i??(()=>{const c=Symbol();return{get(){return this[c]},set(h){this[c]=h}}})();return Ke(t,s,{get(){let c=r.call(this);return c===void 0&&(c=o(this),(c!==null||this.hasUpdated)&&l.call(this,c)),c}})}return Ke(t,s,{get(){return o(this)}})}}let vo;function bo(n){return(e,t)=>Ke(e,t,{get(){return(this.renderRoot??(vo??=document.createDocumentFragment())).querySelectorAll(n)}})}function W(n){return(e,t)=>{const{slot:s,selector:i}=n??{},o="slot"+(s?`[name=${s}]`:":not([name])");return Ke(e,t,{get(){const r=this.renderRoot?.querySelector(o),l=r?.assignedElements(n)??[];return i===void 0?l:l.filter((c=>c.matches(i)))}})}}function _o(n){return(e,t)=>{const{slot:s}={},i="slot"+(s?`[name=${s}]`:":not([name])");return Ke(e,t,{get(){return this.renderRoot?.querySelector(i)?.assignedNodes(n)??[]}})}}const dt="2.3.1",ts="__vscodeElements_disableRegistryWarning__";class w extends se{get version(){return dt}}const y=n=>e=>{if(!customElements.get(n)){customElements.define(n,e);return}if(ts in window)return;const i=document.createElement(n)?.version;let o="";i?i!==dt?(o+="is already registered by a different version of VSCode Elements. ",o+=`This version is "${dt}", while the other one is "${i}".`):o+=`is already registered by the same version of VSCode Elements (${dt}).`:o+="is already registered by an unknown custom element handler class.",console.warn(`[VSCode Elements] ${n} ${o}
To suppress this warning, set window.${ts} to true`)},x=m`
  :host([hidden]) {
    display: none;
  }

  :host([disabled]),
  :host(:disabled) {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }
`,go=16,mo=13,yo=go/mo;function zt(){return navigator.userAgent.indexOf("Linux")>-1?'system-ui, "Ubuntu", "Droid Sans", sans-serif':navigator.userAgent.indexOf("Mac")>-1?"-apple-system, BlinkMacSystemFont, sans-serif":navigator.userAgent.indexOf("Windows")>-1?'"Segoe WPC", "Segoe UI", sans-serif':"sans-serif"}const xo=bt(zt()),wo=[x,m`
    :host {
      display: inline-block;
    }

    .root {
      background-color: var(--vscode-badge-background, #616161);
      border: 1px solid var(--vscode-contrastBorder, transparent);
      border-radius: 2px;
      box-sizing: border-box;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: block;
      font-family: var(--vscode-font-family, ${xo});
      font-size: 11px;
      font-weight: 400;
      line-height: 14px;
      min-width: 18px;
      padding: 2px 3px;
      text-align: center;
      white-space: nowrap;
    }

    :host([variant='counter']) .root {
      border-radius: 11px;
      line-height: 11px;
      min-height: 18px;
      min-width: 18px;
      padding: 3px 6px;
    }

    :host([variant='activity-bar-counter']) .root {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 20px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      font-size: 9px;
      font-weight: 600;
      line-height: 16px;
      padding: 0 4px;
    }

    :host([variant='tab-header-counter']) .root {
      background-color: var(--vscode-activityBarBadge-background, #0078d4);
      border-radius: 10px;
      color: var(--vscode-activityBarBadge-foreground, #ffffff);
      line-height: 10px;
      min-height: 16px;
      min-width: 16px;
      padding: 3px 5px;
    }
  `];var ws=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Ye=class extends w{constructor(){super(...arguments),this.variant="default"}render(){return d`<div class="root"><slot></slot></div>`}};Ye.styles=wo;ws([a({reflect:!0})],Ye.prototype,"variant",void 0);Ye=ws([y("vscode-badge")],Ye);g({tagName:"vscode-badge",elementClass:Ye,react:_,displayName:"VscodeBadge"});const Lt={ATTRIBUTE:1,CHILD:2,PROPERTY:3},Dt=n=>(...e)=>({_$litDirective$:n,values:e});let Mt=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};const $=Dt(class extends Mt{constructor(n){if(super(n),n.type!==Lt.ATTRIBUTE||n.name!=="class"||n.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(n){return" "+Object.keys(n).filter((e=>n[e])).join(" ")+" "}update(n,[e]){if(this.st===void 0){this.st=new Set,n.strings!==void 0&&(this.nt=new Set(n.strings.join(" ").split(/\s/).filter((s=>s!==""))));for(const s in e)e[s]&&!this.nt?.has(s)&&this.st.add(s);return this.render(e)}const t=n.element.classList;for(const s of this.st)s in e||(t.remove(s),this.st.delete(s));for(const s in e){const i=!!e[s];i===this.st.has(s)||this.nt?.has(s)||(i?(t.add(s),this.st.add(s)):(t.remove(s),this.st.delete(s)))}return ie}});const C=n=>n??u;class Co extends Mt{constructor(e){if(super(e),this._prevProperties={},e.type!==Lt.PROPERTY||e.name!=="style")throw new Error("The `stylePropertyMap` directive must be used in the `style` property")}update(e,[t]){return Object.entries(t).forEach(([s,i])=>{this._prevProperties[s]!==i&&(s.startsWith("--")?e.element.style.setProperty(s,i):e.element.style[s]=i,this._prevProperties[s]=i)}),ie}render(e){return ie}}const U=Dt(Co),$o=[x,m`
    :host {
      color: var(--vscode-icon-foreground, #cccccc);
      display: inline-block;
    }

    .codicon[class*='codicon-'] {
      display: block;
    }

    .icon,
    .button {
      background-color: transparent;
      display: block;
      padding: 0;
    }

    .button {
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      border-radius: 5px;
      color: currentColor;
      cursor: pointer;
      padding: 2px;
    }

    .button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
    }

    .button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    .button:focus {
      outline: none;
    }

    .button:focus-visible {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    @keyframes icon-spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .spin {
      animation-name: icon-spin;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
  `];var Ie=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o},je;let Z=je=class extends w{constructor(){super(...arguments),this.label="",this.name="",this.size=16,this.spin=!1,this.spinDuration=1.5,this.actionIcon=!1,this._onButtonClick=e=>{this.dispatchEvent(new CustomEvent("vsc-click",{detail:{originalEvent:e}}))}}connectedCallback(){super.connectedCallback();const{href:e,nonce:t}=this._getStylesheetConfig();je.stylesheetHref=e,je.nonce=t}_getStylesheetConfig(){const e=document.getElementById("vscode-codicon-stylesheet"),t=e?.getAttribute("href")||void 0,s=e?.nonce||void 0;if(!e){let i="[VSCode Elements] To use the Icon component, the codicons.css file must be included in the page with the id `vscode-codicon-stylesheet`! ";i+="See https://vscode-elements.github.io/components/icon/ for more details.",console.warn(i)}return{nonce:s,href:t}}render(){const{stylesheetHref:e,nonce:t}=je,s=d`<span
      class=${$({codicon:!0,["codicon-"+this.name]:!0,spin:this.spin})}
      .style=${U({animationDuration:String(this.spinDuration)+"s",fontSize:this.size+"px",height:this.size+"px",width:this.size+"px"})}
    ></span>`,i=this.actionIcon?d` <button
          class="button"
          @click=${this._onButtonClick}
          aria-label=${this.label}
        >
          ${s}
        </button>`:d` <span class="icon" aria-hidden="true" role="presentation"
          >${s}</span
        >`;return d`
      <link
        rel="stylesheet"
        href=${C(e)}
        nonce=${C(t)}
      >
      ${i}
    `}};Z.styles=$o;Z.stylesheetHref="";Z.nonce="";Ie([a()],Z.prototype,"label",void 0);Ie([a({type:String})],Z.prototype,"name",void 0);Ie([a({type:Number})],Z.prototype,"size",void 0);Ie([a({type:Boolean,reflect:!0})],Z.prototype,"spin",void 0);Ie([a({type:Number,attribute:"spin-duration"})],Z.prototype,"spinDuration",void 0);Ie([a({type:Boolean,reflect:!0,attribute:"action-icon"})],Z.prototype,"actionIcon",void 0);Z=je=Ie([y("vscode-icon")],Z);const So=bt(zt()),ko=[x,m`
    :host {
      cursor: pointer;
      display: inline-block;
      width: auto;
    }

    .base {
      align-items: center;
      background-color: var(--vscode-button-background, #0078d4);
      border-bottom-left-radius: var(--vsc-border-left-radius, 2px);
      border-bottom-right-radius: var(--vsc-border-right-radius, 2px);
      border-bottom-width: 1px;
      border-color: var(--vscode-button-border, transparent);
      border-left-width: var(--vsc-border-left-width, 1px);
      border-right-width: var(--vsc-border-right-width, 1px);
      border-style: solid;
      border-top-left-radius: var(--vsc-border-left-radius, 2px);
      border-top-right-radius: var(--vsc-border-right-radius, 2px);
      border-top-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-button-foreground, #ffffff);
      display: flex;
      font-family: var(--vscode-font-family, ${So});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 100%;
      justify-content: center;
      line-height: 22px;
      overflow: hidden;
      padding: 1px calc(13px + var(--vsc-base-additional-right-padding, 0px))
        1px 13px;
      position: relative;
      user-select: none;
      white-space: nowrap;
      width: 100%;
    }

    .base:after {
      background-color: var(
        --vscode-button-separator,
        rgba(255, 255, 255, 0.4)
      );
      content: var(--vsc-base-after-content);
      display: var(--vsc-divider-display, none);
      position: absolute;
      right: 0;
      top: 4px;
      bottom: 4px;
      width: 1px;
    }

    :host([secondary]) .base:after {
      background-color: var(--vscode-button-secondaryForeground, #cccccc);
      opacity: 0.4;
    }

    :host([secondary]) .base {
      color: var(--vscode-button-secondaryForeground, #cccccc);
      background-color: var(--vscode-button-secondaryBackground, #313131);
      border-color: var(
        --vscode-button-border,
        var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.07))
      );
    }

    :host([disabled]) {
      cursor: default;
      opacity: 0.4;
      pointer-events: none;
    }

    :host(:hover) .base {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }

    :host([disabled]:hover) .base {
      background-color: var(--vscode-button-background, #0078d4);
    }

    :host([secondary]:hover) .base {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:hover) .base {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    :host(:focus),
    :host(:active) {
      outline: none;
    }

    :host(:focus) .base {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: 2px;
    }

    :host([disabled]:focus) .base {
      background-color: var(--vscode-button-background, #0078d4);
      outline: 0;
    }

    :host([secondary]:focus) .base {
      background-color: var(--vscode-button-secondaryHoverBackground, #3c3c3c);
    }

    :host([secondary][disabled]:focus) .base {
      background-color: var(--vscode-button-secondaryBackground, #313131);
    }

    ::slotted(*) {
      display: inline-block;
      margin-left: 4px;
      margin-right: 4px;
    }

    ::slotted(*:first-child) {
      margin-left: 0;
    }

    ::slotted(*:last-child) {
      margin-right: 0;
    }

    ::slotted(vscode-icon) {
      color: inherit;
    }

    .content {
      display: flex;
      position: relative;
      width: 100%;
      height: 100%;
      padding: 1px 13px;
    }

    :host(:empty) .base,
    .base.icon-only {
      min-height: 24px;
      min-width: 26px;
      padding: 1px 4px;
    }

    slot {
      align-items: center;
      display: flex;
      height: 100%;
    }

    .has-content-before slot[name='content-before'] {
      margin-right: 4px;
    }

    .has-content-after slot[name='content-after'] {
      margin-left: 4px;
    }

    .icon,
    .icon-after {
      color: inherit;
      display: block;
    }

    :host(:not(:empty)) .icon {
      margin-right: 3px;
    }

    :host(:not(:empty)) .icon-after,
    :host([icon]) .icon-after {
      margin-left: 3px;
    }
  `];var D=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let R=class extends w{get form(){return this._internals.form}constructor(){super(),this.autofocus=!1,this.tabIndex=0,this.secondary=!1,this.role="button",this.disabled=!1,this.icon="",this.iconSpin=!1,this.iconAfter="",this.iconAfterSpin=!1,this.focused=!1,this.name=void 0,this.iconOnly=!1,this.type="button",this.value="",this._prevTabindex=0,this._hasContentBefore=!1,this._hasContentAfter=!1,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1},this.addEventListener("keydown",this._handleKeyDown.bind(this)),this.addEventListener("click",this._handleClick.bind(this)),this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.autofocus&&(this.tabIndex<0&&(this.tabIndex=0),this.updateComplete.then(()=>{this.focus(),this.requestUpdate()})),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}update(e){super.update(e),e.has("value")&&this._internals.setFormValue(this.value),e.has("disabled")&&(this.disabled?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):this.tabIndex=this._prevTabindex)}_executeAction(){this.type==="submit"&&this._internals.form&&this._internals.form.requestSubmit(),this.type==="reset"&&this._internals.form&&this._internals.form.reset()}_handleKeyDown(e){if((e.key==="Enter"||e.key===" ")&&!this.hasAttribute("disabled")){const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});t.synthetic=!0,this.dispatchEvent(t),this._executeAction()}}_handleClick(e){e.synthetic||this.hasAttribute("disabled")||this._executeAction()}_handleSlotChange(e){const t=e.target;t.name==="content-before"&&(this._hasContentBefore=t.assignedElements().length>0),t.name==="content-after"&&(this._hasContentAfter=t.assignedElements().length>0)}render(){const e=this.icon!=="",t=this.iconAfter!=="",s={base:!0,"icon-only":this.iconOnly,"has-content-before":this._hasContentBefore,"has-content-after":this._hasContentAfter},i=e?d`<vscode-icon
          name=${this.icon}
          ?spin=${this.iconSpin}
          spin-duration=${C(this.iconSpinDuration)}
          class="icon"
        ></vscode-icon>`:u,o=t?d`<vscode-icon
          name=${this.iconAfter}
          ?spin=${this.iconAfterSpin}
          spin-duration=${C(this.iconAfterSpinDuration)}
          class="icon-after"
        ></vscode-icon>`:u;return d`
      <div
        class=${$(s)}
        part="base"
        @slotchange=${this._handleSlotChange}
      >
        <slot name="content-before"></slot>
        ${i}
        <slot></slot>
        ${o}
        <slot name="content-after"></slot>
      </div>
    `}};R.styles=ko;R.formAssociated=!0;D([a({type:Boolean,reflect:!0})],R.prototype,"autofocus",void 0);D([a({type:Number,reflect:!0})],R.prototype,"tabIndex",void 0);D([a({type:Boolean,reflect:!0})],R.prototype,"secondary",void 0);D([a({reflect:!0})],R.prototype,"role",void 0);D([a({type:Boolean,reflect:!0})],R.prototype,"disabled",void 0);D([a()],R.prototype,"icon",void 0);D([a({type:Boolean,reflect:!0,attribute:"icon-spin"})],R.prototype,"iconSpin",void 0);D([a({type:Number,reflect:!0,attribute:"icon-spin-duration"})],R.prototype,"iconSpinDuration",void 0);D([a({attribute:"icon-after"})],R.prototype,"iconAfter",void 0);D([a({type:Boolean,reflect:!0,attribute:"icon-after-spin"})],R.prototype,"iconAfterSpin",void 0);D([a({type:Number,reflect:!0,attribute:"icon-after-spin-duration"})],R.prototype,"iconAfterSpinDuration",void 0);D([a({type:Boolean,reflect:!0})],R.prototype,"focused",void 0);D([a({type:String,reflect:!0})],R.prototype,"name",void 0);D([a({type:Boolean,reflect:!0,attribute:"icon-only"})],R.prototype,"iconOnly",void 0);D([a({reflect:!0})],R.prototype,"type",void 0);D([a()],R.prototype,"value",void 0);D([b()],R.prototype,"_hasContentBefore",void 0);D([b()],R.prototype,"_hasContentAfter",void 0);R=D([y("vscode-button")],R);const Li=g({tagName:"vscode-button",elementClass:R,react:_,displayName:"VscodeButton"});var Io=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};class Ht extends w{constructor(){super(),this.focused=!1,this._prevTabindex=0,this._handleFocus=()=>{this.focused=!0},this._handleBlur=()=>{this.focused=!1}}connectedCallback(){super.connectedCallback(),this.addEventListener("focus",this._handleFocus),this.addEventListener("blur",this._handleBlur)}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("focus",this._handleFocus),this.removeEventListener("blur",this._handleBlur)}attributeChangedCallback(e,t,s){super.attributeChangedCallback(e,t,s),e==="disabled"&&this.hasAttribute("disabled")?(this._prevTabindex=this.tabIndex,this.tabIndex=-1):e==="disabled"&&!this.hasAttribute("disabled")&&(this.tabIndex=this._prevTabindex)}}Io([a({type:Boolean,reflect:!0})],Ht.prototype,"focused",void 0);var Eo=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const Cs=n=>{class e extends n{constructor(){super(...arguments),this._label="",this._slottedText=""}set label(s){this._label=s,this._slottedText===""&&this.setAttribute("aria-label",s)}get label(){return this._label}_handleSlotChange(){this._slottedText=this.textContent?this.textContent.trim():"",this._slottedText!==""&&this.setAttribute("aria-label",this._slottedText)}_renderLabelAttribute(){return this._slottedText===""?d`<span class="label-attr">${this._label}</span>`:d`${u}`}}return Eo([a()],e.prototype,"label",null),e},$s=[m`
    :host {
      display: inline-block;
    }

    :host(:focus) {
      outline: none;
    }

    :host([disabled]) {
      opacity: 0.4;
    }

    .wrapper {
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      margin-bottom: 4px;
      margin-top: 4px;
      min-height: 18px;
      position: relative;
      user-select: none;
    }

    :host([disabled]) .wrapper {
      cursor: default;
    }

    input {
      clip: rect(1px, 1px, 1px, 1px);
      height: 1px;
      left: 9px;
      margin: 0;
      overflow: hidden;
      position: absolute;
      top: 17px;
      white-space: nowrap;
      width: 1px;
    }

    .icon {
      align-items: center;
      background-color: var(--vscode-settings-checkboxBackground, #313131);
      background-size: 16px;
      border: 1px solid var(--vscode-settings-checkboxBorder, #3c3c3c);
      box-sizing: border-box;
      color: var(--vscode-settings-checkboxForeground, #cccccc);
      display: flex;
      height: 18px;
      justify-content: center;
      left: 0;
      margin-left: 0;
      margin-right: 9px;
      padding: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      width: 18px;
    }

    .icon.before-empty-label {
      margin-right: 0;
    }

    .label {
      cursor: pointer;
      display: block;
      min-height: 18px;
      min-width: 18px;
    }

    .label-inner {
      display: block;
      opacity: 0.9;
      padding-left: 27px;
    }

    .label-inner.empty {
      padding-left: 0;
    }

    :host([disabled]) .label {
      cursor: default;
    }
  `],Oo=[x,$s,m`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 3px;
    }

    .indeterminate-icon {
      background-color: currentColor;
      position: absolute;
      height: 1px;
      width: 12px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }

    /* Toggle appearance */
    :host([toggle]) .icon {
      /* Track */
      width: 36px;
      height: 20px;
      border-radius: 999px;
      background-color: var(--vscode-button-secondaryBackground, #313131);
      border-color: var(--vscode-button-border, transparent);
      justify-content: flex-start;
      position: absolute;
    }

    :host(:focus):host([toggle]):host(:not([disabled])) .icon {
      outline-offset: 2px;
    }

    /* Reserve space for the wider toggle track so text doesn't overlap */
    :host([toggle]) .label-inner {
      padding-left: 45px; /* 36px track + 9px spacing */
    }

    :host([toggle]) .label {
      min-height: 20px;
    }

    :host([toggle]) .wrapper {
      min-height: 20px;
      line-height: 20px;
    }

    :host([toggle]) .thumb {
      /* Thumb */
      box-sizing: border-box;
      display: block;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: var(--vscode-button-secondaryForeground, #cccccc);
      margin-left: 1px;
      transition: transform 120ms ease-in-out;
    }

    :host([toggle][checked]) .icon {
      background-color: var(--vscode-button-background, #04395e);
      border-color: var(--vscode-button-border, transparent);
    }

    :host([toggle][checked]) .thumb {
      transform: translateX(16px);
      background-color: var(--vscode-button-foreground, #ffffff);
    }

    :host([toggle]):host(:invalid) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([toggle]):host(:invalid) .thumb {
      background-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([toggle]) .check-icon,
    :host([toggle]) .indeterminate-icon {
      display: none;
    }

    :host([toggle]:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var K=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let M=class extends Cs(Ht){set checked(e){this._checked=e,this._manageRequired(),this.requestUpdate()}get checked(){return this._checked}set required(e){this._required=e,this._manageRequired(),this.requestUpdate()}get required(){return this._required}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}constructor(){super(),this.autofocus=!1,this._checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name=void 0,this.toggle=!1,this.value="",this.disabled=!1,this.indeterminate=!1,this._required=!1,this.type="checkbox",this._handleClick=e=>{e.preventDefault(),!this.disabled&&this._toggleState()},this._handleKeyDown=e=>{!this.disabled&&(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.key===" "&&this._toggleState(),e.key==="Enter"&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._handleKeyDown),this.updateComplete.then(()=>{this._manageRequired(),this._setActualFormValue()})}disconnectedCallback(){this.removeEventListener("keydown",this._handleKeyDown)}formResetCallback(){this.checked=this.defaultChecked}formStateRestoreCallback(e,t){e&&(this.checked=!0)}_setActualFormValue(){let e="";this.checked?e=this.value?this.value:"on":e=null,this._internals.setFormValue(e)}_toggleState(){this.checked=!this.checked,this.indeterminate=!1,this._setActualFormValue(),this._manageRequired(),this.dispatchEvent(new Event("change",{bubbles:!0}))}_manageRequired(){!this.checked&&this.required?this._internals.setValidity({valueMissing:!0},"Please check this box if you want to proceed.",this._inputEl??void 0):this._internals.setValidity({})}render(){const e=$({icon:!0,checked:this.checked,indeterminate:this.indeterminate}),t=$({"label-inner":!0}),s=d`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="check-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
      />
    </svg>`,i=this.checked&&!this.indeterminate?s:u,o=this.indeterminate?d`<span class="indeterminate-icon"></span>`:u,r=this.toggle?d`<span class="thumb"></span>`:d`${o}${i}`;return d`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="checkbox"
          type="checkbox"
          ?checked=${this.checked}
          role=${C(this.toggle?"switch":void 0)}
          aria-checked=${C(this.toggle?this.checked?"true":"false":void 0)}
          value=${this.value}
        >
        <div class=${e}>${r}</div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${t}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};M.styles=Oo;M.formAssociated=!0;M.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};K([a({type:Boolean,reflect:!0})],M.prototype,"autofocus",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"checked",null);K([a({type:Boolean,reflect:!0,attribute:"default-checked"})],M.prototype,"defaultChecked",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"invalid",void 0);K([a({reflect:!0})],M.prototype,"name",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"toggle",void 0);K([a()],M.prototype,"value",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"disabled",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"indeterminate",void 0);K([a({type:Boolean,reflect:!0})],M.prototype,"required",null);K([a()],M.prototype,"type",void 0);K([j("#input")],M.prototype,"_inputEl",void 0);M=K([y("vscode-checkbox")],M);const Mi=g({tagName:"vscode-checkbox",elementClass:M,react:_,displayName:"VscodeCheckbox",events:{onChange:"change"}}),Po=[x,m`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-checkbox) {
      margin-right: 20px;
    }

    ::slotted(vscode-checkbox:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-checkbox:last-child) {
      margin-bottom: 0;
    }
  `];var Ft=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Be=class extends w{constructor(){super(...arguments),this.role="group",this.variant="horizontal"}render(){return d`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};Be.styles=Po;Ft([a({reflect:!0})],Be.prototype,"role",void 0);Ft([a({reflect:!0})],Be.prototype,"variant",void 0);Be=Ft([y("vscode-checkbox-group")],Be);g({tagName:"vscode-checkbox-group",elementClass:Be,react:_,displayName:"VscodeCheckboxGroup"});const Ao=[x,m`
    .collapsible {
      background-color: var(--vscode-sideBar-background, #181818);
    }

    .collapsible-header {
      align-items: center;
      background-color: var(--vscode-sideBarSectionHeader-background, #181818);
      cursor: pointer;
      display: flex;
      height: 22px;
      line-height: 22px;
      user-select: none;
    }

    .collapsible-header:focus {
      opacity: 1;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
      outline-color: var(--vscode-focusBorder, #0078d4);
    }

    .title {
      color: var(--vscode-sideBarTitle-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 11px;
      font-weight: 700;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .title .description {
      font-weight: 400;
      margin-left: 10px;
      text-transform: none;
      opacity: 0.6;
    }

    .header-icon {
      color: var(--vscode-icon-foreground, #cccccc);
      display: block;
      flex-shrink: 0;
      margin: 0 3px;
    }

    .collapsible.open .header-icon {
      transform: rotate(90deg);
    }

    .header-slots {
      align-items: center;
      display: flex;
      height: 22px;
      margin-left: auto;
      margin-right: 4px;
    }

    .actions {
      display: none;
    }

    .collapsible.open .actions.always-visible,
    .collapsible.open:hover .actions {
      display: block;
    }

    .header-slots slot {
      display: flex;
      max-height: 22px;
      overflow: hidden;
    }

    .header-slots slot::slotted(div) {
      align-items: center;
      display: flex;
    }

    .collapsible-body {
      display: none;
      overflow: hidden;
    }

    .collapsible.open .collapsible-body {
      display: block;
    }
  `];var ze=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let ce=class extends w{constructor(){super(...arguments),this.alwaysShowHeaderActions=!1,this.title="",this.heading="",this.description="",this.open=!1}_emitToggleEvent(){this.dispatchEvent(new CustomEvent("vsc-collapsible-toggle",{detail:{open:this.open}}))}_onHeaderClick(){this.open=!this.open,this._emitToggleEvent()}_onHeaderKeyDown(e){e.key==="Enter"&&(this.open=!this.open,this._emitToggleEvent())}render(){const e={collapsible:!0,open:this.open},t={actions:!0,"always-visible":this.alwaysShowHeaderActions},s=this.heading?this.heading:this.title,i=d`<svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      class="header-icon"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
      />
    </svg>`,o=this.description?d`<span class="description">${this.description}</span>`:u;return d`
      <div class=${$(e)}>
        <div
          class="collapsible-header"
          tabindex="0"
          @click=${this._onHeaderClick}
          @keydown=${this._onHeaderKeyDown}
        >
          ${i}
          <h3 class="title">${s}${o}</h3>
          <div class="header-slots">
            <div class=${$(t)}>
              <slot name="actions"></slot>
            </div>
            <div class="decorations"><slot name="decorations"></slot></div>
          </div>
        </div>
        <div class="collapsible-body" part="body">
          <slot></slot>
        </div>
      </div>
    `}};ce.styles=Ao;ze([a({type:Boolean,reflect:!0,attribute:"always-show-header-actions"})],ce.prototype,"alwaysShowHeaderActions",void 0);ze([a({type:String})],ce.prototype,"title",void 0);ze([a()],ce.prototype,"heading",void 0);ze([a()],ce.prototype,"description",void 0);ze([a({type:Boolean,reflect:!0})],ce.prototype,"open",void 0);ce=ze([y("vscode-collapsible")],ce);g({tagName:"vscode-collapsible",elementClass:ce,react:_,displayName:"VscodeCollapsible"});const Ro=[x,m`
    :host {
      display: block;
      outline: none;
      position: relative;
    }

    .context-menu-item {
      background-color: var(--vscode-menu-background, #1f1f1f);
      color: var(--vscode-menu-foreground, #cccccc);
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      user-select: none;
      white-space: nowrap;
    }

    .ruler {
      border-bottom: 1px solid var(--vscode-menu-separatorBackground, #454545);
      display: block;
      margin: 0 0 4px;
      padding-top: 4px;
      width: 100%;
    }

    .context-menu-item a {
      align-items: center;
      border-color: transparent;
      border-radius: 3px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-menu-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex: 1 1 auto;
      height: 2em;
      margin-left: 4px;
      margin-right: 4px;
      outline: none;
      position: relative;
      text-decoration: inherit;
    }

    :host([selected]) .context-menu-item a {
      background-color: var(--vscode-menu-selectionBackground, #0078d4);
      border-color: var(--vscode-menu-selectionBorder, transparent);
      color: var(--vscode-menu-selectionForeground, #ffffff);
    }

    .label {
      background: none;
      display: flex;
      flex: 1 1 auto;
      font-size: 12px;
      line-height: 1;
      padding: 0 22px;
      text-decoration: none;
    }

    .keybinding {
      display: block;
      flex: 2 1 auto;
      line-height: 1;
      padding: 0 22px;
      text-align: right;
    }
  `];var Le=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let de=class extends w{constructor(){super(...arguments),this.label="",this.keybinding="",this.value="",this.separator=!1,this.tabindex=0}onItemClick(){this.dispatchEvent(new CustomEvent("vsc-click",{detail:{label:this.label,keybinding:this.keybinding,value:this.value||this.label,separator:this.separator,tabindex:this.tabindex},bubbles:!0,composed:!0}))}render(){return d`
      ${this.separator?d`
            <div class="context-menu-item separator">
              <span class="ruler"></span>
            </div>
          `:d`
            <div class="context-menu-item">
              <a @click=${this.onItemClick}>
                ${this.label?d`<span class="label">${this.label}</span>`:u}
                ${this.keybinding?d`<span class="keybinding">${this.keybinding}</span>`:u}
              </a>
            </div>
          `}
    `}};de.styles=Ro;Le([a({type:String})],de.prototype,"label",void 0);Le([a({type:String})],de.prototype,"keybinding",void 0);Le([a({type:String})],de.prototype,"value",void 0);Le([a({type:Boolean,reflect:!0})],de.prototype,"separator",void 0);Le([a({type:Number})],de.prototype,"tabindex",void 0);de=Le([y("vscode-context-menu-item")],de);const Vo=[x,m`
    :host {
      display: block;
      position: relative;
    }

    .context-menu {
      background-color: var(--vscode-menu-background, #1f1f1f);
      border-color: var(--vscode-menu-border, #454545);
      border-radius: 5px;
      border-style: solid;
      border-width: 1px;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
      color: var(--vscode-menu-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.4em;
      padding: 4px 0;
      white-space: nowrap;
    }

    .context-menu:focus {
      outline: 0;
    }
  `];var ge=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let oe=class extends w{set data(e){this._data=e;const t=[];e.forEach((s,i)=>{s.separator||t.push(i)}),this._clickableItemIndexes=t}get data(){return this._data}set show(e){this._show=e,this._selectedClickableItemIndex=-1,e&&this.updateComplete.then(()=>{this._wrapperEl&&this._wrapperEl.focus(),requestAnimationFrame(()=>{document.addEventListener("click",this._onClickOutsideBound,{once:!0})})})}get show(){return this._show}constructor(){super(),this.preventClose=!1,this.tabIndex=0,this._selectedClickableItemIndex=-1,this._show=!1,this._data=[],this._clickableItemIndexes=[],this._onClickOutsideBound=this._onClickOutside.bind(this),this.addEventListener("keydown",this._onKeyDown)}_onClickOutside(e){e.composedPath().includes(this)||(this.show=!1)}_onKeyDown(e){const{key:t}=e;switch((t==="ArrowUp"||t==="ArrowDown"||t==="Escape"||t==="Enter")&&e.preventDefault(),t){case"ArrowUp":this._handleArrowUp();break;case"ArrowDown":this._handleArrowDown();break;case"Escape":this._handleEscape();break;case"Enter":this._handleEnter();break}}_handleArrowUp(){this._selectedClickableItemIndex===0?this._selectedClickableItemIndex=this._clickableItemIndexes.length-1:this._selectedClickableItemIndex-=1}_handleArrowDown(){this._selectedClickableItemIndex+1<this._clickableItemIndexes.length?this._selectedClickableItemIndex+=1:this._selectedClickableItemIndex=0}_handleEscape(){this.show=!1,document.removeEventListener("click",this._onClickOutsideBound)}_dispatchSelectEvent(e){const{keybinding:t,label:s,value:i,separator:o,tabindex:r}=e;this.dispatchEvent(new CustomEvent("vsc-context-menu-select",{detail:{keybinding:t,label:s,separator:o,tabindex:r,value:i}}))}_handleEnter(){if(this._selectedClickableItemIndex===-1)return;const e=this._clickableItemIndexes[this._selectedClickableItemIndex],s=this._wrapperEl.querySelectorAll("vscode-context-menu-item")[e];this._dispatchSelectEvent(s),this.preventClose||(this.show=!1,document.removeEventListener("click",this._onClickOutsideBound))}_onItemClick(e){const t=e.currentTarget;this._dispatchSelectEvent(t),this.preventClose||(this.show=!1)}_onItemMouseOver(e){const t=e.target,s=t.dataset.index?+t.dataset.index:-1,i=this._clickableItemIndexes.findIndex(o=>o===s);i!==-1&&(this._selectedClickableItemIndex=i)}_onItemMouseOut(){this._selectedClickableItemIndex=-1}render(){if(!this._show)return d`${u}`;const e=this._clickableItemIndexes[this._selectedClickableItemIndex];return d`
      <div class="context-menu" tabindex="0">
        ${this.data?this.data.map(({label:t="",keybinding:s="",value:i="",separator:o=!1,tabindex:r=0},l)=>d`
                <vscode-context-menu-item
                  label=${t}
                  keybinding=${s}
                  value=${i}
                  ?separator=${o}
                  ?selected=${l===e}
                  tabindex=${r}
                  @vsc-click=${this._onItemClick}
                  @mouseover=${this._onItemMouseOver}
                  @mouseout=${this._onItemMouseOut}
                  data-index=${l}
                ></vscode-context-menu-item>
              `):d`<slot></slot>`}
      </div>
    `}};oe.styles=Vo;ge([a({type:Array,attribute:!1})],oe.prototype,"data",null);ge([a({type:Boolean,reflect:!0,attribute:"prevent-close"})],oe.prototype,"preventClose",void 0);ge([a({type:Boolean,reflect:!0})],oe.prototype,"show",null);ge([a({type:Number,reflect:!0})],oe.prototype,"tabIndex",void 0);ge([b()],oe.prototype,"_selectedClickableItemIndex",void 0);ge([b()],oe.prototype,"_show",void 0);ge([j(".context-menu")],oe.prototype,"_wrapperEl",void 0);oe=ge([y("vscode-context-menu")],oe);const qi=g({tagName:"vscode-context-menu",elementClass:oe,react:_,displayName:"VscodeContextMenu",events:{onVscContextMenuSelect:"vsc-context-menu-select"}});g({tagName:"vscode-context-menu-item",elementClass:de,react:_,displayName:"VscodeContextMenuItem"});const Bo=[x,m`
    :host {
      display: block;
      margin-bottom: 10px;
      margin-top: 10px;
    }

    div {
      background-color: var(--vscode-foreground, #cccccc);
      height: 1px;
      opacity: 0.4;
    }
  `];var Ss=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Xe=class extends w{constructor(){super(...arguments),this.role="separator"}render(){return d`<div></div>`}};Xe.styles=Bo;Ss([a({reflect:!0})],Xe.prototype,"role",void 0);Xe=Ss([y("vscode-divider")],Xe);const Gi=g({tagName:"vscode-divider",elementClass:Xe,react:_,displayName:"VscodeDivider"}),To=[x,m`
    :host {
      display: block;
      max-width: 727px;
    }
  `];var st=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o},xe;(function(n){n.HORIZONTAL="horizontal",n.VERTICAL="vertical"})(xe||(xe={}));let ve=class extends w{constructor(){super(...arguments),this.breakpoint=490,this._responsive=!1,this._firstUpdateComplete=!1,this._resizeObserverCallbackBound=this._resizeObserverCallback.bind(this)}set responsive(e){this._responsive=e,this._firstUpdateComplete&&(e?this._activateResponsiveLayout():this._deactivateResizeObserver())}get responsive(){return this._responsive}_toggleCompactLayout(e){this._assignedFormGroups.forEach(t=>{t.dataset.originalVariant||(t.dataset.originalVariant=t.variant);const s=t.dataset.originalVariant;e===xe.VERTICAL&&s==="horizontal"?t.variant="vertical":t.variant=s,t.querySelectorAll("vscode-checkbox-group, vscode-radio-group").forEach(o=>{o.dataset.originalVariant||(o.dataset.originalVariant=o.variant);const r=o.dataset.originalVariant;e===xe.HORIZONTAL&&r===xe.HORIZONTAL?o.variant="horizontal":o.variant="vertical"})})}_resizeObserverCallback(e){let t=0;for(const i of e)t=i.contentRect.width;const s=t<this.breakpoint?xe.VERTICAL:xe.HORIZONTAL;s!==this._currentFormGroupLayout&&(this._toggleCompactLayout(s),this._currentFormGroupLayout=s)}_activateResponsiveLayout(){this._resizeObserver=new ResizeObserver(this._resizeObserverCallbackBound),this._resizeObserver.observe(this._wrapperElement)}_deactivateResizeObserver(){this._resizeObserver?.disconnect(),this._resizeObserver=null}firstUpdated(){this._firstUpdateComplete=!0,this._responsive&&this._activateResponsiveLayout()}render(){return d`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};ve.styles=To;st([a({type:Boolean,reflect:!0})],ve.prototype,"responsive",null);st([a({type:Number})],ve.prototype,"breakpoint",void 0);st([j(".wrapper")],ve.prototype,"_wrapperElement",void 0);st([W({selector:"vscode-form-group"})],ve.prototype,"_assignedFormGroups",void 0);ve=st([y("vscode-form-container")],ve);g({tagName:"vscode-form-container",elementClass:ve,react:_,displayName:"VscodeFormContainer"});const zo=[x,m`
    :host {
      --label-right-margin: 14px;
      --label-width: 150px;

      display: block;
      margin: 15px 0;
    }

    :host([variant='settings-group']) {
      margin: 0;
      padding: 12px 14px 18px;
      max-width: 727px;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper,
    :host([variant='settings-group']) .wrapper {
      display: block;
    }

    :host([variant='horizontal']) ::slotted(vscode-checkbox-group),
    :host([variant='horizontal']) ::slotted(vscode-radio-group) {
      width: calc(100% - calc(var(--label-width) + var(--label-right-margin)));
    }

    :host([variant='horizontal']) ::slotted(vscode-label) {
      margin-right: var(--label-right-margin);
      text-align: right;
      width: var(--label-width);
    }

    :host([variant='settings-group']) ::slotted(vscode-label) {
      height: 18px;
      line-height: 18px;
      margin-bottom: 4px;
      margin-right: 0;
      padding: 0;
    }

    ::slotted(vscode-form-helper) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-form-helper),
    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      display: block;
      margin-left: 0;
    }

    :host([variant='settings-group']) ::slotted(vscode-form-helper) {
      margin-bottom: 0;
      margin-top: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-label),
    :host([variant='settings-group']) ::slotted(vscode-label) {
      display: block;
      margin-left: 0;
      text-align: left;
    }

    :host([variant='settings-group']) ::slotted(vscode-inputbox),
    :host([variant='settings-group']) ::slotted(vscode-textfield),
    :host([variant='settings-group']) ::slotted(vscode-textarea),
    :host([variant='settings-group']) ::slotted(vscode-single-select),
    :host([variant='settings-group']) ::slotted(vscode-multi-select) {
      margin-top: 9px;
    }

    ::slotted(vscode-button:first-child) {
      margin-left: calc(var(--label-width) + var(--label-right-margin));
    }

    :host([variant='vertical']) ::slotted(vscode-button) {
      margin-left: 0;
    }

    ::slotted(vscode-button) {
      margin-right: 4px;
    }
  `];var ks=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Ze=class extends w{constructor(){super(...arguments),this.variant="horizontal"}render(){return d`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};Ze.styles=zo;ks([a({reflect:!0})],Ze.prototype,"variant",void 0);Ze=ks([y("vscode-form-group")],Ze);g({tagName:"vscode-form-group",elementClass:Ze,react:_,displayName:"VscodeFormGroup"});const Lo=[x,m`
    :host {
      display: block;
      line-height: 1.4em;
      margin-bottom: 4px;
      margin-top: 4px;
      max-width: 720px;
      opacity: 0.9;
    }

    :host([vertical]) {
      margin-left: 0;
    }
  `];var Do=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const St=new CSSStyleSheet;St.replaceSync(`
  vscode-form-helper * {
    margin: 0;
  }

  vscode-form-helper *:not(:last-child) {
    margin-bottom: 8px;
  }
`);let ut=class extends w{constructor(){super(),this._injectLightDOMStyles()}_injectLightDOMStyles(){document.adoptedStyleSheets.find(t=>t===St)||document.adoptedStyleSheets.push(St)}render(){return d`<slot></slot>`}};ut.styles=Lo;ut=Do([y("vscode-form-helper")],ut);g({tagName:"vscode-form-helper",elementClass:ut,react:_,displayName:"VscodeFormHelper"});const Xi=g({tagName:"vscode-icon",elementClass:Z,react:_,displayName:"VscodeIcon"});let ss=0;const Is=(n="")=>(ss++,`${n}${ss}`),Mo=[x,m`
    :host {
      display: block;
    }

    .wrapper {
      color: var(--vscode-foreground, #cccccc);
      cursor: default;
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: 600;
      line-height: ${yo};
      padding: 5px 0;
    }

    .wrapper.required:after {
      content: ' *';
    }

    ::slotted(.normal) {
      font-weight: normal;
    }

    ::slotted(.lightened) {
      color: var(--vscode-foreground, #cccccc);
      opacity: 0.9;
    }
  `];var mt=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let $e=class extends w{constructor(){super(...arguments),this.required=!1,this._id="",this._htmlFor="",this._connected=!1}set htmlFor(e){this._htmlFor=e,this.setAttribute("for",e),this._connected&&this._connectWithTarget()}get htmlFor(){return this._htmlFor}set id(e){this._id=e}get id(){return this._id}attributeChangedCallback(e,t,s){super.attributeChangedCallback(e,t,s)}connectedCallback(){super.connectedCallback(),this._connected=!0,this._id===""&&(this._id=Is("vscode-label-"),this.setAttribute("id",this._id)),this._connectWithTarget()}_getTarget(){let e=null;if(this._htmlFor){const t=this.getRootNode({composed:!1});t&&(e=t.querySelector(`#${this._htmlFor}`))}return e}async _connectWithTarget(){await this.updateComplete;const e=this._getTarget();["vscode-radio-group","vscode-checkbox-group"].includes(e?.tagName.toLowerCase()??"")&&e.setAttribute("aria-labelledby",this._id);let t="";this.textContent&&(t=this.textContent.trim()),e&&"label"in e&&["vscode-textfield","vscode-textarea","vscode-single-select","vscode-multi-select"].includes(e?.tagName.toLowerCase()??"")&&(e.label=t)}_handleClick(){const e=this._getTarget();e&&"focus"in e&&e.focus()}render(){return d`
      <label
        class=${$({wrapper:!0,required:this.required})}
        @click=${this._handleClick}
        ><slot></slot
      ></label>
    `}};$e.styles=Mo;mt([a({reflect:!0,attribute:"for"})],$e.prototype,"htmlFor",null);mt([a()],$e.prototype,"id",null);mt([a({type:Boolean,reflect:!0})],$e.prototype,"required",void 0);$e=mt([y("vscode-label")],$e);const Ji=g({tagName:"vscode-label",elementClass:$e,react:_,displayName:"VscodeLabel"}),ft=d`
  <span class="icon">
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"
      />
    </svg>
  </span>
`,Ho=so`<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
  fill="currentColor"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"
  />
</svg>`;const{I:Fo}=co,os=()=>document.createComment(""),Ne=(n,e,t)=>{const s=n._$AA.parentNode,i=e===void 0?n._$AB:e._$AA;if(t===void 0){const o=s.insertBefore(os(),i),r=s.insertBefore(os(),i);t=new Fo(o,r,n,n.options)}else{const o=t._$AB.nextSibling,r=t._$AM,l=r!==n;if(l){let c;t._$AQ?.(n),t._$AM=n,t._$AP!==void 0&&(c=n._$AU)!==r._$AU&&t._$AP(c)}if(o!==i||l){let c=t._$AA;for(;c!==o;){const h=c.nextSibling;s.insertBefore(c,i),c=h}}}return t},ye=(n,e,t=n)=>(n._$AI(e,t),n),No={},jo=(n,e=No)=>n._$AH=e,qo=n=>n._$AH,$t=n=>{n._$AR(),n._$AA.remove()};const is=(n,e,t)=>{const s=new Map;for(let i=e;i<=t;i++)s.set(n[i],i);return s},Uo=Dt(class extends Mt{constructor(n){if(super(n),n.type!==Lt.CHILD)throw Error("repeat() can only be used in text expressions")}dt(n,e,t){let s;t===void 0?t=e:e!==void 0&&(s=e);const i=[],o=[];let r=0;for(const l of n)i[r]=s?s(l,r):r,o[r]=t(l,r),r++;return{values:o,keys:i}}render(n,e,t){return this.dt(n,e,t).values}update(n,[e,t,s]){const i=qo(n),{values:o,keys:r}=this.dt(e,t,s);if(!Array.isArray(i))return this.ut=r,o;const l=this.ut??=[],c=[];let h,f,p=0,I=i.length-1,v=0,S=o.length-1;for(;p<=I&&v<=S;)if(i[p]===null)p++;else if(i[I]===null)I--;else if(l[p]===r[v])c[v]=ye(i[p],o[v]),p++,v++;else if(l[I]===r[S])c[S]=ye(i[I],o[S]),I--,S--;else if(l[p]===r[S])c[S]=ye(i[p],o[S]),Ne(n,c[S+1],i[p]),p++,S--;else if(l[I]===r[v])c[v]=ye(i[I],o[v]),Ne(n,i[p],i[I]),I--,v++;else if(h===void 0&&(h=is(r,v,S),f=is(l,p,I)),h.has(l[p]))if(h.has(l[I])){const te=f.get(r[v]),wt=te!==void 0?i[te]:null;if(wt===null){const Nt=Ne(n,i[p]);ye(Nt,o[v]),c[v]=Nt}else c[v]=ye(wt,o[v]),Ne(n,i[p],wt),i[te]=null;v++}else $t(i[I]),I--;else $t(i[p]),p++;for(;v<=S;){const te=Ne(n,c[S+1]);ye(te,o[v]),c[v++]=te}for(;p<=I;){const te=i[p++];te!==null&&$t(te)}return this.ut=r,jo(n,c),ie}});function Go(n,e,t){return n?e(n):t?.(n)}var ot=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let be=class extends w{constructor(){super(...arguments),this.description="",this.selected=!1,this.disabled=!1,this._initialized=!1,this._handleSlotChange=()=>{this._initialized&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._initialized=!0})}willUpdate(e){this._initialized&&(e.has("description")||e.has("value")||e.has("selected")||e.has("disabled"))&&this.dispatchEvent(new Event("vsc-option-state-change",{bubbles:!0}))}render(){return d`<slot @slotchange=${this._handleSlotChange}></slot>`}};be.styles=x;ot([a({type:String})],be.prototype,"value",void 0);ot([a({type:String})],be.prototype,"description",void 0);ot([a({type:Boolean,reflect:!0})],be.prototype,"selected",void 0);ot([a({type:Boolean,reflect:!0})],be.prototype,"disabled",void 0);be=ot([y("vscode-option")],be);const Es=(n,e)=>{const t={match:!1,ranges:[]},s=n.toLowerCase(),i=e.toLowerCase(),o=s.split(" ");let r=0;return o.forEach((l,c)=>{if(c>0&&(r+=o[c-1].length+1),t.match)return;const h=l.indexOf(i),f=i.length;h===0&&(t.match=!0,t.ranges.push([r+h,Math.min(r+h+f,n.length)]))}),t},Os=(n,e)=>{const t={match:!1,ranges:[]};return n.toLowerCase().indexOf(e.toLowerCase())===0&&(t.match=!0,t.ranges=[[0,e.length]]),t},Ps=(n,e)=>{const t={match:!1,ranges:[]},s=n.toLowerCase().indexOf(e.toLowerCase());return s>-1&&(t.match=!0,t.ranges=[[s,s+e.length]]),t},As=(n,e)=>{const t={match:!1,ranges:[]};let s=0,i=0;const o=e.length-1,r=n.toLowerCase(),l=e.toLowerCase();for(let c=0;c<=o;c++){if(i=r.indexOf(l[c],s),i===-1)return{match:!1,ranges:[]};t.match=!0,t.ranges.push([i,i+1]),s=i+1}return t},Wo=(n,e,t)=>{const s=[];return n.forEach(i=>{let o;switch(t){case"startsWithPerTerm":o=Es(i.label,e);break;case"startsWith":o=Os(i.label,e);break;case"contains":o=Ps(i.label,e);break;default:o=As(i.label,e)}o.match&&s.push({...i,ranges:o.ranges})}),s},nt=n=>{const e=[];return n===" "?(e.push(d`&nbsp;`),e):(n.indexOf(" ")===0&&e.push(d`&nbsp;`),e.push(d`${n.trimStart().trimEnd()}`),n.lastIndexOf(" ")===n.length-1&&e.push(d`&nbsp;`),e)},Ko=(n,e)=>{const t=[],s=e.length;return s<1?d`${n}`:(e.forEach((i,o)=>{const r=n.substring(i[0],i[1]);o===0&&i[0]!==0&&t.push(...nt(n.substring(0,e[0][0]))),o>0&&o<s&&i[0]-e[o-1][1]!==0&&t.push(...nt(n.substring(e[o-1][1],i[0]))),t.push(d`<b>${nt(r)}</b>`),o===s-1&&i[1]<n.length&&t.push(...nt(n.substring(i[1],n.length)))}),t)};class Yo{constructor(e){this._activeIndex=-1,this._options=[],this._filterPattern="",this._filterMethod="fuzzy",this._combobox=!1,this._indexByValue=new Map,this._indexByLabel=new Map,this._selectedIndex=-1,this._selectedIndexes=new Set,this._multiSelect=!1,this._numOfVisibleOptions=0,(this._host=e).addController(this)}hostConnected(){}get activeIndex(){return this._activeIndex}set activeIndex(e){this._activeIndex=e,this._host.requestUpdate()}get relativeActiveIndex(){return this._options[this._activeIndex]?.filteredIndex??-1}set comboboxMode(e){this._combobox=e,this._host.requestUpdate()}get comboboxMode(){return this._combobox}get multiSelect(){return this._multiSelect}set multiSelect(e){this._selectedIndex=-1,this._selectedIndexes.clear(),this._multiSelect=e,this._host.requestUpdate()}get selectedIndex(){return this._selectedIndex}set selectedIndex(e){this._selectedIndex!==-1&&this._options[this._selectedIndex]&&(this._options[this._selectedIndex].selected??=!1);const t=this.getOptionByIndex(e);this._selectedIndex=t?e:-1,this._host.requestUpdate()}get selectedIndexes(){return Array.from(this._selectedIndexes)}set selectedIndexes(e){this._selectedIndexes.forEach(t=>{this._options[t].selected=!1}),this._selectedIndexes=new Set(e),e.forEach(t=>{this._options[t]!==void 0&&(this._options[t].selected=!0)}),this._host.requestUpdate()}set value(e){if(this._multiSelect){const t=e.map(s=>this._indexByValue.get(s)).filter(s=>s!==void 0);this._selectedIndexes=new Set(t)}else this._selectedIndex=this._indexByValue.get(e)??-1;this._host.requestUpdate()}get value(){return this._multiSelect?this._selectedIndexes.size>0?Array.from(this._selectedIndexes).filter(e=>e>=0&&e<this._options.length).map(e=>this._options[e].value):[]:this._selectedIndex>-1&&this._selectedIndex<this._options.length?this._options[this._selectedIndex].value:""}set multiSelectValue(e){const t=e.map(s=>this._indexByValue.get(s)).filter(s=>s!==void 0);this._selectedIndexes=new Set(t)}get multiSelectValue(){return this._selectedIndexes.size>0?Array.from(this._selectedIndexes).map(e=>this._options[e].value):[]}get filterPattern(){return this._filterPattern}set filterPattern(e){e!==this._filterPattern&&(this._filterPattern=e,this._updateState())}get filterMethod(){return this._filterMethod}set filterMethod(e){e!==this._filterMethod&&(this._filterMethod=e,this._updateState())}get options(){return this._options}get numOfVisibleOptions(){return this._numOfVisibleOptions}get numOptions(){return this._options.length}populate(e){this._indexByValue.clear(),this._indexByLabel.clear(),this._options=e.map((t,s)=>(this._indexByValue.set(t.value??"",s),this._indexByLabel.set(t.label??"",s),{description:t.description??"",disabled:t.disabled??!1,label:t.label??"",selected:t.selected??!1,value:t.value??"",index:s,filteredIndex:s,ranges:[],visible:!0})),this._numOfVisibleOptions=this._options.length}add(e){const t=this._options.length,{description:s,disabled:i,label:o,selected:r,value:l}=e;let c=!0,h=[];if(this._combobox&&this._filterPattern!==""){const f=this._searchByPattern(o??"");c=f.match,h=f.ranges}this._indexByValue.set(l??"",t),this._indexByLabel.set(o??"",t),r&&(this._selectedIndex=t,this._selectedIndexes.add(t),this._activeIndex=t),this._options.push({index:t,filteredIndex:t,description:s??"",disabled:i??!1,label:o??"",selected:r??!1,value:l??"",visible:c,ranges:h}),c&&(this._numOfVisibleOptions+=1)}clear(){this._options=[],this._indexByValue.clear(),this._indexByLabel.clear(),this._numOfVisibleOptions=0,this._selectedIndex=-1,this._selectedIndexes.clear(),this._activeIndex=-1}getIsIndexSelected(e){return this._multiSelect?this._selectedIndexes.has(e):this._selectedIndex===e}expandMultiSelection(e){e.forEach(t=>{const s=this._indexByValue.get(t)??-1;s!==-1&&this._selectedIndexes.add(s)}),this._host.requestUpdate()}toggleActiveMultiselectOption(){const e=this._options[this._activeIndex]??null;if(!e)return;this._selectedIndexes.has(e.index)?this._selectedIndexes.delete(e.index):this._selectedIndexes.add(e.index),this._host.requestUpdate()}toggleOptionSelected(e){const t=this._selectedIndexes.has(e);this._options[e].selected=!this._options[e].selected,t?this._selectedIndexes.delete(e):this._selectedIndexes.add(e),this._host.requestUpdate()}getActiveOption(){return this._options[this._activeIndex]??null}getSelectedOption(){return this._options[this._selectedIndex]??null}getOptionByIndex(e){return this._options[e]??null}findOptionIndex(e){return this._indexByValue.get(e)??-1}getOptionByValue(e,t=!1){const s=this._indexByValue.get(e)??-1;return s===-1?null:t?this._options[s]:this._options[s].visible?this._options[s]:null}getOptionByLabel(e){const t=this._indexByLabel.get(e)??-1;return t===-1?null:this._options[t]}next(e){const t=e??this._activeIndex;let s=-1;for(let i=t+1;i<this._options.length;i++)if(this._options[i]&&!this._options[i].disabled&&this._options[i].visible){s=i;break}return s>-1?this._options[s]:null}prev(e){const t=e??this._activeIndex;let s=-1;for(let i=t-1;i>=0;i--)if(this._options[i]&&!this._options[i].disabled&&this._options[i].visible){s=i;break}return s>-1?this._options[s]:null}activateDefault(){if(this._multiSelect){if(this._selectedIndexes.size>0){const t=this._selectedIndexes.values().next();this._activeIndex=t.value?t.value:0}}else this._selectedIndex>-1?this._activeIndex=this._selectedIndex:this._activeIndex=0;this._host.requestUpdate()}selectAll(){this._multiSelect&&(this._options.forEach((e,t)=>{this._options[t].selected=!0,this._selectedIndexes.add(t)}),this._host.requestUpdate())}selectNone(){this._multiSelect&&(this._options.forEach((e,t)=>{this._options[t].selected=!1}),this._selectedIndexes.clear(),this._host.requestUpdate())}_searchByPattern(e){let t;switch(this._filterMethod){case"startsWithPerTerm":t=Es(e,this._filterPattern);break;case"startsWith":t=Os(e,this._filterPattern);break;case"contains":t=Ps(e,this._filterPattern);break;default:t=As(e,this._filterPattern)}return t}_updateState(){if(!this._combobox||this._filterPattern==="")this._options.forEach((e,t)=>{this._options[t].visible=!0,this._options[t].ranges=[]}),this._numOfVisibleOptions=this._options.length;else{let e=-1;this._numOfVisibleOptions=0,this._options.forEach(({label:t},s)=>{const i=this._searchByPattern(t);this._options[s].visible=i.match,this._options[s].ranges=i.ranges,this._options[s].filteredIndex=i.match?++e:-1,i.match&&(this._numOfVisibleOptions+=1)})}this._host.requestUpdate()}}const Xo=[x,m`
    :host {
      display: block;
      position: relative;
    }

    .scrollable-container {
      height: 100%;
      overflow: auto;
    }

    .scrollable-container::-webkit-scrollbar {
      cursor: default;
      width: 0;
    }

    .scrollable-container {
      scrollbar-width: none;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      height: 3px;
      left: 0;
      pointer-events: none;
      position: absolute;
      top: 0;
      z-index: 1;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    .scrollbar-track {
      height: 100%;
      position: absolute;
      right: 0;
      top: 0;
      width: 10px;
      z-index: 100;
    }

    .scrollbar-track.hidden {
      display: none;
    }

    .scrollbar-thumb {
      background-color: transparent;
      min-height: var(--min-thumb-height, 20px);
      opacity: 0;
      position: absolute;
      right: 0;
      width: 10px;
    }

    .scrollbar-thumb.visible {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 1;
      transition: opacity 100ms;
    }

    .scrollbar-thumb.fade {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
      opacity: 0;
      transition: opacity 800ms;
    }

    .scrollbar-thumb.visible:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    .scrollbar-thumb.visible.active,
    .scrollbar-thumb.visible.active:hover {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    .prevent-interaction {
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      position: absolute;
      z-index: 99;
    }

    .content {
      overflow: hidden;
    }
  `];var N=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let z=class extends w{set scrollPos(e){this._scrollPos=this._limitScrollPos(e),this._updateScrollbar(),this._updateThumbPosition(),this.requestUpdate()}get scrollPos(){return this._scrollPos}get scrollMax(){return this._scrollableContainer?this._scrollableContainer.scrollHeight-this._scrollableContainer.clientHeight:0}constructor(){super(),this.alwaysVisible=!1,this.fastScrollSensitivity=5,this.minThumbSize=20,this.mouseWheelScrollSensitivity=1,this.shadow=!0,this.scrolled=!1,this._scrollPos=0,this._isDragging=!1,this._thumbHeight=0,this._thumbY=0,this._thumbVisible=!1,this._thumbFade=!1,this._thumbActive=!1,this._componentHeight=0,this._contentHeight=0,this._scrollThumbStartY=0,this._mouseStartY=0,this._scrollbarVisible=!0,this._scrollbarTrackZ=0,this._resizeObserverCallback=()=>{this._componentHeight=this.offsetHeight,this._contentHeight=this._contentElement.offsetHeight,this._updateScrollbar(),this._updateThumbPosition()},this._handleSlotChange=()=>{this._updateScrollbar(),this._updateThumbPosition(),this._zIndexFix()},this._handleScrollThumbMouseMove=e=>{const t=this._scrollThumbStartY+(e.screenY-this._mouseStartY);this._thumbY=this._limitThumbPos(t),this.scrollPos=this._calculateScrollPosFromThumbPos(this._thumbY),this.dispatchEvent(new CustomEvent("vsc-scrollable-scroll",{detail:this.scrollPos}))},this._handleScrollThumbMouseUp=e=>{this._isDragging=!1,this._thumbActive=!1;const t=this.getBoundingClientRect(),{x:s,y:i,width:o,height:r}=t,{pageX:l,pageY:c}=e;(l>s+o||l<s||c>i+r||c<i)&&(this._thumbFade=!0,this._thumbVisible=!1),document.removeEventListener("mousemove",this._handleScrollThumbMouseMove),document.removeEventListener("mouseup",this._handleScrollThumbMouseUp)},this._handleComponentMouseOver=()=>{this._thumbVisible=!0,this._thumbFade=!1},this._handleComponentMouseOut=()=>{this._thumbActive||(this._thumbVisible=!1,this._thumbFade=!0)},this._handleComponentWheel=e=>{if(this._contentHeight<=this._componentHeight)return;e.preventDefault();const t=e.altKey?this.mouseWheelScrollSensitivity*this.fastScrollSensitivity:this.mouseWheelScrollSensitivity;this.scrollPos=this._limitScrollPos(this.scrollPos+e.deltaY*t),this.dispatchEvent(new CustomEvent("vsc-scrollable-scroll",{detail:this.scrollPos}))},this._handleScrollableContainerScroll=e=>{e.currentTarget&&(this.scrollPos=e.currentTarget.scrollTop)},this.addEventListener("mouseover",this._handleComponentMouseOver),this.addEventListener("mouseout",this._handleComponentMouseOut),this.addEventListener("wheel",this._handleComponentWheel)}connectedCallback(){super.connectedCallback(),this._hostResizeObserver=new ResizeObserver(this._resizeObserverCallback),this._contentResizeObserver=new ResizeObserver(this._resizeObserverCallback),this.requestUpdate(),this.updateComplete.then(()=>{this._hostResizeObserver.observe(this),this._contentResizeObserver.observe(this._contentElement),this._updateThumbPosition()})}disconnectedCallback(){super.disconnectedCallback(),this._hostResizeObserver.unobserve(this),this._hostResizeObserver.disconnect(),this._contentResizeObserver.unobserve(this._contentElement),this._contentResizeObserver.disconnect()}firstUpdated(e){this._updateThumbPosition()}_calcThumbHeight(){const e=this.offsetHeight,t=this._contentElement?.offsetHeight??0,s=e*(e/t);return Math.max(this.minThumbSize,s)}_updateScrollbar(){const e=this._contentElement?.offsetHeight??0;this.offsetHeight>=e?this._scrollbarVisible=!1:(this._scrollbarVisible=!0,this._thumbHeight=this._calcThumbHeight()),this.requestUpdate()}_zIndexFix(){let e=0;this._assignedElements.forEach(t=>{if("style"in t){const s=window.getComputedStyle(t).zIndex;/([0-9-])+/g.test(s)&&(e=Number(s)>e?Number(s):e)}}),this._scrollbarTrackZ=e+1,this.requestUpdate()}_updateThumbPosition(){if(!this._scrollableContainer)return;this.scrolled=this.scrollPos>0;const e=this.offsetHeight,t=this._thumbHeight,i=this._contentElement.offsetHeight-e,o=this.scrollPos/i,r=e-t;this._thumbY=Math.min(o*(e-t),r)}_calculateScrollPosFromThumbPos(e){const t=this.getBoundingClientRect().height,s=this._scrollThumbElement.getBoundingClientRect().height,i=this._contentElement.getBoundingClientRect().height,o=e/(t-s)*(i-t);return this._limitScrollPos(o)}_limitScrollPos(e){return e<0?0:e>this.scrollMax?this.scrollMax:e}_limitThumbPos(e){const t=this.getBoundingClientRect().height,s=this._scrollThumbElement.getBoundingClientRect().height;return e<0?0:e>t-s?t-s:e}_handleScrollThumbMouseDown(e){const t=this.getBoundingClientRect(),s=this._scrollThumbElement.getBoundingClientRect();this._mouseStartY=e.screenY,this._scrollThumbStartY=s.top-t.top,this._isDragging=!0,this._thumbActive=!0,document.addEventListener("mousemove",this._handleScrollThumbMouseMove),document.addEventListener("mouseup",this._handleScrollThumbMouseUp)}_handleScrollbarTrackPress(e){e.target===e.currentTarget&&(this._thumbY=e.offsetY-this._thumbHeight/2,this.scrollPos=this._calculateScrollPosFromThumbPos(this._thumbY))}render(){return d`
      <div
        class="scrollable-container"
        .style=${U({userSelect:this._isDragging?"none":"auto"})}
        .scrollTop=${this.scrollPos}
        @scroll=${this._handleScrollableContainerScroll}
      >
        <div
          class=${$({shadow:!0,visible:this.scrolled})}
          .style=${U({zIndex:String(this._scrollbarTrackZ)})}
        ></div>
        ${this._isDragging?d`<div class="prevent-interaction"></div>`:u}
        <div
          class=${$({"scrollbar-track":!0,hidden:!this._scrollbarVisible})}
          @mousedown=${this._handleScrollbarTrackPress}
        >
          <div
            class=${$({"scrollbar-thumb":!0,visible:this.alwaysVisible?!0:this._thumbVisible,fade:this.alwaysVisible?!1:this._thumbFade,active:this._thumbActive})}
            .style=${U({height:`${this._thumbHeight}px`,top:`${this._thumbY}px`})}
            @mousedown=${this._handleScrollThumbMouseDown}
          ></div>
        </div>
        <div class="content">
          <slot @slotchange=${this._handleSlotChange}></slot>
        </div>
      </div>
    `}};z.styles=Xo;N([a({type:Boolean,reflect:!0,attribute:"always-visible"})],z.prototype,"alwaysVisible",void 0);N([a({type:Number,attribute:"fast-scroll-sensitivity"})],z.prototype,"fastScrollSensitivity",void 0);N([a({type:Number,attribute:"min-thumb-size"})],z.prototype,"minThumbSize",void 0);N([a({type:Number,attribute:"mouse-wheel-scroll-sensitivity"})],z.prototype,"mouseWheelScrollSensitivity",void 0);N([a({type:Boolean,reflect:!0})],z.prototype,"shadow",void 0);N([a({type:Boolean,reflect:!0})],z.prototype,"scrolled",void 0);N([a({type:Number,attribute:"scroll-pos"})],z.prototype,"scrollPos",null);N([b()],z.prototype,"_isDragging",void 0);N([b()],z.prototype,"_thumbHeight",void 0);N([b()],z.prototype,"_thumbY",void 0);N([b()],z.prototype,"_thumbVisible",void 0);N([b()],z.prototype,"_thumbFade",void 0);N([b()],z.prototype,"_thumbActive",void 0);N([j(".content")],z.prototype,"_contentElement",void 0);N([j(".scrollbar-thumb",!0)],z.prototype,"_scrollThumbElement",void 0);N([j(".scrollable-container")],z.prototype,"_scrollableContainer",void 0);N([W()],z.prototype,"_assignedElements",void 0);z=N([y("vscode-scrollable")],z);var T=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const rt=10,ae=22;class P extends w{set combobox(e){this._opts.comboboxMode=e}get combobox(){return this._opts.comboboxMode}set disabled(e){this._disabled=e,this.ariaDisabled=e?"true":"false",e===!0?(this._originalTabIndex=this.tabIndex,this.tabIndex=-1):(this.tabIndex=this._originalTabIndex??0,this._originalTabIndex=void 0),this.requestUpdate()}get disabled(){return this._disabled}set filter(e){const t=["contains","fuzzy","startsWith","startsWithPerTerm"];let s;t.includes(e)?s=e:(console.warn(`[VSCode Webview Elements] Invalid filter: "${e}", fallback to default. Valid values are: "contains", "fuzzy", "startsWith", "startsWithPerm".`,this),s="fuzzy"),this._opts.filterMethod=s}get filter(){return this._opts.filterMethod}set options(e){this._opts.populate(e)}get options(){return this._opts.options.map(({label:e,value:t,description:s,selected:i,disabled:o})=>({label:e,value:t,description:s,selected:i,disabled:o}))}constructor(){super(),this.creatable=!1,this.label="",this.invalid=!1,this.focused=!1,this.open=!1,this.position="below",this._opts=new Yo(this),this._firstUpdateCompleted=!1,this._currentDescription="",this._filter="fuzzy",this._selectedIndexes=[],this._options=[],this._value="",this._values=[],this._isPlaceholderOptionActive=!1,this._isBeingFiltered=!1,this._optionListScrollPos=0,this._isHoverForbidden=!1,this._disabled=!1,this._originalTabIndex=void 0,this._onMouseMove=()=>{this._isHoverForbidden=!1,window.removeEventListener("mousemove",this._onMouseMove)},this._onOptionListScroll=e=>{this._optionListScrollPos=e.detail},this._onComponentKeyDown=e=>{[" ","ArrowUp","ArrowDown","Escape"].includes(e.key)&&(e.stopPropagation(),e.preventDefault()),e.key==="Enter"&&this._onEnterKeyDown(e),e.key===" "&&this._onSpaceKeyDown(),e.key==="Escape"&&this._onEscapeKeyDown(),e.key==="ArrowUp"&&this._onArrowUpKeyDown(),e.key==="ArrowDown"&&this._onArrowDownKeyDown()},this._onComponentFocus=()=>{this.focused=!0},this._onComponentBlur=()=>{this.focused=!1},this._handleWindowScroll=()=>{this.open=!1},this.addEventListener("vsc-option-state-change",e=>{e.stopPropagation(),this._setStateFromSlottedElements(),this.requestUpdate()})}connectedCallback(){super.connectedCallback(),this.addEventListener("keydown",this._onComponentKeyDown),this.addEventListener("focus",this._onComponentFocus),this.addEventListener("blur",this._onComponentBlur),this._setAutoFocus()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener("keydown",this._onComponentKeyDown),this.removeEventListener("focus",this._onComponentFocus),this.removeEventListener("blur",this._onComponentBlur)}firstUpdated(e){this._firstUpdateCompleted=!0}willUpdate(e){e.has("required")&&this._firstUpdateCompleted&&this._manageRequired(),e.has("open")&&this._firstUpdateCompleted&&(this.open?(this._dropdownEl.showPopover(),window.addEventListener("scroll",this._handleWindowScroll,{capture:!0}),this._opts.activateDefault(),this._scrollActiveElementToTop()):(this._dropdownEl.hidePopover(),window.removeEventListener("scroll",this._handleWindowScroll)))}get _filteredOptions(){return!this.combobox||this._opts.filterPattern===""?this._options:Wo(this._options,this._opts.filterPattern,this._filter)}_setAutoFocus(){this.hasAttribute("autofocus")&&(this.tabIndex<0&&(this.tabIndex=0),this.combobox?this.updateComplete.then(()=>{this.shadowRoot?.querySelector(".combobox-input").focus()}):this.updateComplete.then(()=>{this.shadowRoot?.querySelector(".select-face").focus()}))}get _isSuggestedOptionVisible(){if(!(this.combobox&&this.creatable))return!1;const e=this._opts.getOptionByValue(this._opts.filterPattern)!==null,t=this._opts.filterPattern.length>0;return!e&&t}_manageRequired(){}_setStateFromSlottedElements(){const e=this._assignedOptions??[];this._opts.clear(),e.forEach(t=>{const{innerText:s,description:i,disabled:o}=t,r=typeof t.value=="string"?t.value:s.trim(),l=t.selected??!1,c={label:s.trim(),value:r,description:i,selected:l,disabled:o};this._opts.add(c)})}_createSuggestedOption(){const e=this._opts.numOptions,t=document.createElement("vscode-option");return t.value=this._opts.filterPattern,xs(this._opts.filterPattern,t),this.appendChild(t),e}_dispatchChangeEvent(){this.dispatchEvent(new Event("change")),this.dispatchEvent(new Event("input"))}async _createAndSelectSuggestedOption(){}_toggleComboboxDropdown(){this._opts.filterPattern="",this.open=!this.open}_scrollActiveElementToTop(){this._optionListScrollPos=Math.floor(this._opts.relativeActiveIndex*ae)}async _adjustOptionListScrollPos(e,t){let s=this._opts.numOfVisibleOptions;if(this._isSuggestedOptionVisible&&(s+=1),s<=rt)return;this._isHoverForbidden=!0,window.addEventListener("mousemove",this._onMouseMove);const o=this._optionListScrollPos,r=t*ae,l=r>=o&&r<=o+rt*ae-ae;e==="down"&&(l||(this._optionListScrollPos=t*ae-(rt-1)*ae)),e==="up"&&(l||(this._optionListScrollPos=Math.floor(this._opts.relativeActiveIndex*ae)))}_onFaceClick(){this.open=!this.open}_handleDropdownToggle(e){this.open=e.newState==="open"}_onComboboxButtonClick(){this._toggleComboboxDropdown()}_onComboboxButtonKeyDown(e){e.key==="Enter"&&this._toggleComboboxDropdown()}_onOptionMouseOver(e){if(this._isHoverForbidden)return;const t=e.target;t.matches(".option")&&(t.matches(".placeholder")?(this._isPlaceholderOptionActive=!0,this._opts.activeIndex=-1):(this._isPlaceholderOptionActive=!1,this._opts.activeIndex=+t.dataset.index))}_onPlaceholderOptionMouseOut(){this._isPlaceholderOptionActive=!1}_onNoOptionsClick(e){e.stopPropagation()}_onEnterKeyDown(e){this._isBeingFiltered=!1,e?.composedPath&&e.composedPath().find(s=>s.matches?s.matches("vscode-button.button-accept"):!1)}_onSpaceKeyDown(){if(!this.open){this.open=!0;return}}_onArrowUpKeyDown(){if(this.open){if(this._opts.activeIndex<=0&&!(this.combobox&&this.creatable))return;if(this._isPlaceholderOptionActive){const e=this._opts.numOfVisibleOptions-1;this._opts.activeIndex=e,this._isPlaceholderOptionActive=!1}else{const e=this._opts.prev();if(e!==null){this._opts.activeIndex=e?.index??-1;const t=e?.filteredIndex??-1;t>-1&&this._adjustOptionListScrollPos("up",t)}}}else this.open=!0,this._opts.activateDefault()}_onArrowDownKeyDown(){let e=this._opts.numOfVisibleOptions;const t=this._isSuggestedOptionVisible;if(t&&(e+=1),this.open){if(this._isPlaceholderOptionActive&&this._opts.activeIndex===-1)return;const s=this._opts.next();if(t&&s===null)this._isPlaceholderOptionActive=!0,this._adjustOptionListScrollPos("down",e-1),this._opts.activeIndex=-1;else if(s!==null){const i=s?.filteredIndex??-1;this._opts.activeIndex=s?.index??-1,i>-1&&this._adjustOptionListScrollPos("down",i)}}else this.open=!0,this._opts.activateDefault()}_onEscapeKeyDown(){this.open=!1}_onSlotChange(){this._setStateFromSlottedElements(),this.requestUpdate()}_onComboboxInputFocus(e){e.target.select(),this._isBeingFiltered=!1,this._opts.filterPattern=""}_onComboboxInputBlur(){this._isBeingFiltered=!1}_onComboboxInputInput(e){this._isBeingFiltered=!0,this._opts.filterPattern=e.target.value,this._opts.activeIndex=-1,this.open=!0}_onComboboxInputClick(){this._isBeingFiltered=this._opts.filterPattern!=="",this.open=!0}_onComboboxInputSpaceKeyDown(e){e.key===" "&&e.stopPropagation()}_onOptionClick(e){this._isBeingFiltered=!1}_renderCheckbox(e,t){return d`<span class=${$({"checkbox-icon":!0,checked:e})}>${Ho}</span
      ><span class="option-label">${t}</span>`}_renderOptions(){const e=this._opts.options;return d`
      <ul
        aria-label=${C(this.label??void 0)}
        aria-multiselectable=${C(this._opts.multiSelect?"true":void 0)}
        class="options"
        id="select-listbox"
        role="listbox"
        tabindex="-1"
        @click=${this._onOptionClick}
        @mouseover=${this._onOptionMouseOver}
      >
        ${Uo(e,t=>t.index,(t,s)=>{if(!t.visible)return u;const i=t.index===this._opts.activeIndex&&!t.disabled,o=this._opts.getIsIndexSelected(t.index),r={active:i,disabled:t.disabled,option:!0,"single-select":!this._opts.multiSelect,"multi-select":this._opts.multiSelect,selected:o},l=t.ranges?.length??!1?Ko(t.label,t.ranges??[]):t.label;return d`
              <li
                aria-selected=${o?"true":"false"}
                class=${$(r)}
                data-index=${t.index}
                data-filtered-index=${s}
                id=${`op-${t.index}`}
                role="option"
                tabindex="-1"
              >
                ${Go(this._opts.multiSelect,()=>this._renderCheckbox(o,l),()=>l)}
              </li>
            `})}
        ${this._renderPlaceholderOption(this._opts.numOfVisibleOptions<1)}
      </ul>
    `}_renderPlaceholderOption(e){return!this.combobox||this._opts.getOptionByLabel(this._opts.filterPattern)?u:this.creatable&&this._opts.filterPattern.length>0?d`<li
        class=${$({option:!0,placeholder:!0,active:this._isPlaceholderOptionActive})}
        @mouseout=${this._onPlaceholderOptionMouseOut}
      >
        Add "${this._opts.filterPattern}"
      </li>`:e?d`<li class="no-options" @click=${this._onNoOptionsClick}>
            No options
          </li>`:u}_renderDescription(){const e=this._opts.getActiveOption();if(!e)return u;const{description:t}=e;return t?d`<div class="description">${t}</div>`:u}_renderSelectFace(){return d`${u}`}_renderComboboxFace(){return d`${u}`}_renderDropdownControls(){return d`${u}`}_renderDropdown(){const e={dropdown:!0,multiple:this._opts.multiSelect,open:this.open},t=this._isSuggestedOptionVisible||this._opts.numOfVisibleOptions===0?this._opts.numOfVisibleOptions+1:this._opts.numOfVisibleOptions,s=Math.min(t*ae,rt*ae),i=this.getBoundingClientRect(),o={width:`${i.width}px`,left:`${i.left}px`,top:this.position==="below"?`${i.top+i.height}px`:"unset",bottom:this.position==="below"?"unset":`${document.documentElement.clientHeight-i.top}px`};return d`
      <div
        class=${$(e)}
        popover="auto"
        @toggle=${this._handleDropdownToggle}
        .style=${U(o)}
      >
        ${this.position==="above"?this._renderDescription():u}
        <vscode-scrollable
          always-visible
          class="scrollable"
          min-thumb-size="40"
          tabindex="-1"
          @vsc-scrollable-scroll=${this._onOptionListScroll}
          .scrollPos=${this._optionListScrollPos}
          .style=${U({height:`${s}px`})}
        >
          ${this._renderOptions()} ${this._renderDropdownControls()}
        </vscode-scrollable>
        ${this.position==="below"?this._renderDescription():u}
      </div>
    `}}T([a({type:Boolean,reflect:!0})],P.prototype,"creatable",void 0);T([a({type:Boolean,reflect:!0})],P.prototype,"combobox",null);T([a({reflect:!0})],P.prototype,"label",void 0);T([a({type:Boolean,reflect:!0})],P.prototype,"disabled",null);T([a({type:Boolean,reflect:!0})],P.prototype,"invalid",void 0);T([a()],P.prototype,"filter",null);T([a({type:Boolean,reflect:!0})],P.prototype,"focused",void 0);T([a({type:Boolean,reflect:!0})],P.prototype,"open",void 0);T([a({type:Array})],P.prototype,"options",null);T([a({reflect:!0})],P.prototype,"position",void 0);T([W({flatten:!0,selector:"vscode-option"})],P.prototype,"_assignedOptions",void 0);T([j(".dropdown",!0)],P.prototype,"_dropdownEl",void 0);T([b()],P.prototype,"_currentDescription",void 0);T([b()],P.prototype,"_filter",void 0);T([b()],P.prototype,"_filteredOptions",null);T([b()],P.prototype,"_selectedIndexes",void 0);T([b()],P.prototype,"_options",void 0);T([b()],P.prototype,"_value",void 0);T([b()],P.prototype,"_values",void 0);T([b()],P.prototype,"_isPlaceholderOptionActive",void 0);T([b()],P.prototype,"_isBeingFiltered",void 0);T([b()],P.prototype,"_optionListScrollPos",void 0);const Rs=[x,m`
    :host {
      display: inline-block;
      max-width: 100%;
      outline: none;
      position: relative;
      width: 320px;
    }

    .main-slot {
      display: none;
    }

    .select-face,
    .combobox-face {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-dropdownForeground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      position: relative;
      user-select: none;
      width: 100%;
    }

    :host([invalid]) .select-face,
    :host(:invalid) .select-face,
    :host([invalid]) .combobox-face,
    :host(:invalid) .combobox-face {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .select-face {
      cursor: pointer;
      display: block;
      padding: 3px 4px;
    }

    .select-face .text {
      display: block;
      height: 18px;
      overflow: hidden;
      padding-right: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-face.multiselect {
      padding: 0;
    }

    .select-face-badge {
      background-color: var(--vscode-badge-background, #616161);
      border-radius: 2px;
      color: var(--vscode-badge-foreground, #f8f8f8);
      display: inline-block;
      flex-shrink: 0;
      font-size: 11px;
      line-height: 16px;
      margin: 2px;
      padding: 2px 3px;
      white-space: nowrap;
    }

    .select-face-badge.no-item {
      background-color: transparent;
      color: inherit;
    }

    .combobox-face {
      display: flex;
    }

    :host(:focus) .select-face,
    :host(:focus) .combobox-face,
    :host([focused]) .select-face,
    :host([focused]) .combobox-face {
      border-color: var(--vscode-focusBorder, #0078d4);
      outline: none;
    }

    .combobox-input {
      background-color: transparent;
      box-sizing: border-box;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 16px;
      padding: 4px;
      width: 100%;
    }

    .combobox-input:focus {
      outline: none;
    }

    .combobox-button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 2px;
      box-sizing: content-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      flex-shrink: 0;
      height: 16px;
      justify-content: center;
      margin: 1px 1px 0 0;
      padding: 3px;
      width: 22px;
    }

    .combobox-button:hover,
    .combobox-button:focus-visible {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    .combobox-button:focus-visible {
      outline: none;
    }

    .icon {
      color: var(--vscode-foreground, #cccccc);
      display: block;
      height: 14px;
      pointer-events: none;
      width: 14px;
    }

    .select-face .icon {
      position: absolute;
      right: 6px;
      top: 5px;
    }

    .icon svg {
      color: var(--vscode-foreground, #cccccc);
      height: 100%;
      width: 100%;
    }

    .dropdown {
      background-color: var(--vscode-settings-dropdownBackground, #313131);
      border-color: var(--vscode-settings-dropdownListBorder, #454545);
      border-radius: 0 0 3px 3px;
      border-style: solid;
      border-width: 1px;
      bottom: unset;
      box-sizing: border-box;
      display: none;
      padding-bottom: 2px;
      padding-left: 0;
      padding-right: 0;
      padding-top: 0;
      right: unset;
    }

    .dropdown.open {
      display: block;
    }

    :host([position='above']) .dropdown {
      border-radius: 3px 3px 0 0;
      bottom: 26px;
      padding-bottom: 0;
      padding-top: 2px;
      top: unset;
    }

    :host(:focus) .dropdown,
    :host([focused]) .dropdown {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    .scrollable {
      display: block;
      max-height: 222px;
      margin: 1px;
      outline: none;
      overflow: hidden;
    }

    .options {
      box-sizing: border-box;
      cursor: pointer;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .option {
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 22px;
      line-height: 20px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      padding: 1px 3px;
      user-select: none;
      outline-color: transparent;
      outline-offset: -1px;
      outline-style: solid;
      outline-width: 1px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .option.single-select {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .option.multi-select {
      align-items: center;
      display: flex;
    }

    .option b {
      color: var(--vscode-list-highlightForeground, #2aaaff);
    }

    .option.active b {
      color: var(--vscode-list-focusHighlightForeground, #2aaaff);
    }

    .option:not(.disabled):hover {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      color: var(--vscode-list-hoverForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option:hover,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option:hover {
      outline-style: dotted;
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-width: 1px;
    }

    .option.disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    .option.active,
    .option.active:hover {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
      outline-style: solid;
      outline-width: 1px;
    }

    .no-options {
      align-items: center;
      border-color: transparent;
      border-style: solid;
      border-width: 1px;
      color: var(--vscode-foreground, #cccccc);
      cursor: default;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 18px;
      min-height: calc(var(--vscode-font-size) * 1.3);
      opacity: 0.85;
      padding: 1px 3px;
      user-select: none;
    }

    .placeholder {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .placeholder span {
      font-weight: bold;
    }

    .placeholder:not(.disabled):hover {
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
    }

    :host-context(body[data-vscode-theme-kind='vscode-high-contrast'])
      .option.active,
    :host-context(body[data-vscode-theme-kind='vscode-high-contrast-light'])
      .option.active:hover {
      outline-color: var(--vscode-list-focusOutline, #0078d4);
      outline-style: dashed;
    }

    .option-label {
      display: block;
      overflow: hidden;
      pointer-events: none;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    .dropdown.multiple .option.selected {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      outline-color: var(--vscode-list-hoverBackground, #2a2d2e);
    }

    .dropdown.multiple .option.selected.active {
      background-color: var(--vscode-list-activeSelectionBackground, #04395e);
      color: var(--vscode-list-activeSelectionForeground, #ffffff);
      outline-color: var(--vscode-list-activeSelectionBackground, #04395e);
    }

    .checkbox-icon {
      align-items: center;
      background-color: var(--vscode-checkbox-background, #313131);
      border-radius: 2px;
      border: 1px solid var(--vscode-checkbox-border);
      box-sizing: border-box;
      color: var(--vscode-checkbox-foreground);
      display: flex;
      flex-basis: 15px;
      flex-shrink: 0;
      height: 15px;
      justify-content: center;
      margin-right: 5px;
      overflow: hidden;
      position: relative;
      width: 15px;
    }

    .checkbox-icon svg {
      display: none;
      height: 13px;
      width: 13px;
    }

    .checkbox-icon.checked svg {
      display: block;
    }

    .dropdown-controls {
      display: flex;
      justify-content: flex-end;
      padding: 4px;
    }

    .dropdown-controls :not(:last-child) {
      margin-right: 4px;
    }

    .action-icon {
      align-items: center;
      background-color: transparent;
      border: 0;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      height: 24px;
      justify-content: center;
      padding: 0;
      width: 24px;
    }

    .action-icon:focus {
      outline: none;
    }

    .action-icon:focus-visible {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }

    .description {
      border-color: var(--vscode-settings-dropdownBorder, #3c3c3c);
      border-style: solid;
      border-width: 1px 0 0;
      color: var(--vscode-foreground, #cccccc);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      line-height: 1.3;
      padding: 6px 4px;
      word-wrap: break-word;
    }

    :host([position='above']) .description {
      border-width: 0 0 1px;
    }
  `];var Ee=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let J=class extends P{set selectedIndexes(e){this._opts.selectedIndexes=e}get selectedIndexes(){return this._opts.selectedIndexes}set value(e){this._opts.multiSelectValue=e,this._opts.selectedIndexes.length>0?this._requestedValueToSetLater=[]:this._requestedValueToSetLater=Array.isArray(e)?e:[e],this._setFormValue(),this._manageRequired()}get value(){return this._opts.multiSelectValue}get form(){return this._internals.form}get type(){return"select-multiple"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}selectAll(){this._opts.selectAll()}selectNone(){this._opts.selectNone()}constructor(){super(),this.defaultValue=[],this.required=!1,this.name=void 0,this._requestedValueToSetLater=[],this._onOptionClick=e=>{const s=e.composedPath().find(r=>"matches"in r?r.matches("li.option"):!1);if(!s)return;if(s.classList.contains("placeholder")){this._createAndSelectSuggestedOption();return}const o=Number(s.dataset.index);this._opts.toggleOptionSelected(o),this._setFormValue(),this._manageRequired(),this._dispatchChangeEvent()},this._opts.multiSelect=!0,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._setDefaultValue(),this._manageRequired()})}formResetCallback(){this.updateComplete.then(()=>{this.value=this.defaultValue})}formStateRestoreCallback(e,t){const s=Array.from(e.entries()).map(i=>String(i[1]));this.updateComplete.then(()=>{this.value=s})}_setDefaultValue(){if(Array.isArray(this.defaultValue)&&this.defaultValue.length>0){const e=this.defaultValue.map(t=>String(t));this.value=e}}_dispatchChangeEvent(){super._dispatchChangeEvent()}_onFaceClick(){super._onFaceClick(),this._opts.activeIndex=0}_toggleComboboxDropdown(){super._toggleComboboxDropdown(),this._opts.activeIndex=-1}_manageRequired(){const{value:e}=this;e.length===0&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._faceElement):this._internals.setValidity({})}_setFormValue(){const e=new FormData;this._values.forEach(t=>{e.append(this.name??"",t)}),this._internals.setFormValue(e)}async _createAndSelectSuggestedOption(){super._createAndSelectSuggestedOption();const e=this._createSuggestedOption();await this.updateComplete,this.selectedIndexes=[...this.selectedIndexes,e],this._dispatchChangeEvent();const t=new CustomEvent("vsc-multi-select-create-option",{detail:{value:this._opts.getOptionByIndex(e)?.value??""}});this.dispatchEvent(t),this.open=!1,this._isPlaceholderOptionActive=!1}_onSlotChange(){super._onSlotChange(),this._requestedValueToSetLater.length>0&&(this._opts.expandMultiSelection(this._requestedValueToSetLater),this._requestedValueToSetLater=this._requestedValueToSetLater.filter(e=>this._opts.findOptionIndex(e)===-1))}_onEnterKeyDown(e){super._onEnterKeyDown(e),this.open?this._isPlaceholderOptionActive?this._createAndSelectSuggestedOption():(this._opts.toggleActiveMultiselectOption(),this._setFormValue(),this._manageRequired(),this._dispatchChangeEvent()):(this._opts.filterPattern="",this.open=!0)}_onMultiAcceptClick(){this.open=!1}_onMultiDeselectAllClick(){this._opts.selectedIndexes=[],this._values=[],this._options=this._options.map(e=>({...e,selected:!1})),this._manageRequired(),this._dispatchChangeEvent()}_onMultiSelectAllClick(){this._opts.selectedIndexes=[],this._values=[],this._options=this._options.map(e=>({...e,selected:!0})),this._options.forEach((e,t)=>{this._selectedIndexes.push(t),this._values.push(e.value),this._dispatchChangeEvent()}),this._setFormValue(),this._manageRequired()}_onComboboxInputBlur(){super._onComboboxInputBlur(),this._opts.filterPattern=""}_renderLabel(){switch(this._opts.selectedIndexes.length){case 0:return d`<span class="select-face-badge no-item">0 Selected</span>`;default:return d`<span class="select-face-badge"
          >${this._opts.selectedIndexes.length} Selected</span
        >`}}_renderComboboxFace(){const e=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",t=this.open?"true":"false";return d`
      <div class="combobox-face face">
        ${this._opts.multiSelect?this._renderLabel():u}
        <input
          aria-activedescendant=${e}
          aria-autocomplete="list"
          aria-controls="select-listbox"
          aria-expanded=${t}
          aria-haspopup="listbox"
          aria-label=${C(this.label)}
          class="combobox-input"
          role="combobox"
          spellcheck="false"
          type="text"
          autocomplete="off"
          .value=${this._opts.filterPattern}
          @focus=${this._onComboboxInputFocus}
          @blur=${this._onComboboxInputBlur}
          @input=${this._onComboboxInputInput}
          @click=${this._onComboboxInputClick}
          @keydown=${this._onComboboxInputSpaceKeyDown}
        >
        <button
          aria-label="Open the list of options"
          class="combobox-button"
          type="button"
          @click=${this._onComboboxButtonClick}
          @keydown=${this._onComboboxButtonKeyDown}
          tabindex="-1"
        >
          ${ft}
        </button>
      </div>
    `}_renderSelectFace(){const e=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",t=this.open?"true":"false";return d`
      <div
        aria-activedescendant=${C(this._opts.multiSelect?void 0:e)}
        aria-controls="select-listbox"
        aria-expanded=${C(this._opts.multiSelect?void 0:t)}
        aria-haspopup="listbox"
        aria-label=${C(this.label??void 0)}
        class="select-face face multiselect"
        @click=${this._onFaceClick}
        .tabIndex=${this.disabled?-1:0}
      >
        ${this._renderLabel()} ${ft}
      </div>
    `}_renderDropdownControls(){return this._filteredOptions.length>0?d`
          <div class="dropdown-controls">
            <button
              type="button"
              @click=${this._onMultiSelectAllClick}
              title="Select all"
              class="action-icon"
              id="select-all"
            >
              <vscode-icon name="checklist"></vscode-icon>
            </button>
            <button
              type="button"
              @click=${this._onMultiDeselectAllClick}
              title="Deselect all"
              class="action-icon"
              id="select-none"
            >
              <vscode-icon name="clear-all"></vscode-icon>
            </button>
            <vscode-button
              class="button-accept"
              @click=${this._onMultiAcceptClick}
              >OK</vscode-button
            >
          </div>
        `:d`${u}`}render(){return d`
      <div class="multi-select">
        <slot class="main-slot" @slotchange=${this._onSlotChange}></slot>
        ${this.combobox?this._renderComboboxFace():this._renderSelectFace()}
        ${this._renderDropdown()}
      </div>
    `}};J.styles=Rs;J.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};J.formAssociated=!0;Ee([a({type:Array,attribute:"default-value"})],J.prototype,"defaultValue",void 0);Ee([a({type:Boolean,reflect:!0})],J.prototype,"required",void 0);Ee([a({reflect:!0})],J.prototype,"name",void 0);Ee([a({type:Array,attribute:!1})],J.prototype,"selectedIndexes",null);Ee([a({type:Array})],J.prototype,"value",null);Ee([j(".face")],J.prototype,"_faceElement",void 0);J=Ee([y("vscode-multi-select")],J);g({tagName:"vscode-multi-select",elementClass:J,react:_,displayName:"VscodeMultiSelect",events:{onChange:"change",onInvalid:"invalid",onVscMultiSelectCreateOption:"vsc-multi-select-create-option"}});const sn=g({tagName:"vscode-option",elementClass:be,react:_,displayName:"VscodeOption"}),Zo=[x,m`
    :host {
      display: block;
      height: 2px;
      width: 100%;
      outline: none;
    }

    .container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .track {
      position: absolute;
      inset: 0;
      background: transparent;
    }

    .indicator {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      height: 100%;
      background: var(--vscode-progressBar-background, #0078d4);
      will-change: transform, width, left;
    }

    /* Determinate mode: width is set inline via style attribute */
    .discrete .indicator {
      transition: width 100ms linear;
    }

    /* Indeterminate mode: VS Code style progress bit */
    .infinite .indicator {
      width: 2%;
      animation-name: progress;
      animation-duration: 4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
      transform: translate3d(0px, 0px, 0px);
    }

    /* Long running: reduce GPU pressure using stepped animation */
    .infinite.infinite-long-running .indicator {
      animation-timing-function: steps(100);
    }

    /* Keyframes adapted from VS Code */
    @keyframes progress {
      from {
        transform: translateX(0%) scaleX(1);
      }
      50% {
        transform: translateX(2500%) scaleX(3);
      }
      to {
        transform: translateX(4900%) scaleX(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .discrete .indicator {
        transition: none;
      }
      .infinite .indicator,
      .infinite-long-running .indicator {
        animation: none;
        width: 100%;
      }
    }
  `];var Oe=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let ne=class extends w{constructor(){super(...arguments),this.ariaLabel="Loading",this.max=100,this.indeterminate=!1,this.longRunningThreshold=15e3,this._longRunning=!1}get _isDeterminate(){return!this.indeterminate&&typeof this.value=="number"&&isFinite(this.value)}connectedCallback(){super.connectedCallback(),this._maybeStartLongRunningTimer()}disconnectedCallback(){super.disconnectedCallback(),this._clearLongRunningTimer()}willUpdate(){this._maybeStartLongRunningTimer()}render(){const e=this.max>0?this.max:100,t=this._isDeterminate?Math.min(Math.max(this.value??0,0),e):0,s=this._isDeterminate?t/e*100:0,i={container:!0,discrete:this._isDeterminate,infinite:!this._isDeterminate,"infinite-long-running":this._longRunning&&!this._isDeterminate};return d`
      <div
        class=${$(i)}
        part="container"
        role="progressbar"
        aria-label=${this.ariaLabel}
        aria-valuemin="0"
        aria-valuemax=${String(e)}
        aria-valuenow=${C(this._isDeterminate?String(Math.round(t)):void 0)}
      >
        <div class="track" part="track"></div>
        <div
          class="indicator"
          part="indicator"
          .style=${U({width:this._isDeterminate?`${s}%`:void 0})}
        ></div>
      </div>
    `}_maybeStartLongRunningTimer(){if(!(!this._isDeterminate&&this.longRunningThreshold>0&&this.isConnected)){this._clearLongRunningTimer(),this._longRunning=!1;return}this._longRunningHandle||(this._longRunningHandle=setTimeout(()=>{this._longRunning=!0,this._longRunningHandle=void 0,this.requestUpdate()},this.longRunningThreshold))}_clearLongRunningTimer(){this._longRunningHandle&&(clearTimeout(this._longRunningHandle),this._longRunningHandle=void 0)}};ne.styles=Zo;Oe([a({reflect:!0,attribute:"aria-label"})],ne.prototype,"ariaLabel",void 0);Oe([a({type:Number,reflect:!0})],ne.prototype,"value",void 0);Oe([a({type:Number,reflect:!0})],ne.prototype,"max",void 0);Oe([a({type:Boolean,reflect:!0})],ne.prototype,"indeterminate",void 0);Oe([a({type:Number,attribute:"long-running-threshold"})],ne.prototype,"longRunningThreshold",void 0);Oe([b()],ne.prototype,"_longRunning",void 0);ne=Oe([y("vscode-progress-bar")],ne);g({tagName:"vscode-progress-bar",elementClass:ne,react:_,displayName:"VscodeProgressBar"});const Jo=[x,m`
    :host {
      display: block;
      height: 28px;
      margin: 0;
      outline: none;
      width: 28px;
    }

    .progress {
      height: 100%;
      width: 100%;
    }

    .background {
      fill: none;
      stroke: transparent;
      stroke-width: 2px;
    }

    .indeterminate-indicator-1 {
      fill: none;
      stroke: var(--vscode-progressBar-background, #0078d4);
      stroke-width: 2px;
      stroke-linecap: square;
      transform-origin: 50% 50%;
      transform: rotate(-90deg);
      transition: all 0.2s ease-in-out;
      animation: spin-infinite 2s linear infinite;
    }

    @keyframes spin-infinite {
      0% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(0deg);
      }
      50% {
        stroke-dasharray: 21.99px 21.99px;
        transform: rotate(450deg);
      }
      100% {
        stroke-dasharray: 0.01px 43.97px;
        transform: rotate(1080deg);
      }
    }
  `];var yt=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Se=class extends w{constructor(){super(...arguments),this.ariaLabel="Loading",this.ariaLive="assertive",this.role="alert"}render(){return d`<svg class="progress" part="progress" viewBox="0 0 16 16">
      <circle
        class="background"
        part="background"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
      <circle
        class="indeterminate-indicator-1"
        part="indeterminate-indicator-1"
        cx="8px"
        cy="8px"
        r="7px"
      ></circle>
    </svg>`}};Se.styles=Jo;yt([a({reflect:!0,attribute:"aria-label"})],Se.prototype,"ariaLabel",void 0);yt([a({reflect:!0,attribute:"aria-live"})],Se.prototype,"ariaLive",void 0);yt([a({reflect:!0})],Se.prototype,"role",void 0);Se=yt([y("vscode-progress-ring")],Se);g({tagName:"vscode-progress-ring",elementClass:Se,react:_,displayName:"VscodeProgressRing"});const Qo=[x,$s,m`
    :host(:invalid) .icon,
    :host([invalid]) .icon {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    .icon {
      border-radius: 9px;
    }

    .icon.checked:before {
      background-color: currentColor;
      border-radius: 4px;
      content: '';
      height: 8px;
      left: 50%;
      margin: -4px 0 0 -4px;
      position: absolute;
      top: 50%;
      width: 8px;
    }

    :host(:focus):host(:not([disabled])) .icon {
      outline: 1px solid var(--vscode-focusBorder, #0078d4);
      outline-offset: -1px;
    }
  `];var Y=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let H=class extends Cs(Ht){get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}constructor(){super(),this.autofocus=!1,this.checked=!1,this.defaultChecked=!1,this.invalid=!1,this.name="",this.type="radio",this.value="",this.disabled=!1,this.required=!1,this.tabIndex=0,this._slottedText="",this._handleClick=()=>{this.disabled||this.checked||(this._checkButton(),this._handleValueChange(),this.dispatchEvent(new Event("change",{bubbles:!0})))},this._handleKeyDown=e=>{!this.disabled&&(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.key===" "&&!this.checked&&(this.checked=!0,this._handleValueChange(),this.dispatchEvent(new Event("change",{bubbles:!0}))),e.key==="Enter"&&this._internals.form?.requestSubmit())},this._internals=this.attachInternals(),this.addEventListener("keydown",this._handleKeyDown),this.addEventListener("click",this._handleClick)}connectedCallback(){super.connectedCallback(),this._handleValueChange()}update(e){super.update(e),e.has("checked")&&this._handleValueChange(),e.has("required")&&this._handleValueChange()}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}formResetCallback(){this._getRadios().forEach(t=>{t.checked=t.defaultChecked}),this.updateComplete.then(()=>{this._handleValueChange()})}formStateRestoreCallback(e,t){this.value===e&&e!==""&&(this.checked=!0)}setComponentValidity(e){e?this._internals.setValidity({}):this._internals.setValidity({valueMissing:!0},"Please select one of these options.",this._inputEl)}_getRadios(){const e=this.getRootNode({composed:!1});if(!e)return[];const t=e.querySelectorAll(`vscode-radio[name="${this.name}"]`);return Array.from(t)}_uncheckOthers(e){e.forEach(t=>{t!==this&&(t.checked=!1)})}_checkButton(){const e=this._getRadios();this.checked=!0,e.forEach(t=>{t!==this&&(t.checked=!1)})}_setGroupValidity(e,t){this.updateComplete.then(()=>{e.forEach(s=>{s.setComponentValidity(t)})})}_setActualFormValue(){let e="";this.checked?e=this.value?this.value:"on":e=null,this._internals.setFormValue(e)}_handleValueChange(){const e=this._getRadios(),t=e.some(s=>s.required);if(this._setActualFormValue(),this.checked)this._uncheckOthers(e),this._setGroupValidity(e,!0);else{const s=!!e.find(o=>o.checked),i=t&&!s;this._setGroupValidity(e,!i)}}render(){const e=$({icon:!0,checked:this.checked}),t=$({"label-inner":!0,"is-slot-empty":this._slottedText===""});return d`
      <div class="wrapper">
        <input
          ?autofocus=${this.autofocus}
          id="input"
          class="radio"
          type="checkbox"
          ?checked=${this.checked}
          value=${this.value}
          tabindex=${this.tabIndex}
        >
        <div class=${e}></div>
        <label for="input" class="label" @click=${this._handleClick}>
          <span class=${t}>
            ${this._renderLabelAttribute()}
            <slot @slotchange=${this._handleSlotChange}></slot>
          </span>
        </label>
      </div>
    `}};H.styles=Qo;H.formAssociated=!0;H.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};Y([a({type:Boolean,reflect:!0})],H.prototype,"autofocus",void 0);Y([a({type:Boolean,reflect:!0})],H.prototype,"checked",void 0);Y([a({type:Boolean,reflect:!0,attribute:"default-checked"})],H.prototype,"defaultChecked",void 0);Y([a({type:Boolean,reflect:!0})],H.prototype,"invalid",void 0);Y([a({reflect:!0})],H.prototype,"name",void 0);Y([a()],H.prototype,"type",void 0);Y([a()],H.prototype,"value",void 0);Y([a({type:Boolean,reflect:!0})],H.prototype,"disabled",void 0);Y([a({type:Boolean,reflect:!0})],H.prototype,"required",void 0);Y([a({type:Number,reflect:!0})],H.prototype,"tabIndex",void 0);Y([b()],H.prototype,"_slottedText",void 0);Y([j("#input")],H.prototype,"_inputEl",void 0);H=Y([y("vscode-radio")],H);g({tagName:"vscode-radio",elementClass:H,react:_,displayName:"VscodeRadio",events:{onChange:"change",onInvalid:"invalid"}});const ei=[x,m`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-wrap: wrap;
    }

    :host([variant='vertical']) .wrapper {
      display: block;
    }

    ::slotted(vscode-radio) {
      margin-right: 20px;
    }

    ::slotted(vscode-radio:last-child) {
      margin-right: 0;
    }

    :host([variant='vertical']) ::slotted(vscode-radio) {
      display: block;
      margin-bottom: 15px;
    }

    :host([variant='vertical']) ::slotted(vscode-radio:last-child) {
      margin-bottom: 0;
    }
  `];var De=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let he=class extends w{constructor(){super(),this.variant="horizontal",this.role="radiogroup",this._focusedRadio=-1,this._checkedRadio=-1,this._firstContentLoaded=!1,this._handleKeyDown=e=>{const{key:t}=e;["ArrowLeft","ArrowUp","ArrowRight","ArrowDown"].includes(t)&&e.preventDefault(),(t==="ArrowRight"||t==="ArrowDown")&&this._checkNext(),(t==="ArrowLeft"||t==="ArrowUp")&&this._checkPrev()},this.addEventListener("keydown",this._handleKeyDown)}_uncheckPreviousChecked(e,t){e!==-1&&(this._radios[e].checked=!1),t!==-1&&(this._radios[t].tabIndex=-1)}_afterCheck(){this._focusedRadio=this._checkedRadio,this._radios[this._checkedRadio].checked=!0,this._radios[this._checkedRadio].tabIndex=0,this._radios[this._checkedRadio].focus()}_checkPrev(){const e=this._radios.findIndex(i=>i.checked),t=this._radios.findIndex(i=>i.focused),s=t!==-1?t:e;this._uncheckPreviousChecked(e,t),s===-1?this._checkedRadio=this._radios.length-1:s-1>=0?this._checkedRadio=s-1:this._checkedRadio=this._radios.length-1,this._afterCheck()}_checkNext(){const e=this._radios.findIndex(i=>i.checked),t=this._radios.findIndex(i=>i.focused),s=t!==-1?t:e;this._uncheckPreviousChecked(e,t),s===-1?this._checkedRadio=0:s+1<this._radios.length?this._checkedRadio=s+1:this._checkedRadio=0,this._afterCheck()}_handleChange(e){const t=this._radios.findIndex(s=>s===e.target);t!==-1&&(this._focusedRadio!==-1&&(this._radios[this._focusedRadio].tabIndex=-1),this._checkedRadio!==-1&&this._checkedRadio!==t&&(this._radios[this._checkedRadio].checked=!1),this._focusedRadio=t,this._checkedRadio=t,this._radios[t].tabIndex=0)}_handleSlotChange(){if(!this._firstContentLoaded){const t=this._radios.findIndex(s=>s.autofocus);t>-1&&(this._focusedRadio=t),this._firstContentLoaded=!0}let e=-1;this._radios.forEach((t,s)=>{this._focusedRadio>-1?t.tabIndex=s===this._focusedRadio?0:-1:t.tabIndex=s===0?0:-1,t.defaultChecked&&(e>-1&&(this._radios[e].defaultChecked=!1),e=s)}),e>-1&&(this._radios[e].checked=!0)}render(){return d`
      <div class="wrapper">
        <slot
          @slotchange=${this._handleSlotChange}
          @change=${this._handleChange}
        ></slot>
      </div>
    `}};he.styles=ei;De([a({reflect:!0})],he.prototype,"variant",void 0);De([a({reflect:!0})],he.prototype,"role",void 0);De([W({selector:"vscode-radio"})],he.prototype,"_radios",void 0);De([b()],he.prototype,"_focusedRadio",void 0);De([b()],he.prototype,"_checkedRadio",void 0);he=De([y("vscode-radio-group")],he);g({tagName:"vscode-radio-group",elementClass:he,react:_,displayName:"VscodeRadioGroup",events:{onChange:"change"}});g({tagName:"vscode-scrollable",elementClass:z,react:_,displayName:"VscodeScrollable"});var Pe=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Q=class extends P{set selectedIndex(e){this._opts.selectedIndex=e;const t=this._opts.getOptionByIndex(e);t?(this._opts.activeIndex=e,this._value=t.value,this._internals.setFormValue(this._value),this._manageRequired()):(this._value="",this._internals.setFormValue(""),this._manageRequired())}get selectedIndex(){return this._opts.selectedIndex}set value(e){this._opts.value=e,this._opts.selectedIndex>-1?this._requestedValueToSetLater="":this._requestedValueToSetLater=e,this._internals.setFormValue(this._value),this._manageRequired()}get value(){return this._opts.value}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}updateInputValue(){if(!this.combobox)return;const e=this.renderRoot.querySelector(".combobox-input");if(e){const t=this._opts.getSelectedOption();e.value=t?.label??""}}constructor(){super(),this.defaultValue="",this.name=void 0,this.required=!1,this._requestedValueToSetLater="",this._opts.multiSelect=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._manageRequired()})}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(e,t){this.updateComplete.then(()=>{this.value=e})}get type(){return"select-one"}get form(){return this._internals.form}async _createAndSelectSuggestedOption(){const e=this._createSuggestedOption();await this.updateComplete,this._opts.selectedIndex=e,this._dispatchChangeEvent();const t=new CustomEvent("vsc-single-select-create-option",{detail:{value:this._opts.getOptionByIndex(e)?.value??""}});this.dispatchEvent(t),this.open=!1,this._isPlaceholderOptionActive=!1}_setStateFromSlottedElements(){super._setStateFromSlottedElements(),!this.combobox&&this._opts.selectedIndexes.length===0&&(this._opts.selectedIndex=this._opts.options.length>0?0:-1)}_onSlotChange(){if(super._onSlotChange(),this._requestedValueToSetLater){const e=this._opts.getOptionByValue(this._requestedValueToSetLater);e&&(this._opts.selectedIndex=e.index,this._requestedValueToSetLater="")}this._opts.selectedIndex>-1&&this._opts.numOptions>0?(this._internals.setFormValue(this._opts.value),this._manageRequired()):(this._internals.setFormValue(null),this._manageRequired())}_onEnterKeyDown(e){super._onEnterKeyDown(e);let t=!1;this.combobox?this.open?this._isPlaceholderOptionActive?this._createAndSelectSuggestedOption():(t=this._opts.activeIndex!==this._opts.selectedIndex,this._opts.selectedIndex=this._opts.activeIndex,this.open=!1):(this.open=!0,this._scrollActiveElementToTop()):this.open?(t=this._opts.activeIndex!==this._opts.selectedIndex,this._opts.selectedIndex=this._opts.activeIndex,this.open=!1):(this.open=!0,this._scrollActiveElementToTop()),t&&(this._dispatchChangeEvent(),this.updateInputValue(),this._internals.setFormValue(this._opts.value),this._manageRequired())}_onOptionClick(e){super._onOptionClick(e);const s=e.composedPath().find(o=>{const r=o;if("matches"in r)return r.matches("li.option")});if(!s||s.matches(".disabled"))return;s.classList.contains("placeholder")?this.creatable&&this._createAndSelectSuggestedOption():(this._opts.selectedIndex=Number(s.dataset.index),this.open=!1,this._internals.setFormValue(this._value),this._manageRequired(),this._dispatchChangeEvent())}_manageRequired(){const{value:e}=this;e===""&&this.required?this._internals.setValidity({valueMissing:!0},"Please select an item in the list.",this._face):this._internals.setValidity({})}_renderSelectFace(){const t=this._opts.getSelectedOption()?.label??"",s=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"";return d`
      <div
        aria-activedescendant=${s}
        aria-controls="select-listbox"
        aria-expanded=${this.open?"true":"false"}
        aria-haspopup="listbox"
        aria-label=${C(this.label)}
        class="select-face face"
        @click=${this._onFaceClick}
        role="combobox"
        tabindex="0"
      >
        <span class="text">${t}</span> ${ft}
      </div>
    `}_renderComboboxFace(){let e="";this._isBeingFiltered?e=this._opts.filterPattern:e=this._opts.getSelectedOption()?.label??"";const t=this._opts.activeIndex>-1?`op-${this._opts.activeIndex}`:"",s=this.open?"true":"false";return d`
      <div class="combobox-face face">
        <input
          aria-activedescendant=${t}
          aria-autocomplete="list"
          aria-controls="select-listbox"
          aria-expanded=${s}
          aria-haspopup="listbox"
          aria-label=${C(this.label)}
          class="combobox-input"
          role="combobox"
          spellcheck="false"
          type="text"
          autocomplete="off"
          .value=${e}
          @focus=${this._onComboboxInputFocus}
          @blur=${this._onComboboxInputBlur}
          @input=${this._onComboboxInputInput}
          @click=${this._onComboboxInputClick}
          @keydown=${this._onComboboxInputSpaceKeyDown}
        >
        <button
          aria-label="Open the list of options"
          class="combobox-button"
          type="button"
          @click=${this._onComboboxButtonClick}
          @keydown=${this._onComboboxButtonKeyDown}
          tabindex="-1"
        >
          ${ft}
        </button>
      </div>
    `}render(){return d`
      <div class="single-select">
        <slot class="main-slot" @slotchange=${this._onSlotChange}></slot>
        ${this.combobox?this._renderComboboxFace():this._renderSelectFace()}
        ${this._renderDropdown()}
      </div>
    `}};Q.styles=Rs;Q.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};Q.formAssociated=!0;Pe([a({attribute:"default-value"})],Q.prototype,"defaultValue",void 0);Pe([a({reflect:!0})],Q.prototype,"name",void 0);Pe([a({type:Number,attribute:"selected-index"})],Q.prototype,"selectedIndex",null);Pe([a({type:String})],Q.prototype,"value",null);Pe([a({type:Boolean,reflect:!0})],Q.prototype,"required",void 0);Pe([j(".face")],Q.prototype,"_face",void 0);Q=Pe([y("vscode-single-select")],Q);const cn=g({tagName:"vscode-single-select",elementClass:Q,react:_,displayName:"VscodeSingleSelect",events:{onChange:"change",onInvalid:"invalid",onVscSingleSelectCreateOption:"vsc-single-select-create-option"}}),ti=[x,m`
    :host {
      --separator-border: var(--vscode-editorWidget-border, #454545);

      border: 1px solid var(--vscode-editorWidget-border, #454545);
      display: block;
      overflow: hidden;
      position: relative;
    }

    ::slotted(*) {
      height: 100%;
      width: 100%;
    }

    ::slotted(vscode-split-layout) {
      border: 0;
    }

    .wrapper {
      display: flex;
      height: 100%;
      width: 100%;
    }

    .wrapper.horizontal {
      flex-direction: column;
    }

    .start {
      box-sizing: border-box;
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start {
      border-right: 1px solid var(--separator-border);
    }

    :host([split='horizontal']) .start {
      border-bottom: 1px solid var(--separator-border);
    }

    .end {
      flex: 1;
      min-height: 0;
      min-width: 0;
    }

    :host([split='vertical']) .start,
    :host([split='vertical']) .end {
      height: 100%;
    }

    :host([split='horizontal']) .start,
    :host([split='horizontal']) .end {
      width: 100%;
    }

    .handle-overlay {
      display: none;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
      z-index: 1;
    }

    .handle-overlay.active {
      display: block;
    }

    .handle-overlay.split-vertical {
      cursor: ew-resize;
    }

    .handle-overlay.split-horizontal {
      cursor: ns-resize;
    }

    .handle {
      background-color: transparent;
      position: absolute;
      z-index: 2;
    }

    .handle.hover {
      transition: background-color 0.1s ease-out 0.3s;
      background-color: var(--vscode-sash-hoverBorder, #0078d4);
    }

    .handle.hide {
      background-color: transparent;
      transition: background-color 0.1s ease-out;
    }

    .handle.split-vertical {
      cursor: ew-resize;
      height: 100%;
    }

    .handle.split-horizontal {
      cursor: ns-resize;
      width: 100%;
    }
  `];var G=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o},kt;const ns="50%",si=4,lt=n=>{if(!n)return{value:0,unit:"pixel"};let e,t;n.endsWith("%")?(e="percent",t=+n.substring(0,n.length-1)):n.endsWith("px")?(e="pixel",t=+n.substring(0,n.length-2)):(e="pixel",t=+n);const s=isNaN(t)?0:t;return{unit:e,value:s}},at=(n,e)=>e===0?0:Math.min(100,n/e*100),rs=(n,e)=>e*(n/100);let F=kt=class extends w{set split(e){this._split!==e&&(this._split=e,this.resetHandlePosition())}get split(){return this._split}set handlePosition(e){this._rawHandlePosition=e,this._handlePositionPropChanged()}get handlePosition(){return this._rawHandlePosition}set fixedPane(e){this._fixedPane=e,this._fixedPanePropChanged()}get fixedPane(){return this._fixedPane}constructor(){super(),this._split="vertical",this.resetOnDblClick=!1,this.handleSize=4,this.initialHandlePosition=ns,this._fixedPane="none",this._handlePosition=0,this._isDragActive=!1,this._hover=!1,this._hide=!1,this._boundRect=new DOMRect,this._handleOffset=0,this._wrapperObserved=!1,this._fixedPaneSize=0,this._handleResize=e=>{const t=e[0].contentRect,{width:s,height:i}=t;this._boundRect=t;const o=this.split==="vertical"?s:i;this.fixedPane==="start"&&(this._handlePosition=this._fixedPaneSize),this.fixedPane==="end"&&(this._handlePosition=o-this._fixedPaneSize)},this._handleMouseUp=e=>{this._isDragActive=!1,e.target!==this&&(this._hover=!1,this._hide=!0),window.removeEventListener("mouseup",this._handleMouseUp),window.removeEventListener("mousemove",this._handleMouseMove);const{width:t,height:s}=this._boundRect,i=this.split==="vertical"?t:s,o=at(this._handlePosition,i);this.dispatchEvent(new CustomEvent("vsc-split-layout-change",{detail:{position:this._handlePosition,positionInPercentage:o},composed:!0}))},this._handleMouseMove=e=>{const{clientX:t,clientY:s}=e,{left:i,top:o,height:r,width:l}=this._boundRect,c=this.split==="vertical",h=c?l:r,f=c?t-i:s-o;this._handlePosition=Math.max(0,Math.min(f-this._handleOffset+this.handleSize/2,h)),this.fixedPane==="start"&&(this._fixedPaneSize=this._handlePosition),this.fixedPane==="end"&&(this._fixedPaneSize=h-this._handlePosition)},this._resizeObserver=new ResizeObserver(this._handleResize)}resetHandlePosition(){if(!this._wrapperEl){this._handlePosition=0;return}const{width:e,height:t}=this._wrapperEl.getBoundingClientRect(),s=this.split==="vertical"?e:t,{value:i,unit:o}=lt(this.initialHandlePosition??ns);o==="percent"?this._handlePosition=rs(i,s):this._handlePosition=i}connectedCallback(){super.connectedCallback()}firstUpdated(e){this.fixedPane!=="none"&&(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0),this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:t,unit:s}=this.handlePosition?lt(this.handlePosition):lt(this.initialHandlePosition);this._setPosition(t,s),this._initFixedPane()}_handlePositionPropChanged(){if(this.handlePosition&&this._wrapperEl){this._boundRect=this._wrapperEl.getBoundingClientRect();const{value:e,unit:t}=lt(this.handlePosition);this._setPosition(e,t)}}_fixedPanePropChanged(){this._wrapperEl&&this._initFixedPane()}_initFixedPane(){if(this.fixedPane==="none")this._wrapperObserved&&(this._resizeObserver.unobserve(this._wrapperEl),this._wrapperObserved=!1);else{const{width:e,height:t}=this._boundRect,s=this.split==="vertical"?e:t;this._fixedPaneSize=this.fixedPane==="start"?this._handlePosition:s-this._handlePosition,this._wrapperObserved||(this._resizeObserver.observe(this._wrapperEl),this._wrapperObserved=!0)}}_setPosition(e,t){const{width:s,height:i}=this._boundRect,o=this.split==="vertical"?s:i;this._handlePosition=t==="percent"?rs(e,o):e}_handleMouseOver(){this._hover=!0,this._hide=!1}_handleMouseOut(e){e.buttons!==1&&(this._hover=!1,this._hide=!0)}_handleMouseDown(e){e.stopPropagation(),e.preventDefault(),this._boundRect=this._wrapperEl.getBoundingClientRect();const{left:t,top:s}=this._boundRect,{left:i,top:o}=this._handleEl.getBoundingClientRect(),r=e.clientX-t,l=e.clientY-s;this.split==="vertical"&&(this._handleOffset=r-(i-t)),this.split==="horizontal"&&(this._handleOffset=l-(o-s)),this._isDragActive=!0,window.addEventListener("mouseup",this._handleMouseUp),window.addEventListener("mousemove",this._handleMouseMove)}_handleDblClick(){this.resetOnDblClick&&this.resetHandlePosition()}_handleSlotChange(){[...this._nestedLayoutsAtStart,...this._nestedLayoutsAtEnd].forEach(t=>{t instanceof kt&&t.resetHandlePosition()})}render(){const{width:e,height:t}=this._boundRect,s=this.split==="vertical"?e:t,i=this.fixedPane!=="none"?`${this._handlePosition}px`:`${at(this._handlePosition,s)}%`;let o="";this.fixedPane==="start"?o=`0 0 ${this._fixedPaneSize}px`:o=`1 1 ${at(this._handlePosition,s)}%`;let r="";this.fixedPane==="end"?r=`0 0 ${this._fixedPaneSize}px`:r=`1 1 ${at(s-this._handlePosition,s)}%`;const l={left:this.split==="vertical"?i:"0",top:this.split==="vertical"?"0":i},c=this.handleSize??si;this.split==="vertical"&&(l.marginLeft=`${0-c/2}px`,l.width=`${c}px`),this.split==="horizontal"&&(l.height=`${c}px`,l.marginTop=`${0-c/2}px`);const h=$({"handle-overlay":!0,active:this._isDragActive,"split-vertical":this.split==="vertical","split-horizontal":this.split==="horizontal"}),f=$({handle:!0,hover:this._hover,hide:this._hide,"split-vertical":this.split==="vertical","split-horizontal":this.split==="horizontal"}),p={wrapper:!0,horizontal:this.split==="horizontal"};return d`
      <div class=${$(p)}>
        <div class="start" .style=${U({flex:o})}>
          <slot name="start" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class="end" .style=${U({flex:r})}>
          <slot name="end" @slotchange=${this._handleSlotChange}></slot>
        </div>
        <div class=${h}></div>
        <div
          class=${f}
          .style=${U(l)}
          @mouseover=${this._handleMouseOver}
          @mouseout=${this._handleMouseOut}
          @mousedown=${this._handleMouseDown}
          @dblclick=${this._handleDblClick}
        ></div>
      </div>
    `}};F.styles=ti;G([a({reflect:!0})],F.prototype,"split",null);G([a({type:Boolean,reflect:!0,attribute:"reset-on-dbl-click"})],F.prototype,"resetOnDblClick",void 0);G([a({type:Number,reflect:!0,attribute:"handle-size"})],F.prototype,"handleSize",void 0);G([a({reflect:!0,attribute:"initial-handle-position"})],F.prototype,"initialHandlePosition",void 0);G([a({attribute:"handle-position"})],F.prototype,"handlePosition",null);G([a({attribute:"fixed-pane"})],F.prototype,"fixedPane",null);G([b()],F.prototype,"_handlePosition",void 0);G([b()],F.prototype,"_isDragActive",void 0);G([b()],F.prototype,"_hover",void 0);G([b()],F.prototype,"_hide",void 0);G([j(".wrapper")],F.prototype,"_wrapperEl",void 0);G([j(".handle")],F.prototype,"_handleEl",void 0);G([W({slot:"start",selector:"vscode-split-layout"})],F.prototype,"_nestedLayoutsAtStart",void 0);G([W({slot:"end",selector:"vscode-split-layout"})],F.prototype,"_nestedLayoutsAtEnd",void 0);F=kt=G([y("vscode-split-layout")],F);g({tagName:"vscode-split-layout",elementClass:F,react:_,displayName:"VscodeSplitLayout",events:{onVscSplitLayoutChange:"vsc-split-layout-change"}});const oi=[x,m`
    :host {
      cursor: pointer;
      display: block;
      user-select: none;
    }

    .wrapper {
      align-items: center;
      border-bottom: 1px solid transparent;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      min-height: 20px;
      overflow: hidden;
      padding: 7px 8px;
      position: relative;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([active]) .wrapper {
      border-bottom-color: var(--vscode-panelTitle-activeForeground, #cccccc);
      color: var(--vscode-panelTitle-activeForeground, #cccccc);
    }

    :host([panel]) .wrapper {
      border-bottom: 0;
      margin-bottom: 0;
      padding: 0;
    }

    :host(:focus-visible) {
      outline: none;
    }

    .wrapper {
      align-items: center;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      min-height: 20px;
      overflow: inherit;
      text-overflow: inherit;
      position: relative;
    }

    .wrapper.panel {
      color: var(--vscode-panelTitle-inactiveForeground, #9d9d9d);
    }

    .wrapper.panel.active,
    .wrapper.panel:hover {
      color: var(--vscode-panelTitle-activeForeground, #cccccc);
    }

    :host([panel]) .wrapper {
      display: flex;
      font-size: 11px;
      height: 31px;
      padding: 2px 10px;
      text-transform: uppercase;
    }

    .main {
      overflow: inherit;
      text-overflow: inherit;
    }

    .active-indicator {
      display: none;
    }

    .active-indicator.panel.active {
      border-top: 1px solid var(--vscode-panelTitle-activeBorder, #0078d4);
      bottom: 4px;
      display: block;
      left: 8px;
      pointer-events: none;
      position: absolute;
      right: 8px;
    }

    :host(:focus-visible) .wrapper {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host(:focus-visible) .wrapper.panel {
      outline-offset: -2px;
    }

    slot[name='content-before']::slotted(vscode-badge) {
      margin-right: 8px;
    }

    slot[name='content-after']::slotted(vscode-badge) {
      margin-left: 8px;
    }
  `];var Me=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let X=class extends w{constructor(){super(...arguments),this.active=!1,this.ariaControls="",this.panel=!1,this.role="tab",this.tabId=-1}attributeChangedCallback(e,t,s){if(super.attributeChangedCallback(e,t,s),e==="active"){const i=s!==null;this.ariaSelected=i?"true":"false",this.tabIndex=i?0:-1}}render(){return d`
      <div
        class=${$({wrapper:!0,active:this.active,panel:this.panel})}
      >
        <div class="before"><slot name="content-before"></slot></div>
        <div class="main"><slot></slot></div>
        <div class="after"><slot name="content-after"></slot></div>
        <span
          class=${$({"active-indicator":!0,active:this.active,panel:this.panel})}
        ></span>
      </div>
    `}};X.styles=oi;Me([a({type:Boolean,reflect:!0})],X.prototype,"active",void 0);Me([a({reflect:!0,attribute:"aria-controls"})],X.prototype,"ariaControls",void 0);Me([a({type:Boolean,reflect:!0})],X.prototype,"panel",void 0);Me([a({reflect:!0})],X.prototype,"role",void 0);Me([a({type:Number,reflect:!0,attribute:"tab-id"})],X.prototype,"tabId",void 0);X=Me([y("vscode-tab-header")],X);g({tagName:"vscode-tab-header",elementClass:X,react:_,displayName:"VscTabHeader"});const ls=(n,e)=>typeof n=="number"&&!Number.isNaN(n)?n/e*100:typeof n=="string"&&/^[0-9.]+$/.test(n)?Number(n)/e*100:typeof n=="string"&&/^[0-9.]+%$/.test(n)?Number(n.substring(0,n.length-1)):typeof n=="string"&&/^[0-9.]+px$/.test(n)?Number(n.substring(0,n.length-2))/e*100:null,ii=[x,m`
    :host {
      display: block;
      --vsc-row-even-background: transparent;
      --vsc-row-odd-background: transparent;
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 0;
      --vsc-row-display: table-row;
    }

    :host([bordered]),
    :host([bordered-rows]) {
      --vsc-row-border-bottom-width: 1px;
    }

    :host([compact]) {
      --vsc-row-display: block;
    }

    :host([bordered][compact]),
    :host([bordered-rows][compact]) {
      --vsc-row-border-bottom-width: 0;
      --vsc-row-border-top-width: 1px;
    }

    :host([zebra]) {
      --vsc-row-even-background: var(
        --vscode-keybindingTable-rowsBackground,
        rgba(204, 204, 204, 0.04)
      );
    }

    :host([zebra-odd]) {
      --vsc-row-odd-background: var(
        --vscode-keybindingTable-rowsBackground,
        rgba(204, 204, 204, 0.04)
      );
    }

    ::slotted(vscode-table-row) {
      width: 100%;
    }

    .wrapper {
      height: 100%;
      max-width: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    .wrapper.select-disabled {
      user-select: none;
    }

    .wrapper.resize-cursor {
      cursor: ew-resize;
    }

    .wrapper.compact-view .header-slot-wrapper {
      height: 0;
      overflow: hidden;
    }

    .scrollable {
      height: 100%;
    }

    .scrollable:before {
      background-color: transparent;
      content: '';
      display: block;
      height: 1px;
      position: absolute;
      width: 100%;
    }

    .wrapper:not(.compact-view) .scrollable:not([scrolled]):before {
      background-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
    }

    .sash {
      visibility: hidden;
    }

    :host([bordered-columns]) .sash,
    :host([bordered]) .sash {
      visibility: visible;
    }

    :host([resizable]) .wrapper:hover .sash {
      visibility: visible;
    }

    .sash {
      height: 100%;
      position: absolute;
      top: 0;
      width: 1px;
    }

    .wrapper.compact-view .sash {
      display: none;
    }

    .sash.resizable {
      cursor: ew-resize;
    }

    .sash-visible {
      background-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      height: 100%;
      position: absolute;
      top: 30px;
      width: 1px;
    }

    .sash.hover .sash-visible {
      background-color: var(--vscode-sash-hoverBorder, #0078d4);
      transition: background-color 50ms linear 300ms;
    }

    .sash .sash-clickable {
      background-color: transparent;
      height: 100%;
      left: -2px;
      position: absolute;
      width: 5px;
    }
  `];var V=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const as=100;let O=class extends w{constructor(){super(...arguments),this.role="table",this.resizable=!1,this.responsive=!1,this.bordered=!1,this.borderedColumns=!1,this.borderedRows=!1,this.breakpoint=300,this.minColumnWidth="50px",this.delayedResizing=!1,this.compact=!1,this.zebra=!1,this.zebraOdd=!1,this._sashPositions=[],this._isDragging=!1,this._sashHovers=[],this._columns=[],this._activeSashElementIndex=-1,this._activeSashCursorOffset=0,this._componentX=0,this._componentH=0,this._componentW=0,this._headerCells=[],this._cellsOfFirstRow=[],this._prevHeaderHeight=0,this._prevComponentHeight=0,this._componentResizeObserverCallback=()=>{this._memoizeComponentDimensions(),this._updateResizeHandlersSize(),this.responsive&&this._toggleCompactView(),this._resizeTableBody()},this._headerResizeObserverCallback=()=>{this._updateResizeHandlersSize()},this._bodyResizeObserverCallback=()=>{this._resizeTableBody()},this._onResizingMouseMove=e=>{e.stopPropagation(),this._updateActiveSashPosition(e.pageX),this.delayedResizing?this._resizeColumns(!1):this._resizeColumns(!0)},this._onResizingMouseUp=e=>{this._resizeColumns(!0),this._updateActiveSashPosition(e.pageX),this._sashHovers[this._activeSashElementIndex]=!1,this._isDragging=!1,this._activeSashElementIndex=-1,document.removeEventListener("mousemove",this._onResizingMouseMove),document.removeEventListener("mouseup",this._onResizingMouseUp)}}set columns(e){this._columns=e,this.isConnected&&this._initDefaultColumnSizes()}get columns(){return this._columns}connectedCallback(){super.connectedCallback(),this._memoizeComponentDimensions(),this._initDefaultColumnSizes()}disconnectedCallback(){super.disconnectedCallback(),this._componentResizeObserver?.unobserve(this),this._componentResizeObserver?.disconnect(),this._bodyResizeObserver?.disconnect()}_px2Percent(e){return e/this._componentW*100}_percent2Px(e){return this._componentW*e/100}_memoizeComponentDimensions(){const e=this.getBoundingClientRect();this._componentH=e.height,this._componentW=e.width,this._componentX=e.x}_queryHeaderCells(){const e=this._assignedHeaderElements;return e&&e[0]?Array.from(e[0].querySelectorAll("vscode-table-header-cell")):[]}_getHeaderCells(){return this._headerCells.length||(this._headerCells=this._queryHeaderCells()),this._headerCells}_queryCellsOfFirstRow(){const e=this._assignedBodyElements;return e&&e[0]?Array.from(e[0].querySelectorAll("vscode-table-row:first-child vscode-table-cell")):[]}_getCellsOfFirstRow(){return this._cellsOfFirstRow.length||(this._cellsOfFirstRow=this._queryCellsOfFirstRow()),this._cellsOfFirstRow}_resizeTableBody(){let e=0,t=0;const s=this.getBoundingClientRect().height;this._assignedHeaderElements&&this._assignedHeaderElements.length&&(e=this._assignedHeaderElements[0].getBoundingClientRect().height),this._assignedBodyElements&&this._assignedBodyElements.length&&(t=this._assignedBodyElements[0].getBoundingClientRect().height);const i=t-e-s;this._scrollableElement.style.height=i>0?`${s-e}px`:"auto"}_initResizeObserver(){this._componentResizeObserver=new ResizeObserver(this._componentResizeObserverCallback),this._componentResizeObserver.observe(this),this._headerResizeObserver=new ResizeObserver(this._headerResizeObserverCallback),this._headerResizeObserver.observe(this._headerElement)}_calcColWidthPercentages(){const e=this._getHeaderCells().length;let t=this.columns.slice(0,e);const s=t.filter(o=>o==="auto").length+e-t.length;let i=100;if(t=t.map(o=>{const r=ls(o,this._componentW);return r===null?"auto":(i-=r,r)}),t.length<e)for(let o=t.length;o<e;o++)t.push("auto");return t=t.map(o=>o==="auto"?i/s:o),t}_initHeaderCellSizes(e){this._getHeaderCells().forEach((t,s)=>{t.style.width=`${e[s]}%`})}_initBodyColumnSizes(e){this._getCellsOfFirstRow().forEach((t,s)=>{t.style.width=`${e[s]}%`})}_initSashes(e){const t=e.length;let s=0;this._sashPositions=[],e.forEach((i,o)=>{if(o<t-1){const r=s+i;this._sashPositions.push(r),s=r}})}_initDefaultColumnSizes(){const e=this._calcColWidthPercentages();this._initHeaderCellSizes(e),this._initBodyColumnSizes(e),this._initSashes(e)}_updateResizeHandlersSize(){const e=this._headerElement.getBoundingClientRect();if(e.height===this._prevHeaderHeight&&this._componentH===this._prevComponentHeight)return;this._prevHeaderHeight=e.height,this._prevComponentHeight=this._componentH;const t=this._componentH-e.height;this._sashVisibleElements.forEach(s=>{s.style.height=`${t}px`,s.style.top=`${e.height}px`})}_applyCompactViewColumnLabels(){const t=this._getHeaderCells().map(i=>i.innerText);this.querySelectorAll("vscode-table-row").forEach(i=>{i.querySelectorAll("vscode-table-cell").forEach((r,l)=>{r.columnLabel=t[l],r.compact=!0})})}_clearCompactViewColumnLabels(){this.querySelectorAll("vscode-table-cell").forEach(e=>{e.columnLabel="",e.compact=!1})}_toggleCompactView(){const t=this.getBoundingClientRect().width<this.breakpoint;this.compact!==t&&(this.compact=t,t?this._applyCompactViewColumnLabels():this._clearCompactViewColumnLabels())}_onDefaultSlotChange(){this._assignedElements.forEach(e=>{if(e.tagName.toLowerCase()==="vscode-table-header"){e.slot="header";return}if(e.tagName.toLowerCase()==="vscode-table-body"){e.slot="body";return}})}_onHeaderSlotChange(){this._headerCells=this._queryHeaderCells()}_onBodySlotChange(){if(this._initDefaultColumnSizes(),this._initResizeObserver(),this._updateResizeHandlersSize(),!this._bodyResizeObserver){const e=this._assignedBodyElements[0]??null;e&&(this._bodyResizeObserver=new ResizeObserver(this._bodyResizeObserverCallback),this._bodyResizeObserver.observe(e))}}_onSashMouseOver(e){if(this._isDragging)return;const t=e.currentTarget,s=Number(t.dataset.index);this._sashHovers[s]=!0,this.requestUpdate()}_onSashMouseOut(e){if(e.stopPropagation(),this._isDragging)return;const t=e.currentTarget,s=Number(t.dataset.index);this._sashHovers[s]=!1,this.requestUpdate()}_onSashMouseDown(e){e.stopPropagation();const{pageX:t,currentTarget:s}=e,i=s,o=Number(i.dataset.index),l=i.getBoundingClientRect().x;this._isDragging=!0,this._activeSashElementIndex=o,this._sashHovers[this._activeSashElementIndex]=!0,this._activeSashCursorOffset=this._px2Percent(t-l);const c=this._getHeaderCells();this._headerCellsToResize=[],this._headerCellsToResize.push(c[o]),c[o+1]&&(this._headerCellsToResize[1]=c[o+1]);const f=this._bodySlot.assignedElements()[0].querySelectorAll("vscode-table-row:first-child > vscode-table-cell");this._cellsToResize=[],this._cellsToResize.push(f[o]),f[o+1]&&this._cellsToResize.push(f[o+1]),document.addEventListener("mousemove",this._onResizingMouseMove),document.addEventListener("mouseup",this._onResizingMouseUp)}_updateActiveSashPosition(e){const{prevSashPos:t,nextSashPos:s}=this._getSashPositions();let i=ls(this.minColumnWidth,this._componentW);i===null&&(i=0);const o=t?t+i:i,r=s?s-i:as-i;let l=this._px2Percent(e-this._componentX-this._percent2Px(this._activeSashCursorOffset));l=Math.max(l,o),l=Math.min(l,r),this._sashPositions[this._activeSashElementIndex]=l,this.requestUpdate()}_getSashPositions(){const e=this._sashPositions[this._activeSashElementIndex],t=this._sashPositions[this._activeSashElementIndex-1]||0,s=this._sashPositions[this._activeSashElementIndex+1]||as;return{sashPos:e,prevSashPos:t,nextSashPos:s}}_resizeColumns(e=!0){const{sashPos:t,prevSashPos:s,nextSashPos:i}=this._getSashPositions(),o=t-s,r=i-t,l=`${o}%`,c=`${r}%`;this._headerCellsToResize[0].style.width=l,this._headerCellsToResize[1]&&(this._headerCellsToResize[1].style.width=c),e&&this._cellsToResize[0]&&(this._cellsToResize[0].style.width=l,this._cellsToResize[1]&&(this._cellsToResize[1].style.width=c))}render(){const e=this._sashPositions.map((s,i)=>{const o=$({sash:!0,hover:this._sashHovers[i],resizable:this.resizable}),r=`${s}%`;return this.resizable?d`
            <div
              class=${o}
              data-index=${i}
              .style=${U({left:r})}
              @mousedown=${this._onSashMouseDown}
              @mouseover=${this._onSashMouseOver}
              @mouseout=${this._onSashMouseOut}
            >
              <div class="sash-visible"></div>
              <div class="sash-clickable"></div>
            </div>
          `:d`<div
            class=${o}
            data-index=${i}
            .style=${U({left:r})}
          >
            <div class="sash-visible"></div>
          </div>`}),t=$({wrapper:!0,"select-disabled":this._isDragging,"resize-cursor":this._isDragging,"compact-view":this.compact});return d`
      <div class=${t}>
        <div class="header">
          <slot name="caption"></slot>
          <div class="header-slot-wrapper">
            <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
          </div>
        </div>
        <vscode-scrollable class="scrollable">
          <div>
            <slot name="body" @slotchange=${this._onBodySlotChange}></slot>
          </div>
        </vscode-scrollable>
        ${e}
        <slot @slotchange=${this._onDefaultSlotChange}></slot>
      </div>
    `}};O.styles=ii;V([a({reflect:!0})],O.prototype,"role",void 0);V([a({type:Boolean,reflect:!0})],O.prototype,"resizable",void 0);V([a({type:Boolean,reflect:!0})],O.prototype,"responsive",void 0);V([a({type:Boolean,reflect:!0})],O.prototype,"bordered",void 0);V([a({type:Boolean,reflect:!0,attribute:"bordered-columns"})],O.prototype,"borderedColumns",void 0);V([a({type:Boolean,reflect:!0,attribute:"bordered-rows"})],O.prototype,"borderedRows",void 0);V([a({type:Number})],O.prototype,"breakpoint",void 0);V([a({type:Array})],O.prototype,"columns",null);V([a({attribute:"min-column-width"})],O.prototype,"minColumnWidth",void 0);V([a({type:Boolean,reflect:!0,attribute:"delayed-resizing"})],O.prototype,"delayedResizing",void 0);V([a({type:Boolean,reflect:!0})],O.prototype,"compact",void 0);V([a({type:Boolean,reflect:!0})],O.prototype,"zebra",void 0);V([a({type:Boolean,reflect:!0,attribute:"zebra-odd"})],O.prototype,"zebraOdd",void 0);V([j('slot[name="body"]')],O.prototype,"_bodySlot",void 0);V([j(".header")],O.prototype,"_headerElement",void 0);V([j(".scrollable")],O.prototype,"_scrollableElement",void 0);V([bo(".sash-visible")],O.prototype,"_sashVisibleElements",void 0);V([W({flatten:!0,selector:"vscode-table-header, vscode-table-body"})],O.prototype,"_assignedElements",void 0);V([W({slot:"header",flatten:!0,selector:"vscode-table-header"})],O.prototype,"_assignedHeaderElements",void 0);V([W({slot:"body",flatten:!0,selector:"vscode-table-body"})],O.prototype,"_assignedBodyElements",void 0);V([b()],O.prototype,"_sashPositions",void 0);V([b()],O.prototype,"_isDragging",void 0);O=V([y("vscode-table")],O);g({tagName:"vscode-table",elementClass:O,react:_,displayName:"VscodeTable"});const ni=[x,m`
    :host {
      display: table;
      table-layout: fixed;
      width: 100%;
    }

    ::slotted(vscode-table-row:nth-child(even)) {
      background-color: var(--vsc-row-even-background);
    }

    ::slotted(vscode-table-row:nth-child(odd)) {
      background-color: var(--vsc-row-odd-background);
    }
  `];var Vs=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Je=class extends w{constructor(){super(...arguments),this.role="rowgroup"}render(){return d` <slot></slot> `}};Je.styles=ni;Vs([a({reflect:!0})],Je.prototype,"role",void 0);Je=Vs([y("vscode-table-body")],Je);g({tagName:"vscode-table-body",elementClass:Je,react:_,displayName:"VscodeTableBody"});const ri=[x,m`
    :host {
      border-bottom-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      border-bottom-style: solid;
      border-bottom-width: var(--vsc-row-border-bottom-width);
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      display: table-cell;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      height: 24px;
      overflow: hidden;
      padding-left: 10px;
      text-overflow: ellipsis;
      vertical-align: middle;
      white-space: nowrap;
    }

    :host([compact]) {
      display: block;
      height: auto;
      padding-bottom: 5px;
      width: 100% !important;
    }

    :host([compact]:first-child) {
      padding-top: 10px;
    }

    :host([compact]:last-child) {
      padding-bottom: 10px;
    }

    .wrapper {
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }

    .column-label {
      font-weight: bold;
    }
  `];var xt=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let ke=class extends w{constructor(){super(...arguments),this.role="cell",this.columnLabel="",this.compact=!1}render(){const e=this.columnLabel?d`<div class="column-label" role="presentation">
          ${this.columnLabel}
        </div>`:u;return d`
      <div class="wrapper">
        ${e}
        <slot></slot>
      </div>
    `}};ke.styles=ri;xt([a({reflect:!0})],ke.prototype,"role",void 0);xt([a({attribute:"column-label"})],ke.prototype,"columnLabel",void 0);xt([a({type:Boolean,reflect:!0})],ke.prototype,"compact",void 0);ke=xt([y("vscode-table-cell")],ke);g({tagName:"vscode-table-cell",elementClass:ke,react:_,displayName:"VscodeTableCell"});const li=[x,m`
    :host {
      background-color: var(
        --vscode-keybindingTable-headerBackground,
        rgba(204, 204, 204, 0.04)
      );
      display: table;
      table-layout: fixed;
      width: 100%;
    }
  `];var Bs=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let Qe=class extends w{constructor(){super(...arguments),this.role="rowgroup"}render(){return d` <slot></slot> `}};Qe.styles=li;Bs([a({reflect:!0})],Qe.prototype,"role",void 0);Qe=Bs([y("vscode-table-header")],Qe);g({tagName:"vscode-table-header",elementClass:Qe,react:_,displayName:"VscodeTableHeader"});const ai=[x,m`
    :host {
      box-sizing: border-box;
      color: var(--vscode-foreground, #cccccc);
      display: table-cell;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: bold;
      line-height: 20px;
      overflow: hidden;
      padding-bottom: 5px;
      padding-left: 10px;
      padding-right: 0;
      padding-top: 5px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wrapper {
      box-sizing: inherit;
      overflow: inherit;
      text-overflow: inherit;
      white-space: inherit;
      width: 100%;
    }
  `];var Ts=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let et=class extends w{constructor(){super(...arguments),this.role="columnheader"}render(){return d`
      <div class="wrapper">
        <slot></slot>
      </div>
    `}};et.styles=ai;Ts([a({reflect:!0})],et.prototype,"role",void 0);et=Ts([y("vscode-table-header-cell")],et);g({tagName:"vscode-table-header-cell",elementClass:et,react:_,displayName:"VscodeTableHeaderCell"});const ci=[x,m`
    :host {
      border-top-color: var(
        --vscode-editorGroup-border,
        rgba(255, 255, 255, 0.09)
      );
      border-top-style: solid;
      border-top-width: var(--vsc-row-border-top-width);
      display: var(--vsc-row-display);
      width: 100%;
    }
  `];var zs=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let tt=class extends w{constructor(){super(...arguments),this.role="row"}render(){return d` <slot></slot> `}};tt.styles=ci;zs([a({reflect:!0})],tt.prototype,"role",void 0);tt=zs([y("vscode-table-row")],tt);g({tagName:"vscode-table-row",elementClass:tt,react:_,displayName:"VscodeTableRow"});const di=[x,m`
    :host {
      display: block;
      overflow: hidden;
    }

    :host(:focus-visible) {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-offset: 3px;
      outline-style: solid;
      outline-width: 1px;
    }

    :host([panel]) {
      background-color: var(--vscode-panel-background, #181818);
    }
  `];var He=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let re=class extends w{constructor(){super(...arguments),this.hidden=!1,this.ariaLabelledby="",this.panel=!1,this.role="tabpanel",this.tabIndex=0}render(){return d` <slot></slot> `}};re.styles=di;He([a({type:Boolean,reflect:!0})],re.prototype,"hidden",void 0);He([a({reflect:!0,attribute:"aria-labelledby"})],re.prototype,"ariaLabelledby",void 0);He([a({type:Boolean,reflect:!0})],re.prototype,"panel",void 0);He([a({reflect:!0})],re.prototype,"role",void 0);He([a({type:Number,reflect:!0})],re.prototype,"tabIndex",void 0);re=He([y("vscode-tab-panel")],re);g({tagName:"vscode-tab-panel",elementClass:re,react:_,displayName:"VscodeTabPanel"});const hi=[x,m`
    :host {
      display: block;
    }

    .header {
      align-items: center;
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      width: 100%;
    }

    .header {
      border-bottom-color: var(--vscode-settings-headerBorder, #2b2b2b);
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }

    .header.panel {
      background-color: var(--vscode-panel-background, #181818);
      border-bottom-width: 0;
      box-sizing: border-box;
      padding-left: 8px;
      padding-right: 8px;
    }

    .tablist {
      display: flex;
      margin-bottom: -1px;
    }

    slot[name='addons'] {
      display: block;
      margin-left: auto;
    }
  `];var it=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let _e=class extends w{constructor(){super(),this.panel=!1,this.selectedIndex=0,this._tabHeaders=[],this._tabPanels=[],this._componentId="",this._tabFocus=0,this._componentId=Is()}attributeChangedCallback(e,t,s){super.attributeChangedCallback(e,t,s),e==="selected-index"&&this._setActiveTab(),e==="panel"&&(this._tabHeaders.forEach(i=>i.panel=s!==null),this._tabPanels.forEach(i=>i.panel=s!==null))}_dispatchSelectEvent(){this.dispatchEvent(new CustomEvent("vsc-tabs-select",{detail:{selectedIndex:this.selectedIndex},composed:!0}))}_setActiveTab(){this._tabFocus=this.selectedIndex,this._tabPanels.forEach((e,t)=>{e.hidden=t!==this.selectedIndex}),this._tabHeaders.forEach((e,t)=>{e.active=t===this.selectedIndex})}_focusPrevTab(){this._tabFocus===0?this._tabFocus=this._tabHeaders.length-1:this._tabFocus-=1}_focusNextTab(){this._tabFocus===this._tabHeaders.length-1?this._tabFocus=0:this._tabFocus+=1}_onHeaderKeyDown(e){(e.key==="ArrowLeft"||e.key==="ArrowRight")&&(e.preventDefault(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","-1"),e.key==="ArrowLeft"?this._focusPrevTab():e.key==="ArrowRight"&&this._focusNextTab(),this._tabHeaders[this._tabFocus].setAttribute("tabindex","0"),this._tabHeaders[this._tabFocus].focus()),e.key==="Enter"&&(e.preventDefault(),this.selectedIndex=this._tabFocus,this._dispatchSelectEvent())}_moveHeadersToHeaderSlot(){const e=this._mainSlotElements.filter(t=>t instanceof X);e.length>0&&e.forEach(t=>t.setAttribute("slot","header"))}_onMainSlotChange(){this._moveHeadersToHeaderSlot(),this._tabPanels=this._mainSlotElements.filter(e=>e instanceof re),this._tabPanels.forEach((e,t)=>{e.ariaLabelledby=`t${this._componentId}-h${t}`,e.id=`t${this._componentId}-p${t}`,e.panel=this.panel}),this._setActiveTab()}_onHeaderSlotChange(){this._tabHeaders=this._headerSlotElements.filter(e=>e instanceof X),this._tabHeaders.forEach((e,t)=>{e.tabId=t,e.id=`t${this._componentId}-h${t}`,e.ariaControls=`t${this._componentId}-p${t}`,e.panel=this.panel,e.active=t===this.selectedIndex})}_onHeaderClick(e){const s=e.composedPath().find(i=>i instanceof X);s&&(this.selectedIndex=s.tabId,this._setActiveTab(),this._dispatchSelectEvent())}render(){return d`
      <div
        class=${$({header:!0,panel:this.panel})}
        @click=${this._onHeaderClick}
        @keydown=${this._onHeaderKeyDown}
      >
        <div role="tablist" class="tablist">
          <slot
            name="header"
            @slotchange=${this._onHeaderSlotChange}
            role="tablist"
          ></slot>
        </div>
        <slot name="addons"></slot>
      </div>
      <slot @slotchange=${this._onMainSlotChange}></slot>
    `}};_e.styles=hi;it([a({type:Boolean,reflect:!0})],_e.prototype,"panel",void 0);it([a({type:Number,reflect:!0,attribute:"selected-index"})],_e.prototype,"selectedIndex",void 0);it([W({slot:"header"})],_e.prototype,"_headerSlotElements",void 0);it([W()],_e.prototype,"_mainSlotElements",void 0);_e=it([y("vscode-tabs")],_e);g({tagName:"vscode-tabs",elementClass:_e,react:_,events:{onVscTabsSelect:"vsc-tabs-select"},displayName:"VscodeTabs"});const pi=[x,m`
    :host {
      display: inline-block;
      height: auto;
      position: relative;
      width: 320px;
    }

    :host([cols]) {
      width: auto;
    }

    :host([rows]) {
      height: auto;
    }

    .shadow {
      box-shadow: var(--vscode-scrollbar-shadow, #000000) 0 6px 6px -6px inset;
      display: none;
      inset: 0 0 auto 0;
      height: 6px;
      pointer-events: none;
      position: absolute;
      width: 100%;
    }

    .shadow.visible {
      display: block;
    }

    textarea {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(--vscode-settings-textInputBorder, transparent);
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      height: 100%;
      width: 100%;
    }

    :host([cols]) textarea {
      width: auto;
    }

    :host([rows]) textarea {
      height: auto;
    }

    :host([invalid]) textarea,
    :host(:invalid) textarea {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    textarea.monospace {
      background-color: var(--vscode-editor-background, #1f1f1f);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: var(--vscode-editor-font-size, 14px);
      font-weight: var(--vscode-editor-font-weight, normal);
    }

    .textarea.monospace::placeholder {
      color: var(
        --vscode-editor-inlineValuesForeground,
        rgba(255, 255, 255, 0.5)
      );
    }

    textarea.cursor-pointer {
      cursor: pointer;
    }

    textarea:focus {
      border-color: var(--vscode-focusBorder, #0078d4);
      outline: none;
    }

    textarea::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    textarea::-webkit-scrollbar-track {
      background-color: transparent;
    }

    textarea::-webkit-scrollbar {
      width: 14px;
    }

    textarea::-webkit-scrollbar-thumb {
      background-color: transparent;
    }

    textarea:hover::-webkit-scrollbar-thumb {
      background-color: var(
        --vscode-scrollbarSlider-background,
        rgba(121, 121, 121, 0.4)
      );
    }

    textarea::-webkit-scrollbar-thumb:hover {
      background-color: var(
        --vscode-scrollbarSlider-hoverBackground,
        rgba(100, 100, 100, 0.7)
      );
    }

    textarea::-webkit-scrollbar-thumb:active {
      background-color: var(
        --vscode-scrollbarSlider-activeBackground,
        rgba(191, 191, 191, 0.4)
      );
    }

    textarea::-webkit-scrollbar-corner {
      background-color: transparent;
    }

    textarea::-webkit-resizer {
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAYAAADEUlfTAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAACJJREFUeJxjYMAOZuIQZ5j5//9/rJJESczEKYGsG6cEXgAAsEEefMxkua4AAAAASUVORK5CYII=');
      background-repeat: no-repeat;
      background-position: right bottom;
    }
  `];var B=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let E=class extends w{set value(e){this._value=e,this._internals.setFormValue(e)}get value(){return this._value}get wrappedElement(){return this._textareaEl}get form(){return this._internals.form}get type(){return"textarea"}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}set minlength(e){this.minLength=e}get minlength(){return this.minLength}set maxlength(e){this.maxLength=e}get maxlength(){return this.maxLength}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.invalid=!1,this.label="",this.maxLength=void 0,this.minLength=void 0,this.rows=void 0,this.cols=void 0,this.name=void 0,this.placeholder=void 0,this.readonly=!1,this.resize="none",this.required=!1,this.spellcheck=!1,this.monospace=!1,this._value="",this._textareaPointerCursor=!1,this._shadow=!1,this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._textareaEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._textareaEl.value)})}updated(e){const t=["maxLength","minLength","required"];for(const s of e.keys())if(t.includes(String(s))){this.updateComplete.then(()=>{this._setValidityFromInput()});break}}formResetCallback(){this.value=this.defaultValue}formStateRestoreCallback(e,t){this.updateComplete.then(()=>{this._value=e})}checkValidity(){return this._internals.checkValidity()}reportValidity(){return this._internals.reportValidity()}_setValidityFromInput(){this._internals.setValidity(this._textareaEl.validity,this._textareaEl.validationMessage,this._textareaEl)}_dataChanged(){this._value=this._textareaEl.value,this._internals.setFormValue(this._textareaEl.value)}_handleChange(){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change"))}_handleInput(){this._dataChanged(),this._setValidityFromInput()}_handleMouseMove(e){if(this._textareaEl.clientHeight>=this._textareaEl.scrollHeight){this._textareaPointerCursor=!1;return}const t=14,s=1,i=this._textareaEl.getBoundingClientRect(),o=e.clientX;this._textareaPointerCursor=o>=i.left+i.width-t-s*2}_handleScroll(){this._shadow=this._textareaEl.scrollTop>0}render(){return d`
      <div
        class=${$({shadow:!0,visible:this._shadow})}
      ></div>
      <textarea
        autocomplete=${C(this.autocomplete)}
        ?autofocus=${this.autofocus}
        ?disabled=${this.disabled}
        aria-label=${this.label}
        id="textarea"
        class=${$({monospace:this.monospace,"cursor-pointer":this._textareaPointerCursor})}
        maxlength=${C(this.maxLength)}
        minlength=${C(this.minLength)}
        rows=${C(this.rows)}
        cols=${C(this.cols)}
        name=${C(this.name)}
        placeholder=${C(this.placeholder)}
        ?readonly=${this.readonly}
        .style=${U({resize:this.resize})}
        ?required=${this.required}
        spellcheck=${this.spellcheck}
        @change=${this._handleChange}
        @input=${this._handleInput}
        @mousemove=${this._handleMouseMove}
        @scroll=${this._handleScroll}
        .value=${this._value}
      ></textarea>
    `}};E.styles=pi;E.formAssociated=!0;E.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};B([a()],E.prototype,"autocomplete",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"autofocus",void 0);B([a({attribute:"default-value"})],E.prototype,"defaultValue",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"disabled",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"invalid",void 0);B([a({attribute:!1})],E.prototype,"label",void 0);B([a({type:Number})],E.prototype,"maxLength",void 0);B([a({type:Number})],E.prototype,"minLength",void 0);B([a({type:Number})],E.prototype,"rows",void 0);B([a({type:Number})],E.prototype,"cols",void 0);B([a()],E.prototype,"name",void 0);B([a()],E.prototype,"placeholder",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"readonly",void 0);B([a()],E.prototype,"resize",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"required",void 0);B([a({type:Boolean})],E.prototype,"spellcheck",void 0);B([a({type:Boolean,reflect:!0})],E.prototype,"monospace",void 0);B([a()],E.prototype,"value",null);B([j("#textarea")],E.prototype,"_textareaEl",void 0);B([b()],E.prototype,"_value",void 0);B([b()],E.prototype,"_textareaPointerCursor",void 0);B([b()],E.prototype,"_shadow",void 0);E=B([y("vscode-textarea")],E);g({tagName:"vscode-textarea",elementClass:E,react:_,displayName:"VscodeTextarea",events:{onChange:"change",onInput:"input",onInvalid:"invalid"}});const cs=bt(zt()),ui=[x,m`
    :host {
      display: inline-block;
      width: 320px;
    }

    .root {
      align-items: center;
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border-color: var(
        --vscode-settings-textInputBorder,
        var(--vscode-settings-textInputBackground, #3c3c3c)
      );
      border-radius: 2px;
      border-style: solid;
      border-width: 1px;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: flex;
      max-width: 100%;
      position: relative;
      width: 100%;
    }

    :host([focused]) .root {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    :host([invalid]),
    :host(:invalid) {
      border-color: var(--vscode-inputValidation-errorBorder, #be1100);
    }

    :host([invalid]) input,
    :host(:invalid) input {
      background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
    }

    ::slotted([slot='content-before']) {
      display: block;
      margin-left: 2px;
    }

    ::slotted([slot='content-after']) {
      display: block;
      margin-right: 2px;
    }

    slot[name='content-before'],
    slot[name='content-after'] {
      align-items: center;
      display: flex;
    }

    input {
      background-color: var(--vscode-settings-textInputBackground, #313131);
      border: 0;
      box-sizing: border-box;
      color: var(--vscode-settings-textInputForeground, #cccccc);
      display: block;
      font-family: var(--vscode-font-family, ${cs});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 18px;
      outline: none;
      padding-bottom: 3px;
      padding-left: 4px;
      padding-right: 4px;
      padding-top: 3px;
      width: 100%;
    }

    input:read-only:not([type='file']) {
      cursor: not-allowed;
    }

    input::placeholder {
      color: var(--vscode-input-placeholderForeground, #989898);
      opacity: 1;
    }

    input[type='file'] {
      line-height: 24px;
      padding-bottom: 0;
      padding-left: 2px;
      padding-top: 0;
    }

    input[type='file']::file-selector-button {
      background-color: var(--vscode-button-background, #0078d4);
      border: 0;
      border-radius: 2px;
      color: var(--vscode-button-foreground, #ffffff);
      cursor: pointer;
      font-family: var(--vscode-font-family, ${cs});
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, 'normal');
      line-height: 20px;
      padding: 0 14px;
    }

    input[type='file']::file-selector-button:hover {
      background-color: var(--vscode-button-hoverBackground, #026ec1);
    }
  `];var A=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let k=class extends w{set type(e){const t=["color","date","datetime-local","email","file","month","number","password","search","tel","text","time","url","week"];this._type=t.includes(e)?e:"text"}get type(){return this._type}set value(e){this.type!=="file"&&(this._value=e,this._internals.setFormValue(e)),this.updateComplete.then(()=>{this._setValidityFromInput()})}get value(){return this._value}set minlength(e){this.minLength=e}get minlength(){return this.minLength}set maxlength(e){this.maxLength=e}get maxlength(){return this.maxLength}get form(){return this._internals.form}get validity(){return this._internals.validity}get validationMessage(){return this._internals.validationMessage}get willValidate(){return this._internals.willValidate}checkValidity(){return this._setValidityFromInput(),this._internals.checkValidity()}reportValidity(){return this._setValidityFromInput(),this._internals.reportValidity()}get wrappedElement(){return this._inputEl}constructor(){super(),this.autocomplete=void 0,this.autofocus=!1,this.defaultValue="",this.disabled=!1,this.focused=!1,this.invalid=!1,this.label="",this.max=void 0,this.maxLength=void 0,this.min=void 0,this.minLength=void 0,this.multiple=!1,this.name=void 0,this.pattern=void 0,this.placeholder=void 0,this.readonly=!1,this.required=!1,this.step=void 0,this._value="",this._type="text",this._internals=this.attachInternals()}connectedCallback(){super.connectedCallback(),this.updateComplete.then(()=>{this._inputEl.checkValidity(),this._setValidityFromInput(),this._internals.setFormValue(this._inputEl.value)})}attributeChangedCallback(e,t,s){super.attributeChangedCallback(e,t,s),["max","maxlength","min","minlength","pattern","required","step"].includes(e)&&this.updateComplete.then(()=>{this._setValidityFromInput()})}formResetCallback(){this.value=this.defaultValue,this.requestUpdate()}formStateRestoreCallback(e,t){this.value=e}_dataChanged(){if(this._value=this._inputEl.value,this.type==="file"&&this._inputEl.files)for(const e of this._inputEl.files)this._internals.setFormValue(e);else this._internals.setFormValue(this._inputEl.value)}_setValidityFromInput(){this._inputEl&&this._internals.setValidity(this._inputEl.validity,this._inputEl.validationMessage,this._inputEl)}_onInput(){this._dataChanged(),this._setValidityFromInput()}_onChange(){this._dataChanged(),this._setValidityFromInput(),this.dispatchEvent(new Event("change"))}_onFocus(){this.focused=!0}_onBlur(){this.focused=!1}_onKeyDown(e){e.key==="Enter"&&this._internals.form&&this._internals.form?.requestSubmit()}render(){return d`
      <div class="root">
        <slot name="content-before"></slot>
        <input
          id="input"
          type=${this.type}
          ?autofocus=${this.autofocus}
          autocomplete=${C(this.autocomplete)}
          aria-label=${this.label}
          ?disabled=${this.disabled}
          max=${C(this.max)}
          maxlength=${C(this.maxLength)}
          min=${C(this.min)}
          minlength=${C(this.minLength)}
          ?multiple=${this.multiple}
          name=${C(this.name)}
          pattern=${C(this.pattern)}
          placeholder=${C(this.placeholder)}
          ?readonly=${this.readonly}
          ?required=${this.required}
          step=${C(this.step)}
          .value=${this._value}
          @blur=${this._onBlur}
          @change=${this._onChange}
          @focus=${this._onFocus}
          @input=${this._onInput}
          @keydown=${this._onKeyDown}
        >
        <slot name="content-after"></slot>
      </div>
    `}};k.styles=ui;k.formAssociated=!0;k.shadowRootOptions={...se.shadowRootOptions,delegatesFocus:!0};A([a()],k.prototype,"autocomplete",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"autofocus",void 0);A([a({attribute:"default-value"})],k.prototype,"defaultValue",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"disabled",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"focused",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"invalid",void 0);A([a({attribute:!1})],k.prototype,"label",void 0);A([a({type:Number})],k.prototype,"max",void 0);A([a({type:Number})],k.prototype,"maxLength",void 0);A([a({type:Number})],k.prototype,"min",void 0);A([a({type:Number})],k.prototype,"minLength",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"multiple",void 0);A([a({reflect:!0})],k.prototype,"name",void 0);A([a()],k.prototype,"pattern",void 0);A([a()],k.prototype,"placeholder",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"readonly",void 0);A([a({type:Boolean,reflect:!0})],k.prototype,"required",void 0);A([a({type:Number})],k.prototype,"step",void 0);A([a({reflect:!0})],k.prototype,"type",null);A([a()],k.prototype,"value",null);A([j("#input")],k.prototype,"_inputEl",void 0);A([b()],k.prototype,"_value",void 0);A([b()],k.prototype,"_type",void 0);k=A([y("vscode-textfield")],k);const wn=g({tagName:"vscode-textfield",elementClass:k,react:_,displayName:"VscodeTextfield",events:{onChange:"change",onInput:"input",onInvalid:"invalid"}}),fi=[x,m`
    :host {
      display: inline-flex;
    }

    button {
      align-items: center;
      background-color: transparent;
      border: 0;
      border-radius: 5px;
      color: var(--vscode-foreground, #cccccc);
      cursor: pointer;
      display: flex;
      outline-offset: -1px;
      outline-width: 1px;
      padding: 0;
      user-select: none;
    }

    button:focus-visible {
      outline-color: var(--vscode-focusBorder, #0078d4);
      outline-style: solid;
    }

    button:hover {
      background-color: var(
        --vscode-toolbar-hoverBackground,
        rgba(90, 93, 94, 0.31)
      );
      outline-style: dashed;
      outline-color: var(--vscode-toolbar-hoverOutline, transparent);
    }

    button:active {
      background-color: var(
        --vscode-toolbar-activeBackground,
        rgba(99, 102, 103, 0.31)
      );
    }

    button.checked {
      background-color: var(
        --vscode-inputOption-activeBackground,
        rgba(36, 137, 219, 0.51)
      );
      outline-color: var(--vscode-inputOption-activeBorder, #2488db);
      outline-style: solid;
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    button.checked vscode-icon {
      color: var(--vscode-inputOption-activeForeground, #ffffff);
    }

    vscode-icon {
      display: block;
      padding: 3px;
    }

    slot:not(.empty) {
      align-items: center;
      display: flex;
      height: 22px;
      padding: 0 5px 0 2px;
    }

    slot.textOnly:not(.empty) {
      padding: 0 5px;
    }
  `];var Ae=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let le=class extends w{constructor(){super(...arguments),this.icon="",this.label=void 0,this.toggleable=!1,this.checked=!1,this._isSlotEmpty=!0}_handleSlotChange(){this._isSlotEmpty=!((this._assignedNodes?.length??0)>0)}_handleButtonClick(){this.toggleable&&(this.checked=!this.checked,this.dispatchEvent(new Event("change")))}render(){const e=this.checked?"true":"false";return d`
      <button
        type="button"
        aria-label=${C(this.label)}
        role=${C(this.toggleable?"switch":void 0)}
        aria-checked=${C(this.toggleable?e:void 0)}
        class=${$({checked:this.toggleable&&this.checked})}
        @click=${this._handleButtonClick}
      >
        ${this.icon?d`<vscode-icon name=${this.icon}></vscode-icon>`:u}
        <slot
          @slotchange=${this._handleSlotChange}
          class=${$({empty:this._isSlotEmpty,textOnly:!this.icon})}
        ></slot>
      </button>
    `}};le.styles=fi;Ae([a({reflect:!0})],le.prototype,"icon",void 0);Ae([a()],le.prototype,"label",void 0);Ae([a({type:Boolean,reflect:!0})],le.prototype,"toggleable",void 0);Ae([a({type:Boolean,reflect:!0})],le.prototype,"checked",void 0);Ae([b()],le.prototype,"_isSlotEmpty",void 0);Ae([_o()],le.prototype,"_assignedNodes",void 0);le=Ae([y("vscode-toolbar-button")],le);g({tagName:"vscode-toolbar-button",elementClass:le,react:_,displayName:"VscodeToolbarButton",events:{onChange:"change"}});const vi=[x,m`
    :host {
      display: block;
    }

    div {
      gap: 4px;
      display: flex;
      align-items: center;
    }
  `];var bi=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};let vt=class extends w{render(){return d`<div><slot></slot></div>`}};vt.styles=vi;vt=bi([y("vscode-toolbar-container")],vt);g({tagName:"vscode-toolbar-container",elementClass:vt,react:_,displayName:"VscodeToolbarContainer"});let Ls=class extends Event{constructor(e,t,s,i){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=t,this.callback=s,this.subscribe=i??!1}};let ds=class{constructor(e,t,s,i){if(this.subscribe=!1,this.provided=!1,this.value=void 0,this.t=(o,r)=>{this.unsubscribe&&(this.unsubscribe!==r&&(this.provided=!1,this.unsubscribe()),this.subscribe||this.unsubscribe()),this.value=o,this.host.requestUpdate(),this.provided&&!this.subscribe||(this.provided=!0,this.callback&&this.callback(o,r)),this.unsubscribe=r},this.host=e,t.context!==void 0){const o=t;this.context=o.context,this.callback=o.callback,this.subscribe=o.subscribe??!1}else this.context=t,this.callback=s,this.subscribe=i??!1;this.host.addController(this)}hostConnected(){this.dispatchRequest()}hostDisconnected(){this.unsubscribe&&(this.unsubscribe(),this.unsubscribe=void 0)}dispatchRequest(){this.host.dispatchEvent(new Ls(this.context,this.host,this.t,this.subscribe))}};class _i{get value(){return this.o}set value(e){this.setValue(e)}setValue(e,t=!1){const s=t||!Object.is(e,this.o);this.o=e,s&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[t,{disposer:s}]of this.subscriptions)t(this.o,s)},e!==void 0&&(this.value=e)}addCallback(e,t,s){if(!s)return void e(this.value);this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:t});const{disposer:i}=this.subscriptions.get(e);e(this.value,i)}clearCallbacks(){this.subscriptions.clear()}}let gi=class extends Event{constructor(e,t){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=t}};class hs extends _i{constructor(e,t,s){super(t.context!==void 0?t.initialValue:s),this.onContextRequest=i=>{if(i.context!==this.context)return;const o=i.contextTarget??i.composedPath()[0];o!==this.host&&(i.stopPropagation(),this.addCallback(i.callback,o,i.subscribe))},this.onProviderRequest=i=>{if(i.context!==this.context||(i.contextTarget??i.composedPath()[0])===this.host)return;const o=new Set;for(const[r,{consumerHost:l}]of this.subscriptions)o.has(r)||(o.add(r),l.dispatchEvent(new Ls(this.context,l,r,!0)));i.stopPropagation()},this.host=e,t.context!==void 0?this.context=t.context:this.context=t,this.attachListeners(),this.host.addController?.(this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new gi(this.context,this.host))}}function Ds({context:n}){return(e,t)=>{const s=new WeakMap;if(typeof t=="object")return{get(){return e.get.call(this)},set(i){return s.get(this).setValue(i),e.set.call(this,i)},init(i){return s.set(this,new hs(this,{context:n,initialValue:i})),i}};{e.constructor.addInitializer((r=>{s.set(r,new hs(r,{context:n}))}));const i=Object.getOwnPropertyDescriptor(e,t);let o;if(i===void 0){const r=new WeakMap;o={get(){return r.get(this)},set(l){s.get(this).setValue(l),r.set(this,l)},configurable:!0,enumerable:!0}}else{const r=i.set;o={...i,set(l){s.get(this).setValue(l),r?.call(this,l)}}}return void Object.defineProperty(e,t,o)}}}function Ms({context:n,subscribe:e}){return(t,s)=>{typeof s=="object"?s.addInitializer((function(){new ds(this,{context:n,callback:i=>{t.set.call(this,i)},subscribe:e})})):t.constructor.addInitializer((i=>{new ds(i,{context:n,callback:o=>{i[s]=o},subscribe:e})}))}}const mi=[x,m`
    :host {
      --vsc-tree-item-arrow-display: flex;
      --internal-selectionBackground: var(
        --vscode-list-inactiveSelectionBackground,
        #37373d
      );
      --internal-selectionForeground: var(--vscode-foreground, #cccccc);
      --internal-selectionIconForeground: var(
        --vscode-icon-foreground,
        #cccccc
      );
      --internal-defaultIndentGuideDisplay: none;
      --internal-highlightedIndentGuideDisplay: block;

      display: block;
    }

    :host(:hover) {
      --internal-defaultIndentGuideDisplay: block;
      --internal-highlightedIndentGuideDisplay: block;
    }

    :host(:focus-within) {
      --internal-selectionBackground: var(
        --vscode-list-activeSelectionBackground,
        #04395e
      );
      --internal-selectionForeground: var(
        --vscode-list-activeSelectionForeground,
        #ffffff
      );
      --internal-selectionIconForeground: var(
        --vscode-list-activeSelectionIconForeground,
        #ffffff
      );
    }

    :host([hide-arrows]) {
      --vsc-tree-item-arrow-display: none;
    }

    :host([indent-guides='none']),
    :host([indent-guides='none']:hover) {
      --internal-defaultIndentGuideDisplay: none;
      --internal-highlightedIndentGuideDisplay: none;
    }

    :host([indent-guides='always']),
    :host([indent-guides='always']:hover) {
      --internal-defaultIndentGuideDisplay: block;
      --internal-highlightedIndentGuideDisplay: block;
    }
  `],Hs="vscode-list",Fs=Symbol("configContext"),fe=n=>n instanceof Element&&n.matches("vscode-tree-item"),yi=n=>n instanceof Element&&n.matches("vscode-tree"),Ns=(n,e)=>{const t=e.length,s=yi(n)?-1:n.level;"branch"in n&&(n.branch=t>0),e.forEach((i,o)=>{"path"in n?i.path=[...n.path,o]:i.path=[o],i.level=s+1,i.dataset.path=i.path.join(".")})},js=n=>{const e=n.lastElementChild;return!e||!fe(e)?n:e.branch&&e.open?js(e):e},It=n=>{if(!n.parentElement||!fe(n.parentElement))return null;const e=Et(n.parentElement);return e||It(n.parentElement)},Et=n=>{let e=n.nextElementSibling;for(;e&&!fe(e);)e=e.nextElementSibling;return e},xi=n=>{const{parentElement:e}=n;if(!e||!fe(n))return null;let t;if(n.branch&&n.open){const s=n.querySelector("vscode-tree-item");s?t=s:(t=Et(n),t||(t=It(n)))}else t=Et(n),t||(t=It(n));return t||n},wi=n=>{const{parentElement:e}=n;if(!e||!fe(n))return null;let t=n.previousElementSibling;for(;t&&!fe(t);)t=t.previousElementSibling;return!t&&fe(e)?e:t&&t.branch&&t.open?js(t):t};function ps(n){return!n.parentElement||!fe(n.parentElement)?null:n.parentElement}var pe=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const us={singleClick:"singleClick",doubleClick:"doubleClick"},Ot={none:"none"},Ci=[" ","ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Enter","Escape","Shift"];let ee=class extends w{constructor(){super(),this.expandMode="singleClick",this.hideArrows=!1,this.indent=8,this.indentGuides="onHover",this.multiSelect=!1,this._treeContextState={isShiftPressed:!1,activeItem:null,selectedItems:new Set,allItems:null,itemListUpToDate:!1,focusedItem:null,prevFocusedItem:null,hasBranchItem:!1,rootElement:this,highlightedItems:new Set,highlightIndentGuides:()=>{this._highlightIndentGuides()},emitSelectEvent:()=>{this._emitSelectEvent()}},this._configContext={hideArrows:this.hideArrows,expandMode:this.expandMode,indent:this.indent,indentGuides:this.indentGuides,multiSelect:this.multiSelect},this._handleComponentKeyDown=e=>{const t=e.key;switch(Ci.includes(t)&&(e.stopPropagation(),e.preventDefault()),t){case" ":case"Enter":this._handleEnterPress();break;case"ArrowDown":this._handleArrowDownPress();break;case"ArrowLeft":this._handleArrowLeftPress(e);break;case"ArrowRight":this._handleArrowRightPress();break;case"ArrowUp":this._handleArrowUpPress();break;case"Shift":this._handleShiftPress();break}},this._handleComponentKeyUp=e=>{e.key==="Shift"&&(this._treeContextState.isShiftPressed=!1)},this._handleSlotChange=()=>{this._treeContextState.itemListUpToDate=!1,Ns(this,this._assignedTreeItems),this.updateComplete.then(()=>{if(this._treeContextState.activeItem===null){const e=this.querySelector(":scope > vscode-tree-item");e&&(e.active=!0)}})},this.addEventListener("keyup",this._handleComponentKeyUp),this.addEventListener("keydown",this._handleComponentKeyDown)}connectedCallback(){super.connectedCallback(),this.role="tree"}willUpdate(e){this._updateConfigContext(e),e.has("multiSelect")&&(this.ariaMultiSelectable=this.multiSelect?"true":"false")}expandAll(){this.querySelectorAll("vscode-tree-item").forEach(t=>{t.branch&&(t.open=!0)})}collapseAll(){this.querySelectorAll("vscode-tree-item").forEach(t=>{t.branch&&(t.open=!1)})}updateHasBranchItemFlag(){const e=this._assignedTreeItems.some(t=>t.branch);this._treeContextState={...this._treeContextState,hasBranchItem:e}}_emitSelectEvent(){const e=new CustomEvent("vsc-tree-select",{detail:Array.from(this._treeContextState.selectedItems)});this.dispatchEvent(e)}_highlightIndentGuideOfItem(e){if(e.branch&&e.open)e.highlightedGuides=!0,this._treeContextState.highlightedItems?.add(e);else{const t=ps(e);t&&(t.highlightedGuides=!0,this._treeContextState.highlightedItems?.add(t))}}_highlightIndentGuides(){this.indentGuides!==Ot.none&&(this._treeContextState.highlightedItems?.forEach(e=>e.highlightedGuides=!1),this._treeContextState.highlightedItems?.clear(),this._treeContextState.activeItem&&this._highlightIndentGuideOfItem(this._treeContextState.activeItem),this._treeContextState.selectedItems.forEach(e=>{this._highlightIndentGuideOfItem(e)}))}_updateConfigContext(e){const{hideArrows:t,expandMode:s,indent:i,indentGuides:o,multiSelect:r}=this;e.has("hideArrows")&&(this._configContext={...this._configContext,hideArrows:t}),e.has("expandMode")&&(this._configContext={...this._configContext,expandMode:s}),e.has("indent")&&(this._configContext={...this._configContext,indent:i}),e.has("indentGuides")&&(this._configContext={...this._configContext,indentGuides:o}),e.has("multiSelect")&&(this._configContext={...this._configContext,multiSelect:r})}_focusItem(e){e.active=!0,e.updateComplete.then(()=>{e.focus(),this._highlightIndentGuides()})}_focusPrevItem(){if(this._treeContextState.focusedItem){const e=wi(this._treeContextState.focusedItem);e&&(this._focusItem(e),this._treeContextState.isShiftPressed&&this.multiSelect&&(e.selected=!e.selected,this._emitSelectEvent()))}}_focusNextItem(){if(this._treeContextState.focusedItem){const e=xi(this._treeContextState.focusedItem);e&&(this._focusItem(e),this._treeContextState.isShiftPressed&&this.multiSelect&&(e.selected=!e.selected,this._emitSelectEvent()))}}_handleArrowRightPress(){if(!this._treeContextState.focusedItem)return;const{focusedItem:e}=this._treeContextState;e.branch&&(e.open?this._focusNextItem():e.open=!0)}_handleArrowLeftPress(e){if(e.ctrlKey){this.collapseAll();return}if(!this._treeContextState.focusedItem)return;const{focusedItem:t}=this._treeContextState,s=ps(t);t.branch?t.open?t.open=!1:s&&s.branch&&this._focusItem(s):s&&s.branch&&this._focusItem(s)}_handleArrowDownPress(){this._treeContextState.focusedItem?this._focusNextItem():this._focusItem(this._assignedTreeItems[0])}_handleArrowUpPress(){this._treeContextState.focusedItem?this._focusPrevItem():this._focusItem(this._assignedTreeItems[0])}_handleEnterPress(){const{focusedItem:e}=this._treeContextState;e&&(this._treeContextState.selectedItems.forEach(t=>t.selected=!1),this._treeContextState.selectedItems.clear(),this._highlightIndentGuides(),e.selected=!0,this._emitSelectEvent(),e.branch&&(e.open=!e.open))}_handleShiftPress(){this._treeContextState.isShiftPressed=!0}render(){return d`<div>
      <slot @slotchange=${this._handleSlotChange}></slot>
    </div>`}};ee.styles=mi;pe([a({type:String,attribute:"expand-mode"})],ee.prototype,"expandMode",void 0);pe([a({type:Boolean,reflect:!0,attribute:"hide-arrows"})],ee.prototype,"hideArrows",void 0);pe([a({type:Number,reflect:!0})],ee.prototype,"indent",void 0);pe([a({type:String,attribute:"indent-guides",useDefault:!0,reflect:!0})],ee.prototype,"indentGuides",void 0);pe([a({type:Boolean,reflect:!0,attribute:"multi-select"})],ee.prototype,"multiSelect",void 0);pe([Ds({context:Hs})],ee.prototype,"_treeContextState",void 0);pe([Ds({context:Fs})],ee.prototype,"_configContext",void 0);pe([W({selector:"vscode-tree-item"})],ee.prototype,"_assignedTreeItems",void 0);ee=pe([y("vscode-tree")],ee);g({tagName:"vscode-tree",elementClass:ee,react:_,displayName:"VscodeTree",events:{onVscTreeSelect:"vsc-tree-select"}});const $i=[x,m`
    :host {
      --hover-outline-color: transparent;
      --hover-outline-style: solid;
      --hover-outline-width: 0;

      --selected-outline-color: transparent;
      --selected-outline-style: solid;
      --selected-outline-width: 0;

      cursor: pointer;
      display: block;
      user-select: none;
    }

    ::slotted(vscode-icon) {
      display: block;
    }

    .root {
      display: block;
    }

    .wrapper {
      align-items: flex-start;
      color: var(--vscode-foreground, #cccccc);
      display: flex;
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      font-weight: var(--vscode-font-weight, normal);
      outline-offset: -1px;
      padding-right: 12px;
    }

    .wrapper:hover {
      background-color: var(--vscode-list-hoverBackground, #2a2d2e);
      color: var(
        --vscode-list-hoverForeground,
        var(--vscode-foreground, #cccccc)
      );
    }

    :host([selected]) .wrapper {
      color: var(--internal-selectionForeground);
      background-color: var(--internal-selectionBackground);
    }

    :host([selected]) ::slotted(vscode-icon) {
      color: var(--internal-selectionForeground);
    }

    :host(:focus) {
      outline: none;
    }

    :host(:focus) .wrapper.active {
      outline-color: var(
        --vscode-list-focusAndSelectionOutline,
        var(--vscode-list-focusOutline, #0078d4)
      );
      outline-style: solid;
      outline-width: 1px;
    }

    .arrow-container {
      align-items: center;
      display: var(--vsc-tree-item-arrow-display);
      height: 22px;
      justify-content: center;
      padding-left: 8px;
      padding-right: 6px;
      width: 16px;
    }

    .arrow-container svg {
      display: block;
      fill: var(--vscode-icon-foreground, #cccccc);
    }

    .arrow-container.icon-rotated svg {
      transform: rotate(90deg);
    }

    :host([selected]) .arrow-container svg {
      fill: var(--internal-selectionIconForeground);
    }

    .icon-container {
      align-items: center;
      display: flex;
      margin-bottom: 3px;
      margin-top: 3px;
      overflow: hidden;
    }

    .icon-container slot {
      display: block;
    }

    .icon-container.has-icon {
      height: 16px;
      margin-right: 6px;
      width: 16px;
    }

    .children {
      position: relative;
    }

    .children.guide:before {
      background-color: var(
        --vscode-tree-inactiveIndentGuidesStroke,
        rgba(88, 88, 88, 0.4)
      );
      content: '';
      display: none;
      height: 100%;
      left: var(--indentation-guide-left);
      pointer-events: none;
      position: absolute;
      width: 1px;
      z-index: 1;
    }

    .children.guide.default-guide:before {
      display: var(--internal-defaultIndentGuideDisplay);
    }

    .children.guide.highlighted-guide:before {
      display: var(--internal-highlightedIndentGuideDisplay);
      background-color: var(--vscode-tree-indentGuidesStroke, #585858);
    }

    .content {
      line-height: 22px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([branch]) ::slotted(vscode-tree-item) {
      display: none;
    }

    :host([branch][open]) ::slotted(vscode-tree-item) {
      display: block;
    }
  `];var q=function(n,e,t,s){var i=arguments.length,o=i<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(n,e,t,s);else for(var l=n.length-1;l>=0;l--)(r=n[l])&&(o=(i<3?r(o):i>3?r(e,t,o):r(e,t))||o);return i>3&&o&&Object.defineProperty(e,t,o),o};const fs=3,Si=30,ki=d`<svg
  width="16"
  height="16"
  viewBox="0 0 16 16"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10.072 8.024L5.715 3.667l.618-.62L11 7.716v.618L6.333 13l-.618-.619 4.357-4.357z"
  />
</svg>`;function Ii(n){return!n.parentElement||!(n.parentElement instanceof L)?null:n.parentElement}let L=class extends w{set selected(e){this._selected=e,this._treeContextState.selectedItems.add(this),this.ariaSelected=e?"true":"false"}get selected(){return this._selected}set path(e){this._path=e}get path(){return this._path}constructor(){super(),this.active=!1,this.branch=!1,this.hasActiveItem=!1,this.hasSelectedItem=!1,this.highlightedGuides=!1,this.open=!1,this.level=0,this._selected=!1,this._path=[],this._hasBranchIcon=!1,this._hasBranchOpenedIcon=!1,this._hasLeafIcon=!1,this._treeContextState={isShiftPressed:!1,selectedItems:new Set,allItems:null,itemListUpToDate:!1,focusedItem:null,prevFocusedItem:null,hasBranchItem:!1,rootElement:null,activeItem:null},this._handleMainSlotChange=()=>{this._mainSlotChange(),this._treeContextState.itemListUpToDate=!1},this._handleComponentFocus=()=>{this._treeContextState.focusedItem&&this._treeContextState.focusedItem!==this&&(this._treeContextState.isShiftPressed||(this._treeContextState.prevFocusedItem=this._treeContextState.focusedItem),this._treeContextState.focusedItem=null),this._treeContextState.focusedItem=this},this._internals=this.attachInternals(),this.addEventListener("focus",this._handleComponentFocus)}connectedCallback(){super.connectedCallback(),this._mainSlotChange(),this.role="treeitem",this.ariaDisabled="false"}willUpdate(e){e.has("active")&&this._toggleActiveState(),(e.has("open")||e.has("branch"))&&this._setAriaExpanded()}_setAriaExpanded(){this.branch?this.ariaExpanded=this.open?"true":"false":this.ariaExpanded=null}_setHasActiveItemFlagOnParent(e,t){const s=Ii(e);s&&(s.hasActiveItem=t)}_toggleActiveState(){this.active?(this._treeContextState.activeItem&&(this._treeContextState.activeItem.active=!1,this._setHasActiveItemFlagOnParent(this._treeContextState.activeItem,!1)),this._treeContextState.activeItem=this,this._setHasActiveItemFlagOnParent(this,!0),this.tabIndex=0,this._internals.states.add("active")):(this._treeContextState.activeItem===this&&(this._treeContextState.activeItem=null,this._setHasActiveItemFlagOnParent(this,!1)),this.tabIndex=-1,this._internals.states.delete("active"))}_selectItem(e){const{selectedItems:t}=this._treeContextState,{multiSelect:s}=this._configContext;s&&e?this.selected?(this.selected=!1,t.delete(this)):(this.selected=!0,t.add(this)):(t.forEach(i=>i.selected=!1),t.clear(),this.selected=!0,t.add(this))}_selectRange(){const e=this._treeContextState.prevFocusedItem;if(!e||e===this)return;this._treeContextState.itemListUpToDate||(this._treeContextState.allItems=this._treeContextState.rootElement.querySelectorAll("vscode-tree-item"),this._treeContextState.allItems&&this._treeContextState.allItems.forEach((i,o)=>{i.dataset.score=o.toString()}),this._treeContextState.itemListUpToDate=!0);let t=+(e.dataset.score??-1),s=+(this.dataset.score??-1);t>s&&([t,s]=[s,t]),this._treeContextState.selectedItems.forEach(i=>i.selected=!1),this._treeContextState.selectedItems.clear(),this._selectItemsAndAllVisibleDescendants(t,s)}_selectItemsAndAllVisibleDescendants(e,t){let s=e;for(;s<=t;)if(this._treeContextState.allItems){const i=this._treeContextState.allItems[s];if(i.branch&&!i.open){i.selected=!0;const o=i.querySelectorAll("vscode-tree-item").length;s+=o}else i.branch&&i.open?(i.selected=!0,s+=this._selectItemsAndAllVisibleDescendants(s+1,t)):(i.selected=!0,s+=1)}return s}_mainSlotChange(){this._initiallyAssignedTreeItems.forEach(e=>{e.setAttribute("slot","children")})}_handleChildrenSlotChange(){Ns(this,this._childrenTreeItems),this._treeContextState.rootElement&&this._treeContextState.rootElement.updateHasBranchItemFlag()}_handleContentClick(e){e.stopPropagation();const t=e.ctrlKey||e.metaKey,s=e.shiftKey;s&&this._configContext.multiSelect?(this._selectRange(),this._treeContextState.emitSelectEvent?.(),this.updateComplete.then(()=>{this._treeContextState.highlightIndentGuides?.()})):(this._selectItem(t),this._treeContextState.emitSelectEvent?.(),this.updateComplete.then(()=>{this._treeContextState.highlightIndentGuides?.()}),this._configContext.expandMode===us.singleClick&&this.branch&&!(this._configContext.multiSelect&&t)&&(this.open=!this.open)),this.active=!0,s||(this._treeContextState.prevFocusedItem=this)}_handleDoubleClick(e){this._configContext.expandMode===us.doubleClick&&this.branch&&!(this._configContext.multiSelect&&(e.ctrlKey||e.metaKey))&&(this.open=!this.open)}_handleIconSlotChange(e){const t=e.target,s=t.assignedElements().length>0;switch(t.name){case"icon-branch":this._hasBranchIcon=s;break;case"icon-branch-opened":this._hasBranchOpenedIcon=s;break;case"icon-leaf":this._hasLeafIcon=s;break}}render(){const{hideArrows:e,indent:t,indentGuides:s}=this._configContext,{hasBranchItem:i}=this._treeContextState;let o=fs+this.level*t;const r=e?3:13,l=fs+this.level*t+r;!this.branch&&!e&&i&&(o+=Si);const c=this._hasBranchIcon&&this.branch||this._hasBranchOpenedIcon&&this.branch&&this.open||this._hasLeafIcon&&!this.branch,h={wrapper:!0,active:this.active},f={children:!0,guide:s!==Ot.none,"default-guide":s!==Ot.none,"highlighted-guide":this.highlightedGuides},p={"icon-container":!0,"has-icon":c};return d` <div class="root">
      <div
        class=${$(h)}
        @click=${this._handleContentClick}
        @dblclick=${this._handleDoubleClick}
        .style=${U({paddingLeft:`${o}px`})}
      >
        ${this.branch&&!e?d`<div
              class=${$({"arrow-container":!0,"icon-rotated":this.open})}
            >
              ${ki}
            </div>`:u}
        <div class=${$(p)}>
          ${this.branch&&!this.open?d`<slot
                name="icon-branch"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`:u}
          ${this.branch&&this.open?d`<slot
                name="icon-branch-opened"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`:u}
          ${this.branch?u:d`<slot
                name="icon-leaf"
                @slotchange=${this._handleIconSlotChange}
              ></slot>`}
        </div>
        <div class="content" part="content">
          <slot @slotchange=${this._handleMainSlotChange}></slot>
        </div>
      </div>
      <div
        class=${$(f)}
        .style=${U({"--indentation-guide-left":`${l}px`})}
        role="group"
        part="children"
      >
        <slot
          name="children"
          @slotchange=${this._handleChildrenSlotChange}
        ></slot>
      </div>
    </div>`}};L.styles=$i;q([a({type:Boolean})],L.prototype,"active",void 0);q([a({type:Boolean,reflect:!0})],L.prototype,"branch",void 0);q([a({type:Boolean})],L.prototype,"hasActiveItem",void 0);q([a({type:Boolean})],L.prototype,"hasSelectedItem",void 0);q([a({type:Boolean})],L.prototype,"highlightedGuides",void 0);q([a({type:Boolean,reflect:!0})],L.prototype,"open",void 0);q([a({type:Number,reflect:!0})],L.prototype,"level",void 0);q([a({type:Boolean,reflect:!0})],L.prototype,"selected",null);q([b()],L.prototype,"_hasBranchIcon",void 0);q([b()],L.prototype,"_hasBranchOpenedIcon",void 0);q([b()],L.prototype,"_hasLeafIcon",void 0);q([Ms({context:Hs,subscribe:!0})],L.prototype,"_treeContextState",void 0);q([Ms({context:Fs,subscribe:!0})],L.prototype,"_configContext",void 0);q([W({selector:"vscode-tree-item"})],L.prototype,"_initiallyAssignedTreeItems",void 0);q([W({selector:"vscode-tree-item",slot:"children"})],L.prototype,"_childrenTreeItems",void 0);L=q([y("vscode-tree-item")],L);g({tagName:"vscode-tree-item",elementClass:L,react:_,displayName:"VscodeTreeItem"});export{qi as V,Gi as a,Xi as b,Mi as c,Ji as d,cn as e,sn as f,Li as g,wn as h};
