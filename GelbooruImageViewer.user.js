// ==UserScript==
// @id             gelbooru-slide
// @name           Gelbooru Image Viewer
// @version        1.9.9.8
// @namespace      intermission
// @author         intermission
// @license        WTFPL; http://www.wtfpl.net/about/
// @description    Adds a fullscreen image view option when you click on images and various other neat features
// @match          *://gelbooru.com/*
// @match          *://rule34.xxx/*
// @match          *://e621.net/*
// @match          *://*.booru.org/*
// @match          *://*.paheal.net/*
// @match          *://yande.re/post*
// @match          *://lolibooru.moe/*
// @match          *://konachan.com/*
// @match          *://atfbooru.ninja/*
// @match          *://safebooru.org/*
// @match          *://hypnohub.net/*
// @match          *://tbib.org/*
// @match          *://booru.splatoon.ink/*
// @match          *://*.sankakucomplex.com/*
// @exclude        http://www.sankakucomplex.com/*
// @exclude        https://www.sankakucomplex.com/*
// @run-at         document-start
// @grant          GM_registerMenuCommand
// @grant          GM_xmlhttpRequest
// @grant          GM_info
// @updateURL      https://github.com/friendlyanon/GelbooruEnhancement/raw/master/GelbooruImageViewer.user.js
// @downloadURL    https://github.com/friendlyanon/GelbooruEnhancement/raw/master/GelbooruImageViewer.user.js
// ==/UserScript==

/* This program is free software. It comes without any warranty, to the extent
 * permitted by applicable law. You can redistribute it and/or modify it under
 * the terms of the Do What The Fuck You Want To Public License, Version 2, as
 * published by Sam Hocevar. See http://www.wtfpl.net/ for more details. */

"use strict";

/**
 * DEBUG
 */
const WIREFRAME = 0; // 0 - off, 1 - on during image viewer, 2 - always on
const SAFE_DEBUG = false;

/**
 * BASIC CONSTANTS
 */
const d = document;
const w = window;
const stor = localStorage;
const uW = unsafeWindow || w;
const domain = location.hostname.match(/[^.]+\.[^.]+$/)[0];
const scriptInfo = GM_info;
const ns = "gelbooru-slide";
const fullImage = stor[ns] === "true";
const passive = { passive: true };
const once = { once: true };
const svg = '<svg xmlns="http://www.w3.org/2000/svg" ';
const httpOk = [200, 302, 304];

/**
 * `site` OBJECT CONSTRUCTION
 * site: {
 *   name: hostname of current site
 *   inject: string if a site needs a script to be injected to work this userJS
 *   [name]: dynamic property, hostname of current site w/o TLD, returns true
 * }
 */
const site = (() => {
  const info = scriptInfo.scriptMetaStr;
  const regex = /match.*?[/.](\w+\.\w+)\//g;
  const ret = { name: "" };
  let line, name;
  while (line = regex.exec(info)) {
    if (line[1] === domain) {
      ret[name = domain.split(".")[0]] = true;
      ret.name = name;
      break;
    }
  }
  const qS = 'document.querySelector("#post-list > .content';
  const iB = 'insertBefore';
  switch(name) {
   case "hypnohub":
    ret.inject = 'Object.defineProperties(window.PostModeMenu, {\n  "post_mouseover": {\n    value() {}\n  },\n  "post_mouseout": {\n    value() {}\n  }\n});';
    break;
   case "sankakucomplex":
    ret.inject = `Object.defineProperty(${qS}"), "${iB}", {\n  value: function ${iB}(newEl, pos) {\n    if (newEl.nodeType !== 11)\n      return (pos.nodeType === 3 ? pos.nextElementSibling : pos).insertAdjacentElement("beforebegin", newEl);\n    else {\n      let s = ${qS} > div:first-of-type");\n      for (let i = 0, t, arr = newEl.firstElementChild.children; t = arr[i]; ++i) {\n        t.classList.remove("blacklisted");\n        t.removeAttribute("style");\n        s.appendChild(t);\n      }\n    }\n    return newEl;\n  }\n})`;
  }
  return Object.freeze(ret);
})();

/**
 * VARIABLE FOR CSS
 * paheal's thumbnails are 200x200 instead of 180x180 (every other booru)
 */
const paheal = site.paheal ? 20 : 0;

/**
 * SVG CONSTANTS
 */
const SVG = {
  play: `${svg}width="50" height="50"><rect rx="5" height="48" width="48" y="1" x="1" fill="#fff" /><polygon fill="#000" points="16 12 16 38 36 25" /></svg>`,
  pause: `${svg}width="50" height="50"><rect fill="#fff" x="1" y="1" width="48" height="48" rx="5" /><rect fill="#000" x="12" y="12" width="10" height="26" /><rect fill="#000" x="28" y="12" width="10" height="26" /></svg>`,
  next: ((z, a, b, c, r) => `${svg}viewBox="0 0 118 118"><style>.a{fill:none;stroke-linejoin:round;stroke-width:4;stroke:#fff}</style><path d="M78.6 71.8l-7.6-1.6${a}${z}-1-3.7l5.8-5.2a4.3 4.3${z}-4.2-7.3l-7.4 2.4a29.7 29.7${z}-2.7-2.7l2.4-7.4a4.3 4.3${z}-7.3-4.2L51.5 48${a}${z}-3.7-1l-1.6-7.6a4.3 4.3${z}-8.4 0l-1.6 7.6${a}${z}-3.7 1l-5.2-5.8a4.3 4.3${z}-7.3 4.2l2.4 7.4a29.7 29.7${z}-2.7 2.7l-7.4-2.4a4.3 4.3${z}-4.2 7.3L14 66.5${a}${z}-1 3.7l-7.6 1.6a4.3 4.3${z} 0 8.4l7.6 1.6${a}${z} 1 3.7l-5.8 5.2a4.3 4.3${z} 4.2 7.3l7.4-2.4a29.8 29.8${z} 2.7 2.7l-2.4 7.4a4.3 4.3${z} 7.3 4.2l5.2-5.8${a}${z} 3.7 1l1.6 7.6a4.3 4.3${z} 8.4 0l1.6-7.6${a}${z} 3.7-1l5.2 5.8a4.3 4.3${z} 7.3-4.2l-2.4-7.4a29.8 29.8${z} 2.7-2.7l7.4 2.4a4.3 4.3${z} 4.2-7.3L70 85.5${a}${z} 1-3.7l7.6-1.6A4.3 4.3${z} 78.6 71.8zM42 92.5A16.5 16.5 0 1 1 58.5 76 16.5 16.5 0 0 1 42 92.5z${r}0 42 76.051" to="360 42 76.051" dur=3${c}<path d="M113.2 24.5l-6.9-1.6${b}${z}-1.1-3l3.7-5.9a3.6 3.6${z}-5-5L98 12.8${b}${z}-3-1.1l-1.6-6.9a3.6 3.6${z}-7 0l-1.6 6.9a16.9 16.9${z}-2.8 1.2l-6-3.8a3.6 3.6${z}-5 5l3.8 6a16.9 16.9${z}-1.2 2.8l-6.9 1.6a3.6 3.6${z} 0 7l6.9 1.6${b}${z} 1.1 3l-3.7 5.9a3.6 3.6${z} 5 5L82 43.2${b}${z} 3 1.1l1.6 6.9a3.6 3.6${z} 7 0l1.6-6.9a16.9 16.9${z} 2.8-1.2l6 3.8a3.6 3.6${z} 5-5l-3.8-6a16.9 16.9${z} 1.2-2.8l6.9-1.6A3.6 3.6${z} 113.2 24.5z${r}360 89.97 28" to="0 89.97 28" dur=2${c}<circle r=8.4 style="fill:none;stroke-width:4;stroke:#fff" cx=89.97 cy=28></circle></svg>`)(" 0 0 0", "a29.3 29.3", "a20.6 20.6", 's></animateTransform></path>', '" class=a><animateTransform attributeName=transform type=rotate repeatCount=indefinite from="'),
  debug: (l => `<div style="width:calc(100vw - 2px);height:${198+paheal}px;position:absolute;top:0;left:0;border:1px solid cyan"></div><div style="width:calc(100vw - 2px);height:calc(100vh - ${202+paheal}px);position:absolute;bottom:0;border:1px solid red;display:block">${svg}viewBox="0 0 200 200" preserveAspectRatio=none style="width: 100%;height: 100%;"><style>.d{fill:none;stroke-width:1px;stroke:#ff0}</style>${l}d y2=15 x2=200 y1=15></line>${l}d y2=185.5 x2=200 y1=185.5></line>${l}d x2=15 y1=200 x1=15></line>${l}d x2=185 y1=200 x1=185></line></svg></div><div style="width:100vw;height:100vh;position:absolute;top:0;left:0">${svg}viewBox="0 0 200 200" preserveAspectRatio=none style="width: 100%;height: 100%;"><style>.b{fill:none;stroke-width:1px;stroke:#0f0}</style>${l}b y2=100 x2=200 y1=100></line>${l}b y2=200 x2=100 x1=100></line></svg></div>`)('<line vector-effect="non-scaling-stroke" shape-rendering="crispEdges" class='),
  gif: `${svg}viewBox="-10 -3 36 22"><path d="M26 16c0 1.6-1.3 3-3 3H-7c-1.7 0-3-1.4-3-3V0c0-1.7 1.3-3 3-3h30c1.7 0 3 1.3 3 3v16z" opacity=".6"/><path fill="#FFF" d="M22-1H-6c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h28c1.1 0 2-.9 2-2V1c0-1.1-.9-2-2-2zM6.3 13.2H4.9l-.2-1.1c-.4.5-.8.9-1.3 1.1-.5.2-1 .3-1.4.3-.8 0-1.5-.1-2.1-.4s-1.1-.6-1.5-1.1-.7-1-1-1.6C-2.9 9.7-3 9-3 8.3c0-.7.1-1.4.3-2.1.2-.6.5-1.2 1-1.7s.9-.8 1.5-1.1C.5 3.2 1.2 3 1.9 3c.5 0 1 .1 1.5.2.5.2.9.4 1.3.7.4.3.7.7 1 1.1.2.5.4 1 .4 1.5H4c-.1-.5-.3-.9-.7-1.2-.4-.3-.8-.4-1.4-.4-.5 0-.9.1-1.2.3-.4.1-.7.4-.9.7-.2.3-.3.7-.4 1.1s-.1.8-.1 1.3c0 .4 0 .8.1 1.2s.3.8.5 1.1c.2.3.5.6.8.8s.8.3 1.3.3c.7 0 1.3-.2 1.7-.6.4-.4.6-.9.7-1.6H2.1V7.8h4.2v5.4zm4 0H8.1v-10h2.2v10zm8.9-8.1h-4.8v2.3h4.2v1.7h-4.2v4.1h-2.2v-10h7v1.9z"/></svg>`,
  warn: `${svg}viewBox="0 0 1000 1000"><style>path.a{fill:red;stroke-width:8px;stroke:black;}</style><path d="M500 673c-17 0-34 4-48 11-24 12-44 33-55 58-5 14-9 28-9 44 0 62 50 113 112 113 63 0 113-50 113-113C613 723 562 673 500 673zM500 843c-32 0-58-26-58-58 0-32 26-58 58-58 32 0 59 26 59 58C558 817 532 843 500 843z" class="a"/><path d="M285 643c4 3 8 5 12 5l132-138c-57 14-109 47-149 94C272 617 273 634 285 643z" class="a"/><path d="M606 522L565 565c43 13 83 39 112 75 5 7 13 10 21 10 6 0 12-2 17-6 11-9 13-27 3-38C689 568 650 539 606 522z" class="a"/><path d="M500 384c16 0 32 1 48 3l46-48c-30-7-61-10-93-10-137 0-265 61-351 167-10 11-8 29 4 38 5 4 11 7 17 7 8 0 15-4 21-10C267 438 379 384 500 384z" class="a"/><path d="M729 393l-38 40c45 24 86 58 119 98 10 12 27 14 39 4 12-9 13-27 4-38C817 454 776 420 729 393z" class="a"/><path d="M685 244l41-43c-70-28-147-42-226-42-188 0-364 84-484 230-9 12-7 29 4 39 5 4 11 6 17 6 8 0 16-3 21-10 109-133 270-210 442-210C564 214 626 224 685 244z" class="a"/><path d="M984 389c-38-48-83-88-133-121l-38 40c49 32 93 71 130 117 9 11 27 13 38 4C991 418 994 401 984 389z" class="a"/><path d="M907 110c-11-10-28-10-38 1L181 828c-10 11-10 28 1 38 5 5 12 8 19 8 7 0 14-3 20-8L908 148C918 138 918 120 907 110z" class="a"/></svg>`
};

/**
 * GLOBAL VARIABLE INDICATING WHETHER WE ARE IN SLIDESHOW MODE OR NOT
 */
let slideshow;

/**
 * NAMESPACES
 */
let Pos, Menu, Btn, Main, Prog, Sank, Hover;

/**
 * SET AN INITIAL VALUE ON FIRST RUN
 */
if (!stor[ns]) stor[ns] = "false";

/**
 * PAHEAL AND BOORU.ORG DON'T USE SAMPLES
 */
switch(site.name) {
 case "splatoon": case "booru": case "paheal":
  break;
 default:
  GM_registerMenuCommand(`Current image mode: ${fullImage ? "Always original size" : "Sample only"}`, () => { stor[ns] = fullImage ? "false" : "true"; location.reload(); });
  break;
}
  

/**
 * JQUERY INSPIRED UTILITIES
 * details won't be documented, just look at the code
 */
const $$ = (a, b = d) => {
  const nodeList = b.querySelectorAll(a);
  let l = nodeList.length;
  if (!l) return [];
  const array = new Array(l);
  while(~--l) array[l] = nodeList[l];
  return array;
};
const $ = (a, b = d) => b.querySelector(a);

$.keys = Object.keys;

$.extend = function(obj, props) {
  const arr = $.keys(props);
  let key, i = arr.length;
  while(~--i) obj[key = arr[i]] = props[key];
  return obj;
};

$.extend($, {
  cache(id, b) {
    const val = fullImage ? "original" : "sample";
    let ret, obj, temp;
    if (!b) {
      const json = $.safe(JSON.parse, $.u, stor[ns + id]);
      if (json !== $.safe.error) ret = json[val];
      ret = ret || "loading";
    }
    else {
      const json = $.safe(JSON.parse, $.u, stor[ns + id]);
      if (json !== $.safe.error) temp = json;
      obj = temp || {};
      obj[val] = b;
      stor[ns + id] = JSON.stringify(obj);
      ret = b;
    }
    return ret;
  },
  base: a => a.match(Main.r[5]),
  current: src => $("a[data-id] > img[src*='" + $.base(src || Main.el.dataset.src) + "']").parentNode,
  _find(method, el, a) {
    el = el[(method ? "next" : "previous") + "ElementSibling"];
    a = $("a[data-full]", el);
    return [el, a];
  },
  find(el, method) {
    let a;
    el = el.parentNode;
    do {
      const search = $.safe($._find, $.u, method, el, a);
      if (search === $.safe.error) return false;
      else [el, a] = search;
      if (a) break;
      a = false;
    } while(!a);
    return a;
  },
  preload() {
    if (site.sankakucomplex) return;
    const curr = $.current();
    Main.req($.find(curr, true));
    Main.req($.find(curr, false));
  },
  keyDown(e) {
    let move, warn;
    if (slideshow) return;
    if (e.ctrlKey && Main.el.style.objectFit !== "none")
      Main.el.style.objectFit = "none";
    if (e.warn)
      move = warn = true;
    else {
      switch(e.keyCode) {
       case 32: case 39: // Space, →
        if (e.preventDefault) e.preventDefault();
        move = true;
        break;
       case 37: // ←
        move = false;
        break;
       case 38: // ↑
        return e.event ? Menu.fn(e.event) : w.location = $.current().href;
       case 40: // ↓
        e.preventDefault();
        return Main.el.click();
      }
    }
    if (typeof move !== "undefined") {
      if (!warn && (e = $.find($.current(), move))) {
        if (Prog.el) {
          Prog.el.classList.remove("progdone");
          Prog.el.style.width = 0;
        }
        Main.slide($("img", e).src);
        Pos.fn(move);
        $.preload();
      }
      else if (Hover.nextEl && !Hover.nextEl.classList.contains("loadingu") && move === true)
        Hover.next(true);
      else if (!$.keyDown.el) {
        const el = $.keyDown.el = $.c("div");
        el.classList.add("nomoreimages");
        let side = move ? "right" : "left";
        el.setAttribute("style", "background: linear-gradient(to " + side + ", transparent, rgba(255,0,0,.5));" + side + ": 0;");
        $.add(el);
      }
    }
  },
  keyUp() {
    if (slideshow) return;
    if (Main.el.style.objectFit === "none") {
      $.zoom.el = $.rm($.zoom.el);
      Main.el.removeAttribute("style");
    }
  },
  zoom(e) {
    if (Main.gif.hasAttribute("style")) return;
    if (!e.ctrlKey) {
      $.zoom.el = $.rm($.zoom.el);
      return Main.el.removeAttribute("style");
    }
    else Main.el.style.objectFit = "none";
    if (slideshow) return;
    const minY = 200 + paheal, maxX = w.innerWidth, maxY = w.innerHeight,
      { clientX: x, clientY: y } = e,
      tall = Main.el.naturalHeight > maxY, wide = Main.el.naturalWidth > maxX;
    if (!$.zoom.el) {
      let el = $.zoom.el = $.c("span");
      el.id = "zoom_top";
      el.innerHTML = "<span></span>";
      $.add(el);
    }
    if ((wide || tall) && minY < y && maxY >= y && 0 <= x && maxX >= x) {
      let xPos = 50, yPos = 50, margin, width, height;
      if (tall) {
        margin = (maxY - minY) * 0.075;
        height = maxY - minY - margin * 2;
        if (y < minY + margin)
          yPos = 0;
        else if (y > maxY - margin)
          yPos = 100;
        else
          yPos = (y - minY - margin) / height * 100;
      }
      if (wide) {
        margin = maxX * 0.075;
        width = maxX - margin * 2;
        if (x < margin)
          xPos = 0;
        else if (x > maxX - margin)
          xPos = 100;
        else
          xPos = (x - margin) / width * 100;
      }
      $.zoom.el.removeAttribute("style");
      if (tall && yPos < 10) {
        let w = maxX / 40 + 30;
        $.zoom.el.style.left = `${x - (w < 55 ? 55 : w)}px`;
        void $.zoom.el.offsetWidth; // reflow hack
        $.zoom.el.style.animationName = "topglowything";
      }
      Main.el.style.objectPosition = `${xPos}% ${yPos}%`;
    }
    else if (!Main.el.style.objectPosition)
      Main.el.style.objectPosition = "50% 50%";
  },
  c: c => d.createElement(c),
  r: (() => {
    let queue = [];
    d.addEventListener("DOMContentLoaded", () => {
      let i = queue.length;
      while(~--i) {
        const obj = queue[i], args = obj.args, len = args.length, copy = new Array(len + 2);
        copy[0] = obj.fn;
        {
          let i = 1, p = -1;
          while(++p < len) copy[++i] = args[p];
        }
        $.safe.apply($, copy);
      }
      queue = $.u;
    }, once);
    return (fn, ...args) => queue ?
      queue[queue.length] = { fn, args } :
      $.safe(fn, $.u, ...args);
  })(),
  rm: el => { if (el) el.parentNode.removeChild(el); },
  ins: (el, m, t) => el.insertAdjacentHTML(m, t),
  eval(text = "") {
    const script = $.c("script");
    $.add(new Text(text), script);
    $.add(script, d.documentElement);
    $.rm(script);
  },
  in: ((isArray, obj) => {
    const arr = function inArray(key) {
      let i = this.length;
      while(~--i) {
        if (key === this[i]) {
          return true;
        }
      }
      return false;
    };
    return (key, o) => (isArray(o) ? arr : obj).call(o, key);
  })(Array.isArray, Object.prototype.hasOwnProperty),
  add(el, to = d.body) {
    $.safe(to.appendChild, to, el);
    return el;
  },
  safe: (() => {
    const safeError = Symbol();
    function safe(fn, context) {
      const k = arguments.length, args = new Array(k - 2);
      {
        let i = 1, p = -1;
        while(++i < k) args[++p] = arguments[i];
      }
      try { return fn.apply(context, args); }
      catch(e) {
        if (SAFE_DEBUG) console.error("$.safe debug:", e);
        return safeError;
      }
    }
    safe.error = safeError;
    return safe;
  })(),
  _evt() {
    if (typeof arguments[0] === "string") {
      return d[(this ? "add" : "remove") + "EventListener"](
        arguments[0], arguments[1], arguments[2]
      );
    }
    return arguments[0][(this ? "add" : "remove") + "EventListener"](
      arguments[1], arguments[2], arguments[3]
    );
  },
  on() { return $._evt.apply(true, arguments); },
  off() { return $._evt.apply(false, arguments); },
  u: void 0
});

/**
 * IF SOMETHING CHANGES IN HOW WE STORE CACHED URLS THEN MODIFY VERSION HERE
 */
{
  const version = "1.8.8";
  if (stor[ns + "-firstrun"] !== version) {
    const r = /^gelbooru-slide./, arr = $.keys(stor);
    let i = arr.length;
    while(~--i) {
      const a = arr[i];
      r.test(a) && stor.removeItem(a);
    }
    stor[ns + "-firstrun"] = version;
  }
}


/**
 * MODULE FOR POSITIONAL DISPLAY IN BOTTOM LEFT CORNER
 */
Pos = {
  fn(a) {
    let el = Pos.el;
    if (a !== $.u) {
      switch(typeof a) {
       case "string":
        $("span", el).innerHTML = ++a;
        break;
       case "boolean": {
        const no = $("span", el);
        no.innerHTML = +no.innerHTML + (a ? 1 : -1); }
        break;
       case "number":
        el.lastElementChild.lastChild.data = " / " + a;
      }
      el.title = el.textContent;
      if (Menu.el) {
        const arr = $$("a:not([download])", Menu.el);
        let i = arr.length;
        while(~--i) arr[i].href = $.current().href;
        Menu.download();
      }
    }
    else {
      if (Main.el && !el) {
        const thumbs = $$(".thumb a[data-full]");
        el = $.c("div");
        $.ins(el, "beforeend", `<div><span>${thumbs.indexOf($.current()) + 1}</span> / ${thumbs.length}</div>`);
        el.className = "posel";
        el.title = el.textContent;
        Main.el.insertAdjacentElement("afterend", el);
        Pos.el = el;
      }
      else if (el) Pos.el = $.rm(el);
    }
  }
};

/**
 * MODULE FOR MIDDLE CLICK MENU
 */
Menu = {
  fn(e) {
    const height = Main.gif.hasAttribute("style") ? 48 : 71,
      _l = e.clientX + 1, _t = e.clientY + 1,
      left = (_l > w.innerWidth - 139 ? _l - 139 : _l) + "px",
      top = (_t > w.innerHeight - height ? _t - height : _t) + "px";
    let el = Menu.el;
    if (el) {
      el.removeAttribute("class");
      setTimeout(() => el.classList.add("menuel"), 10);
    }
    else {
      const href = $.current().href, s = '" style="margin-bottom: 2px"';
      el = $.c("div");
      el.id = "menuel";
      $.ins(el, "beforeend", `<a href="${href+s}>Open in This Tab</a><a href="${href+s} target="_blank">Open in New Tab</a><a href="javascript:;">Save Image As...</a>`);
      $.add(el);
      Menu.el = el;
      $.on(el.lastElementChild, "click", Menu.copyFilename);
      el.classList.add("menuel");
      if (Menu.realDl) Menu.download();
    }
    return $.extend(el.style, {left, top});
  },
  download() {
    const el = Menu.realDl;
    el.href = Main.el.src;
    el.download = Main.el.src.split("/").pop() + "." + $.current().dataset.full.match(Main.r[2])[1];
  },
  copyFilename() {
    const { copy, realDl } = Menu;
    copy.value = realDl.getAttribute("download") || "";
    copy.select();
    if ($.safe(document.execCommand, document, "copy") === $.safe.error)
      console.log("Failed to copy filename: %s", copy.value);
    realDl.click();
  }
};

/**
 * MODULE FOR SLIDESHOW BUTTON AND SETTINGS IN BOTTOM RIGHT CORNER
 */
Btn = {
  fn() {
    const sel = "this.previousElementSibling.firstElementChild";
    let el = Btn.el;
    if (el) {
      clearTimeout(Btn.hideTimer);
      Btn.clear();
      Btn.el = $.rm(Btn.el);
      Hover.el.removeAttribute("style");
    }
    else {
      el = $.c("div");
      el.setAttribute("style", 'opacity: .7;');
      el.className = "slideshow";
      $.ins(el, 'beforeend', `<span title="Slideshow">${SVG.play}</span><div style="display:none;padding:10px 0">Options<hr><label>Loop:&nbsp;<input type="checkbox" checked></label>&nbsp;<label onclick="${sel}.checked=true;${sel}.disabled=!${sel}.disabled">Shuffle:&nbsp;<input type="checkbox"></label><br>Interval:&nbsp;<input type="number" value="5" style="width:100px"></div>`);
      Btn.state = true;
      el.firstElementChild.onclick = Btn.cb;
      $.add(el);
      Btn.el = el;
    }
  },
  clear() {
    clearTimeout(+Btn.el.dataset.timer);
    Btn.el.removeAttribute("data-timer");
  },
  cb: ((thumbs, el, options, orig) => {
    const sel = ".thumb a[data-full]",
      _fnS = () => { if (el.dataset.timer) el.dataset.timer = setTimeout(_fnT, options[2]); };
    const _fnT = () => {
      let _el;
      if (options[1]) {
        if (thumbs.length === 0) thumbs = $$(sel);
        thumbs.splice(thumbs.indexOf($.current()), 1);
        _el = thumbs[Math.random() * thumbs.length & -1];
      }
      else _el = $.find($.current(), true);
      if (!_el && options[0]) _el = $(sel);
      if (!_el) return Btn.cb();
      $.on(Main.el, "load", _fnS, once);
      Main.slide($("img", _el).src);
    };
    return function() {
      el = Btn.el;
      Pos.fn();
      slideshow = !!Btn.state;
      el.firstElementChild.innerHTML = (Btn.state = !Btn.state) ? SVG.play : SVG.pause;
      if (slideshow) {
        thumbs = [];
        options = $$("div input", el).map(a =>
          a.type === "number" ? (a.value >= 1 ? +a.value : 1) * 1E3 : a.checked
        );
        el.dataset.timer = setTimeout(_fnT, options[2]);
        el.style.opacity = 0.4;
        Hover.el.setAttribute("style", "display: none !important");
        orig = d.body.getAttribute("style");
        $.on("mousemove", Btn.hide);
      }
      else {
        Btn.clear();
        el.style.opacity = ".7";
        el.removeAttribute("data-timer");
        Hover.el.removeAttribute("style");
        Hover.center($.current().firstElementChild.src);
        $.off("mousemove", Btn.hide);
        clearTimeout(Btn.hideTimer);
        if (orig) d.body.setAttribute("style", orig);
        else d.body.removeAttribute("style");
      }
    };
  })([]),
  hide() {
    const b = d.body;
    b.style.cursor = "";
    clearTimeout(Btn.hideTimer);
    Btn.hideTimer = setTimeout(() => b.style.cursor = "none", 5E3);
  }
};

/**
 * MODULE FOR GENERAL DOWNLOADING, PROGRESS DISPLAY AND IMAGE HANDLING
 */
Prog = {
  check: id => Main.el.dataset.id === id,
  load(e) {
    const {el} = Prog, {id, ext} = e.context;
    delete Prog.reqs[id];
    if (!el) throw Error("There was an event order issue with GM_xmlhttpRequest");
    if (!$.in(e.status, httpOk) || !Main.r[5].test(e.finalUrl))
      return Prog.error(e);
    else {
      let blobUrl = w.URL.createObjectURL(
        new Blob([e.response], {type: "image/" + ext.replace("jpeg", "jpg")})
      );
      $("a[data-id='" + id + "']").dataset.blob = blobUrl;
      if (Main.el && Prog.check(id)) {
        el.classList.add("progdone");
        Main.el.src = blobUrl;
        if (Menu.el) Menu.download();
      }
    }
  },
  progress(e) {
    let el = Prog.el;
    if (!el) {
      Prog.el = el = $.c("span");
      el.setAttribute("style", "width:0");
      el.classList.add("progress");
      $.add(el);
    }
    if (!e) return el;
    const id = e.context && e.context.id;
    if (Main.el && Prog.check(id) && el) {
      el.classList.remove("progfail");
      el.style.width = ($.in(id, Prog.reqs) ? e.loaded / e.total * 100 : 0) + "%";
    }
  },
  error(e) {
    const el = Prog.el, id = e.context.id;
    if (Main.el && Prog.check(id) && el) {
      el.classList.add("progfail");
      const req = Prog.reqs[id];
      $.safe(req.abort, req);
      delete Prog.reqs[id];
    }
    if (slideshow)
      Main.el.dispatchEvent(new Event("load"));
    stor.removeItem(ns + id);
    if (!site.paheal)
      $("a[data-id='" + id + "']").dataset.full = $.cache(id, "loading");
  },
  fn(url, id) {
    if ($.in(id, Prog.reqs)) return;
    if (url.startsWith("//assets2"))
      url = "//gelbooru.com/" + url.substr(22);
    if (Prog.el) Prog.el.style.width = 0;
    Prog.reqs[id] = GM_xmlhttpRequest({
      context: { id, url, ext: url.match(Main.r[2])[1] },
      method: "GET",
      url: url,
      responseType: "arraybuffer",
      onload: Prog.load,
      onprogress: Prog.progress,
      onerror: Prog.error,
      onabort: Prog.error,
      ontimeout: Prog.error
    });
  },
  reqs: Object.create(null)
};

/**
 * MODULE FOR DOWNLOADING, PROGRESS DISPLAY AND IMAGE HANDLING ON SANKAKUCOMPLEX
 * iframe magic was required due to some fuckery on the site
 */
Sank = {
  fn(id, curr) {
    if ($$(`iframe.proxY[src$='${id}']`).length) return;
    if (curr.dataset.blob) {
      Main.el.src = curr.dataset.blob;
      if (Menu.el) Menu.download();
      if (Prog.el) Prog.el = $.rm(Prog.el);
      let el = Prog.progress();
      el.style.width = "100%";
      return el.classList.add("progdone");
    }
    if (Prog.el) Prog.el.style.width = 0;
    const proxy = $.extend($.c("iframe"), {
      className: "proxY",
      sandbox: "allow-same-origin",
      src: "/post/show/" + id,
      scrolling: "no",
      width: 100,
      height: 100,
      style: "position: fixed; top: -100vh; display: block"
    });
    $.on(proxy, "load", Sank.proxyLoad);
    $.on(proxy, "error", Sank.proxyError);
    $.add(proxy);
  },
  proxyLoad(e) {
    e.currentTarget.contentWindow.postMessage(ns + "fetch", "*");
  },
  proxyError(e) {
    $.rm(e.currentTarget);
    Prog.progress().classList.add("progfail");
  },
  listener(e) {
    const { source } = e;
    let cmd, data;
    if (typeof e.data === "string")
      cmd = e.data;
    else
      ({cmd, data} = e.data);
    if (!cmd.startsWith(ns)) return;
    switch(cmd.substr(ns.length)) {
     case "suicide":
      return source.postMessage("destroy", "*");
     case "fetch":
      const idImgSrc = $("#post-view + img").src;
      return GM_xmlhttpRequest({
        context: { id: idImgSrc.substr(idImgSrc.lastIndexOf("/") + 1), source },
        method: "GET",
        url: $("#image").src,
        responseType: "arraybuffer",
        onload: Sank.load,
        onprogress: Sank.progress,
        onerror: Sank.error,
        onabort: Sank.error,
        ontimeout: Sank.error
      });
     case "progress":
      const { loaded, total } = data;
      return Prog.progress({context: {id: data.id}, loaded, total});
     case "load":
      const blobUrl = w.URL.createObjectURL(
        new Blob([data.response], {type: "image/" + data.ext.replace("jpeg", "jpg")})
      );
      $("a[data-id='" + data.id + "']").dataset.blob = blobUrl;
      if (Main.el && Prog.check(data.id)) {
        Prog.progress().classList.add("progdone");
        Main.el.src = blobUrl;
        if (Menu.el) Menu.download();
      }
     case "error":
      if (!blobUrl) Prog.progress().classList.add("progfail");
     case "destroy":
      $.rm($(`iframe.proxY[src$='${data.id}']`));
    }
  },
  load({ finalUrl, response, context: { id, source } }) {
    const ext = finalUrl.match(Main.r[2])[1];
    source.postMessage({ cmd: ns + "load", data: { id, response, ext } }, "*", [response]);
  },
  progress({ loaded, total, context: { id, source } }) {
    source.postMessage({ cmd: ns + "progress", data: { id, total, loaded } }, "*");
  },
  error({ context: { id, source } }) {
    source.postMessage({ cmd: ns + "error", data: { id } }, "*");
  }
};

/**
 * MODULE FOR IMAGE LIST IN THE TOP 200 or 220 (PAHEAL) PIXELS OF THE VIEWPORT
 */
Hover = {
  lastInList: {},
  init() {
    const el = $.c("div");
    $.ins(el, "beforeend", `<div class="layover"></div><div class="tentcon"><div class="wrapthatshit"><div class="listimage"></div></div></div>${svg}style="width: 0; height: 0"><filter id="__dropshadow"><feGaussianBlur in="SourceAlpha" stdDeviation="2"></feGaussianBlur><feOffset result="offsetblur" dx="1" dy="1"></feOffset><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></svg>`);
    el.className = "viewpre";
    $.add(el);
    Hover.index = -1;
    Hover.target = $(".listimage", el);
    $.on(Hover.target, "click", Hover.click, passive);
    $.on(Hover.target, "dragstart", e => e.preventDefault());
    Hover.wrap = Hover.target.parentNode;
    if (!site.sankakucomplex) {
      $.add(Hover.nextEl = $.c("span"), Hover.target);
      Hover.nextEl.className = "next";
      $.on(Hover.nextEl, "click", Hover.next, passive);
    }
    {
      const arr = $$("a[data-full]"), len = arr.length;
      let i = -1;
      while(++i < len) Hover.build(arr[i]);
    }
    Hover.el = el;
    Hover.kinetic();
  },
  noGears() {
    Hover.gears.style.opacity = 0;
    setTimeout(() => Hover.gears = $.rm(Hover.gears), 300);
  },
  next(move) {
    if (Hover.nextEl.classList.contains("loadingu")) return;
    if (!Hover.gears) {
      let el, fn = () => el.style.right = "3vw";
      Hover.gears = el = $.c("div");
      el.className = "nextgears";
      $.ins(el, "beforeend", SVG.next);
      $.add(el);
      requestAnimationFrame(fn);
    }
    Hover.nextEl.className = "next loadingu";
    Hover.lastInList = {
      move,
      id: Hover.nextEl.previousElementSibling.dataset.id
    };
    void Hover.nextEl.offsetWidth; // reflow hack
    const timer = setTimeout(() => {
      Hover.nextEl = $.rm(Hover.nextEl);
      Hover.size();
      Hover.noGears();
      $.keyDown({warn: true});
    }, 2E3);
    d.dispatchEvent(new CustomEvent(ns + "-next", { detail: timer }));
  },
  size() {
    const { children } = Hover.target;
    let length = children.length;
    Hover.target.style.width = length * (180 + paheal) + "px";
    if (Pos.el) {
      if (children[length - 1].className === "next") --length;
      Pos.fn(length);
    }
  },
  build(el) {
    const span = $.c("span"), img = $.c("img");
    img.src = $("img", el).src;
    img.alt = img.dataset.nth = ++Hover.index;
    img.title = el.firstElementChild.title;
    span.dataset.id = el.dataset.id;
    if (el.dataset.gif) img.style.outline = "2px solid lime";
    if (el.dataset.res) span.dataset.res = el.dataset.res;
    $.add(img, span);
    if (Hover.nextEl) Hover.target.insertBefore(span, Hover.nextEl);
    else $.add(span, Hover.target);
    Hover.size();
    if (Hover.lastInList.move === true && Hover.lastInList.id === Main.el.dataset.id) {
      $.keyDown({keyCode: 39});
      Hover.lastInList.move = false;
    }
  },
  click(e) {
    e = e.target.src;
    if (!e) return;
    if (Hover.prevent)
      return Hover.prevent = null;
    Main.slide(e);
    Hover.center(e);
    if (Pos.el) Pos.fn($("img[src*='" + $.base(e) + "']", Hover.el).dataset.nth);
  },
  center(src) {
    if (!(Hover.wrap || Hover.el)) return;
    const base = $.base(src),
      img = $("img[src*='" + base + "']", Hover.el),
      pos = img.dataset.nth,
      scroll = Hover.wrap,
      half = scroll.offsetWidth / 2,
      width = 180 + paheal,
      dist = width * pos + width / 2,
      res = dist - half,
      curr = $(".current", Hover.el);
    if (curr) curr.removeAttribute("class");
    Hover.cancel();
    Hover.el.children[1].removeAttribute("style");
    scroll.scrollLeft = res > 0 ? res : 0;
    img.parentNode.setAttribute("class", "current");
  },
  kinetic() {
    const view = Hover.wrap,
      rm = () => Hover.el.classList.remove("showimagelist"),
      unset = () => Hover.el.classList.add("showimagelist");
    let offset, reference, velocity, frame, timestamp, ticker, amplitude, target, pressed = false;
    function scroll(x) {
      const max = view.scrollLeftMax;
      offset = x > max ? max : x < 0 ? 0 : x;
      view.scrollLeft = offset;
      if (offset === 0 || offset === max) {
        amplitude = 0;
        Hover.cancel();
        rm();
      }
    }
    function track() {
      let now = Date.now(),
        elapsed = now - timestamp,
        delta = offset - frame,
        v = 1000 * delta / (1 + elapsed);
      timestamp = now;
      frame = offset;
      velocity = 0.8 * v + 0.2 * velocity;
    }
    function autoScroll() {
      if (amplitude) {
        const elapsed = Date.now() - timestamp, delta = -amplitude * Math.exp(-elapsed / 15E2);
        if (delta > 5 || delta < -5) {
          unset();
          scroll(target + delta);
          Hover.kinetID = requestAnimationFrame(autoScroll);
        }
        else {
          rm();
          scroll(target);
        }
      }
    }
    $.on(view, 'mousedown', function tap(e) {
      Hover.prevent = !(pressed = true);
      unset();
      clearInterval(ticker);
      velocity = amplitude = 0;
      if (e.target === view) return pressed = false;
      reference = e.clientX;
      offset = view.scrollLeft;
      frame = offset;
      timestamp = Date.now();
      ticker = setInterval(track, 100 / 3);
    }, passive);
    $.on(d.body, 'mousemove', function drag(e) {
      if (pressed) {
        const x = e.clientX, delta = reference - x;
        if (delta > 1 || delta < -1) {
          Hover.prevent = true;
          reference = x;
          scroll(offset + delta);
        }
      }
    }, passive);
    $.on(d.body, 'mouseup', function release() {
      pressed = false;
      clearInterval(ticker);
      if (velocity > 10 || velocity < -10) {
        amplitude = 0.8 * velocity;
        target = offset + amplitude & -1;
        timestamp = Date.now();
        Hover.kinetID = requestAnimationFrame(autoScroll);
      }
      else rm();
    }, passive);
  },
  cancel() {
    $.safe(cancelAnimationFrame, $.u, Hover.kinetID);
  }
};

/**
 * MODULE FOR THE THINGS THAT GET THE BALL ROLLING
 */
Main = {
  sel: ".thumb:not(a)",
  animationEnd(e) {
    switch(e.animationName) {
     case "Outlined":
      e.target.classList.remove("outlined");
      break;
     case "nomoreimages":
      $.keyDown.el = $.rm(e.target);
      break;
     case "menuelement":
      Menu.el = $.rm(e.target);
      break;
     case "warn":
      $.rm(e.target);
      break;
     case "progfail": case "progdone":
      Prog.el = $.rm(e.target);
    }
  },
  finalizeCss() {
    const style = $.extend($.c("style"), { type: "text/css" });
    $.add(new Text(Main.css), style);
    Object.defineProperty(Main, "css", {
      get() {
        return style.textContent;
      },
      set(moreCss) {
        moreCss = new Text(style.textContent + moreCss);
        {
          const arr = style.childNodes;
          let i = arr.length;
          while(~--i) $.rm(arr[i]);
        }
        style.appendChild(moreCss);
        return style.textContent;
      }
    });
    $.add(style, d.documentElement);
  },
  async initDomainInfo() {
    switch(site.name) {
     case "gelbooru":
      Main.r[0] = /<a href="?([^">]+)"?[^>]*>Orig/;
      Main.r[1] = /src="?([^">]+)"? id="?image"?[^>]*\/>/;
      Main.css += "span.thumb {\n  float: left;\n  display: inline-block;\n  width: 180px;\n  height: 180px;\n  text-align: center\n}\nspan.thumb + center::before {\n  content: '';\n  display: block;\n  clear: both\n}\n.slideshow hr {\n  margin: initial;\nborder: initial;\n  height: initial\n}";
      break;
     case "splatoon": case "booru":
      Main.r[0] = Main.r[1] = /<img alt="img" src="([^"]+)/i;
      Main.css += "span.thumb {\n  float: left\n}\n[data-never-hide] {\n  display: inline ! important;\n}";
      $.r(() => {
        const start = $(".thumb").parentNode;
        let el, i = 10;
        while(i) {
          if ((el = start.nextSibling) && el.id !== "paginator") $.rm(el);
          else --i;
        }
        start.dispatchEvent(new CustomEvent("scroll", { bubbles: true }));
      });
      break;
     case "e621":
      Main.css += ".thumb > a[data-id] {\n  display: inline-block;\n  margin-bottom: -3px\n}";
      break;
     case "tbib":
      Main.r[0] = /<a href="?([^"> ]+)"? [^>]*?>\s*Orig/;
      Main.r[1] = /<img[^>]*?src="?([^"> ]+)"? [^>]*?id="?image"?[^>]*>/;
      Main.css += "div:not([style*='none;padding:10px 0']) {\n  background-color: transparent\n}";
      break;
     case "sankakucomplex":
      Main.sel = "#post-list div.content > div:first-of-type > .thumb";
     case "hypnohub":
      $.r($.eval, site.inject);
     case "yande": case "lolibooru": case "konachan":
      Main.r[1] = /id="?image"? [^>]*?src="?([^">]+)"?[^>]*\/>/;
      Main.css += ".javascript-hide[id] {\n  display: inline-block ! important\n}\nspan.thumb {\n  width: 180px;\n  height: 180px;\n  text-align: center\n}\nspan.thumb, span.thumb a {\n  display: inline-block\n}\nspan.thumb .preview, .listimage span img {\n  max-width: 150px;\n  max-height: 150px;\n  overflow: hidden;\n  display: inline-block\n}";
      break;
     case "atfbooru":
      Main.sel = "div#posts article[id^='post']";
      Main.css += "div > article.post-preview {\n  overflow: initial\n}\narticle.post-preview > a {\n  overflow: hidden\n}";
      break;
     case "safebooru":
      Main.css += "img[title*=' rating:'][src*='.png'] {\n  background-color: rgba(255,255,255,.5)\n}";
    }
    Main.finalizeCss();
  },
  click(e) {
    if (e.button === 0) {
      let target = e.target;
      while(target && !target.hasAttribute("data-full")) target = target.parentNode;
      e.preventDefault();
      e.stopPropagation();
      if (target) Main.fn(target);
    }
  },
  process(node, full) {
    let a, id, alt;
    if (!(typeof node === "object" && node.nodeType === 1)) return;
    if (node.tagName === "LI" && String(node.id)[0] === "p" && ~String(node.className).indexOf("creator-id-")) return setTimeout(Main.myImuoto, 0, node);
    if (site.gelbooru && node.classList.contains("thumbnail-preview")) node = Main.gelbooruFix(node);
    if (node.matches(Main.sel) && (a = node.firstElementChild) && !a.dataset.full) {
      alt = $("img[alt]", node);
      if (!(alt && (alt = alt.title || alt.alt)))
        return;
      id = (node.id || a.id || a.children[0].id).match(Main.r[4])[0];
      switch(site.name) {
       case "gelbooru":
        a.setAttribute("href", "/index.php?page=post&s=view&id=" + id);
        break;
       case "booru":
       case "splatoon":
        a.setAttribute("data-never-hide", "");
      }
      if (~alt.indexOf("animated_gif")) {
        a.firstElementChild.style.border = "2px solid lime";
        a.dataset.gif = "gif";
      }
      else if (Main.r[3].test(alt) || $$("img[src*='webm-preview.png']", node).length) return a.style.cursor = "alias";
      a.dataset.id = id;
      a.dataset.full = typeof full === "string" ? full : site.paheal ? node.children[2].href : site.atfbooru ? node.dataset[fullImage ? "largeFileUrl" : "fileUrl"] : $.cache(id);
      node.removeAttribute("onclick");
      a.removeAttribute("onclick");
      if (Hover.el) Hover.build(a);
      if (Hover.gears && Hover.gears.style.opacity !== "0")
        Hover.noGears();
      if (!Main.attachedClickListener) {
        Main.attachedClickListener = true;
        $.on(node.parentNode, "click", Main.click);
      }
    }
  },
  init() {
    if (!(site.sankakucomplex || site.atfbooru) && location.pathname === "/")
      return $.r(Main.front);
    Main.initDomainInfo();
    const observer = new MutationObserver(mutations => {
      for (let i = 0, len1 = mutations.length; i < len1; ++i)
      for (let j = 0, arr = mutations[i].addedNodes, len2 = arr.length; j < len2; ++j)
        Main.process(arr[j]);
    });
    Main.offObj = [{ detail: true }, Main.off];
    Main.onObj = [{ detail: false }, Main.on];
    observer.observe(d, {
      childList: true,
      subtree: true
    });
    if (site.sankakucomplex)
      $.on(w, "message", Sank.listener);
    $.on("animationend", Main.animationEnd);
    $.on(w, "keypress", e => {
      if (e.key === "Enter" || e.keyCode === 13) {
        if (slideshow)
          Btn.cb();
        else if (e.target.matches(".thumb > a[data-full]")) {
          e.preventDefault();
          Main.fn(e.target);
        }
      }
    });
    $.on(w, "wheel", e => {
      if (e.ctrlKey)
        e.preventDefault();
      if (Main.el)
        $.keyDown({ keyCode: e.deltaY > 0 ? 39 : e.deltaY < 0 ? 37 : 0 });
    });
    $.r(Main.ready);
    $.r(Hover.init);
  },
  ready() {
    if (WIREFRAME) {
      let debug = $.c("div");
      debug.id = "debug";
      $.add(debug);
      $.ins(debug, "beforeend", SVG.debug);
      Main.css += `#debug{display:${["none","block"][WIREFRAME-1]};position:fixed;z-index:10;top:0;left:0;width:100vw;height:100vh;pointer-events:none;display:block}.sliding > div#debug{display:block}#debug *{pointer-events:none}#zoom_top{border:1px solid red}`;
    }
    for (let i = 0, arr = [["textarea", "copy"], ["a", "realDl"]]; i < 2; ++i) {
      const [tag, prop] = arr[i];
      Menu[prop] = $.c(tag);
      Menu[prop].classList.add("oFfScReEn");
      $.add(Menu[prop]);
    }
  },
  gelbooruFix(el) {
    const img = el.querySelector("img");
    if (!~String(img.getAttribute("src")).indexOf("/")) {
      img.className = "preview";
      let key = Main.gelbooruKey;
      if (!key) {
        for (let i = 0, arr = Object.entries(img.dataset), len = arr.length; i < len; ++i) {
          const [k, v] = arr[i];
          if (Main.r[5].test(v)) {
            Main.gelbooruKey = key = k;
            break;
          }
        }
      }
      img.setAttribute("src", img.getAttribute("data-" + key));
      img.removeAttribute("data-" + key);
    }
    const span = el.firstElementChild;
    el.parentNode.replaceChild(span, el);
    return span;
  },
  myImuotoOnReady(root) {
    const arr = root.childNodes;
    let i = arr.length;
    while(~--i) {
      const child = arr[i];
      if (child.nodeType !== 1) root.removeChild(child);
    }
  },
  myImuoto(el) {
    const thumb = $.c("span"), id = el.id.substr(1), img = el.children[0].children[0].children[0], full = el.lastElementChild.href;
    if (!Main.myImuoto.readied) {
      $.r(Main.myImuotoOnReady, el.parentNode);
      Main.myImuoto.readied = true;
    }
    thumb.id = el.id;
    thumb.className = "creator-id-" + id + " thumb";
    thumb.innerHTML = `<a id="${"s" + id}" href="/post/show/${id}" data-res="${el.lastElementChild.lastElementChild.textContent.replace(Main.r[6], "\u00A0")}"><img class="preview" src="${img.src}" alt="${img.alt}" title="${img.alt}" /></a>`;
    el.parentNode.replaceChild(thumb, el);
    return Main.process(thumb, fullImage || full.match(Main.r[2])[1].toLowerCase() === "gif" ? full : null);
  },
  fn(node) {
    const [msg, method] = Main.el ? Main.offObj : Main.onObj;
    d.dispatchEvent(new CustomEvent(ns, msg));
    const _ = $.safe(method, $.u, node);
    if (_ === $.safe.error)
      console.error(_);
  },
  off(a) {
    const reqs = Prog.reqs;
    for (let i = 0, arr = $.keys(reqs), len = arr.length; i < len; ++i) {
      const _req = reqs[arr[i]];
      $.safe(_req.abort, _req);
    }
    Prog.reqs = Object.create(null);
    for (let i = 0, arr = $$("iframe.proxY"), len = arr.length; i < len; ++i)
      $.rm(arr[i]);
    if (slideshow) Btn.cb();
    slideshow = !(a = $.current());
    Main.el = $.rm(Main.el);
    d.body.classList.remove("sliding");
    a.classList.add("outlined");
    $.off("mousemove", $.zoom);
    $.off("keydown", $.keyDown);
    $.off("keyup", $.keyUp);
    if (a) {
      let correction = 0;
      if (site.sankakucomplex || site.e621 || site.atfbooru) {
        a = a.firstElementChild;
        correction = a.offsetParent.offsetTop;
      }
      w.scrollTo(0, a.offsetTop + correction + a.offsetHeight / 2 - w.innerHeight / 2);
      a.focus();
      Btn.fn(); Pos.fn();
    }
    if (site.sankakucomplex) uW.Sankaku.Pagination.auto_enabled = true;
    for (let i = 0, arr = [[Main, "gif"], [Prog], [Menu], [$.keyDown], [Hover, "gears"]]; i < 5; ++i) {
      const [p, el = "el"] = arr[i];
      p[el] = $.rm(p[el]);
    }
  },
  _on: e => e.button === 1 && $.keyDown({ keyCode: 38, event: e }),
  on(a) {
    if (site.sankakucomplex) uW.Sankaku.Pagination.auto_enabled = false;
    d.body.classList.add("sliding");
    {
      const arr = $$("a.outlined[data-full]");
      let i = arr.length;
      while(~--i) arr[i].classList.remove("outlined");
    }
    $.add($.extend(Main.el = $.c("img"),
      { id: "slide", alt: "Loading...", onclick: Main.fn, onmouseup: Main._on }
    ));
    $.add(Main.gif = $.extend($.c("span"), { innerHTML: SVG.gif, className: "gif" }));
    const _ = $.safe(Main.slide, $.u, $("img", a).src);
    if (_ === $.safe.error) {
      console.error(_);
      return Main.off();
    }
    $.on("keyup", $.keyUp);
    $.on("keydown", $.keyDown);
    $.on("mousemove", $.zoom);
    Pos.fn(); Btn.fn(); $.preload();
  },
  isGif(match) {
    return (match && match[1]) ? match[1].toLowerCase() === "gif" : null;
  },
  slide(src) {
    if (!slideshow)
      Main.el.src = src;
    if ($.zoom.el)
      $.zoom.el = $.rm($.zoom.el);
    Hover.center(src);
    Main.el.dataset.src = src;
    Main.gif.removeAttribute("style");
    Main.el.removeAttribute("style");
    const curr = $.current(src), data = curr.dataset.full, id = curr.dataset.id;
    Main.el.dataset.id = id;
    /* dirty hack ahead because GIF doesn't want to play as a blob and doesn't
     * give proper progress info for GM_xmlhttpRequest for whatever reason */
    const isGif = Main.isGif(data.match(Main.r[2]));
    if (site.sankakucomplex)
      return Sank.fn(id, curr);
    if (data === "loading") Main.req(curr);
    // hack start
    else if (isGif !== false) {
      if (isGif) {
        Main.el.removeAttribute("src");
        Main.el.src = data;
        Main.gif.setAttribute("style", "display: inline-block");
      }
      else Main.el.dispatchEvent(new Event("load"));
    }
    // hack end
    else if (curr.dataset.blob) {
      Main.el.src = curr.dataset.blob;
      if (Menu.el) Menu.download();
      if (Prog.el) Prog.el = $.rm(Prog.el);
      let el = Prog.progress();
      el.style.width = "100%";
      el.classList.add("progdone");
    }
    else Prog.fn(data, id);
  },
  r: [/file_url[=>]"?([^" <]+)"?/i,/* 0 */ /sample_url[=>]"?([^" <]+)"?/i,/* 1 */ /\.(gif|png|jpe?g)/i,/* 2 */ /\b(webm|video|mp4|flash)\b/i,/* 3 */ /\d+/,/* 4 */ /[a-f0-9]{32}/,/* 5 */ / /g]/* 6 */,
  processHttp(x) { if (!$.in(x.status, httpOk)) throw `HTTP status: ${x.status}`; return x.text(); },
  validateHtml(img, el) {
    return img.match(el.dataset.gif || fullImage ? Main.r[0] : Main.r[1])[1];
  },
  checkPreviewId(img) {
    return ~Main.el.dataset.src.indexOf($.base(img));
  },
  processText(img, node, id) {
    if ((img = $.safe(Main.validateHtml, $.u, img, node)) === $.safe.error)
      throw "API error";
    node.dataset.full = $.cache(id, img);
    const _ = $.safe(Main.checkPreviewId, $.u, img);
    if (typeof _ === "number" && _)
      $.safe(Main.slide, $.u, img);
    $("img", node).style.outline = "";
    node.removeAttribute("data-already-loading");
  },
  getApiInfo(node) {
    switch(domain) {
     case "e621.net":
      return [node.parentNode.id.substr(1), "/post/show.xml?id="];
     case "yande.re":
     case "lolibooru.moe":
     case "konachan.com":
     case "hypnohub.net":
      return [node.parentNode.id.substr(1), "/post/show/"];
     case "booru.org":
     case "tbib.org":
     case "splatoon.ink":
     case "gelbooru.com":
      return [node.dataset.id, "/index.php?page=post&s=view&id="];
     default:
      return [node.dataset.id, "/index.php?page=dapi&s=post&q=index&id="];
    }
  },
  async req(node) {
    if (!node) return;
    const { dataset } = node;
    if (dataset.alreadyLoading || dataset.full !== "loading") return;
    const apiIfno = Main.getApiInfo(node);
    const id = apiIfno[0], api = apiIfno[1];
    node.dataset.alreadyLoading = "true";
    try {
      const request = await fetch(api + id, { credentials: "include" });
      const text = await Main.processHttp(request);
      Main.processText(text, node, id);
    } catch(err) {
      Main.warn();
      $("img", node).style.outline = "6px solid red";
      console.error(`Main.req failure:\n\n${err} | ${location.origin + api + id}`);
      node.removeAttribute("data-already-loading");
    }
  },
  warn() {
    const warn = $.c("span");
    warn.innerHTML = SVG.warn;
    warn.classList.add("warn");
    if ($$(".sliding>.warn").length === 0) $.add(warn);
    if (slideshow)
      Main.el.dispatchEvent(new Event("load"));
  },
  front() {
    let target, method = "beforeend";
    switch(domain) {
     case "e621.net":
      target = "#mascot_artist";
      method = "afterend";
      break;
     case "booru.org":
     case "rule34.xxx":
     case "splatoon.ink":
      target = "#static-index > div:last-child > p:first-child";
      break;
     case "lolibooru.moe":
      target = "#links + *";
      break;
     case "safebooru.org":
      target = "div.space + div > p";
      method = "afterend";
      break;
     case "hypnohub.net":
      target = "form > div";
      break;
     case "tbib.org":
      target = "div.space + div > p";
      method = "afterend";
      break;
     default:
      target = "form:last-of-type + div";
      break;
    }
    for (let i = 0, arr = ["#tags", "#tags-search"]; i < 2; ++i) {
      const el = $(arr[i]);
      if (el) {
        el.focus();
        break;
      }
    }
    $.ins($(target), method, `<br><br>Gelbooru&nbsp;Enhancement:<br><pre style="font-size: 11px;text-align: left;display: inline-block;margin-top: 5px;">- Gelbooru Image Viewer ${scriptInfo.script.version}</pre>`);
  },
  css: `@keyframes Outlined {\n  0% { outline: 6px solid orange }\n  60% { outline: 6px solid orange }\n  100% { outline: 6px solid transparent }\n}\n@keyframes nomoreimages {\n  0% { opacity: 0 }\n  20% { opacity: 1 }\n  100% { opacity: 0 }\n}\n@keyframes menuelement {\n  0% { opacity: 1 }\n  80% { opacity: 1 }\n  100% { opacity: 0 }\n}\n@keyframes progfail {\n  0% { opacity: 1 }\n  80% { opacity: 1 }\n  100% { opacity: 0 }\n}\n@keyframes warn {\n  0% { opacity: 0; bottom: 5vh }\n  25% { opacity: 1; bottom: 10vh }\n  90% { opacity: 1 }\n  100% { opacity: 0 }\n}\n@keyframes topglowything {\n  0% { opacity: 1 }\n  80% { opacity: 1 }\n  100% { opacity: 0 }\n}\nbody.sliding > * {\n  display: none\n}\nbody.sliding * {\n  -webkit-box-sizing: initial;\n  -moz-box-sizing: initial;\n  box-sizing: initial;\n  line-height: initial\n}\nbody.sliding > .warn {\n  z-index: 2;\n  display: inline-block;\n  position: absolute;\n  width: 10vw;\n  left: 45vw;\n  bottom: 10vh;\n  animation-duration: 2s;\n  animation-name: warn;\n  pointer-events: none\n}\n#slide {\n  position: absolute;\n  z-index: 1;\n  width: 100vw;\n  height: 100vh;\n  object-fit: contain;\n  display: inherit;\n  top: 0;\n  left: 0\n}\n.outlined {\n  outline: 6px solid transparent;\n  animation-duration: 4s;\n  animation-name: Outlined\n}\nbody.sliding > div.nextgears {\n  display: block;\n  position: absolute;\n  z-index: 2;\n  width: 10vw;\n  filter: url(#__dropshadow);\n  right: -30vw;\n  top: 50%;\n  transform: translateY(-50%);\n  min-width: 50px;\n  transition: all ease .3s\n}\nbody.sliding > .nomoreimages {\n  z-index: 4;\n  pointer-events: none;\n  display: block;\n  width: 33vw;\n  height: 100vh;\n  top: 0;\n  position: fixed;\n  animation-duration: 1s;\n  animation-name: nomoreimages\n}\nspan.thumb {\n  max-width: 180px;\n  max-height: 180px\n}\n#menuel {\n  z-index: 3;\n  opacity: 1;\n  position: fixed;\n  display: block;\n  padding: 2px;\n  background: black;\n  width: 139px;\n  height: 67px;\n  overflow: hidden;\n  animation-duration: 1s\n}\n.gif[style] ~ #menuel {\n  height: 44px\n}\nbody.sliding > .menuel {\n  animation-name: menuelement\n}\n#menuel:hover {\n  animation-name: keepalive\n}\n#menuel a {\n  background: #fff;\n  color: #006FFA;\n  display: block;\n  font-size: 16px;\n  font-family: verdana, sans-serif;\n  font-weight: unset\n}\n#menuel a:hover {\n  color: #33CFFF ! important\n}\n#menuel a:visited {\n  color: #006FFA\n}\n#zoom_top {\n  position: fixed;\n  top: ${200 + paheal}px;\n  left: 0;\n  pointer-events: none;\n  width: calc(5vw + 60px);\n  height: 60px;\n  min-width: 110px;\n  z-index: 2;\n  overflow: hidden;\n  animation-duration: .6s;\n  opacity: 0\n}\n#zoom_top[style] {\n  display: block\n}\n#zoom_top > span {\n  position: absolute;\n  top: 1px;\n  transform: translateY(-100%);\n  box-shadow: 0 0 30px cyan;\n  background: black;\n  left: 30px;\n  width: 5vw;\n  height: 1.6vw;\n  border-radius: .8vw;\n  min-width: 50px\n}\nbody.sliding > .slideshow {\n  z-index: 2;\n  display: block;\n  position: fixed;\n  bottom: 20px;\n  right: 20px;\n  font-size: 16px;\n  font-family: verdana, sans-serif\n}\nbody.sliding > .progress {\n  z-index: 6;\n  display: block;\n  background-color: rgb(128,200,255);\n  height: 1vh;\n  position: absolute;\n  top: 0;\n  left: 0;\n  box-shadow: 0 .5vh 10px rgba(0,0,0,.7), inset 0 0 .1vh black;\n  transition: ease-in-out .08s width;\n  min-height: 3px;\n  min-width: 5px ! important;\n  max-width: 100vw;\n  pointer-events: none;\n  will-change: width, opacity\n}\nbody.sliding > .progfail {\n  background-color: red;\n  width: 100% ! important;\n  animation-name: progfail;\n  animation-duration: 1.5s\n}\nbody.sliding > .progdone {\n  width: 100% ! important;\n  animation-name: progfail;\n  animation-duration: .6s\n}\n.slideshow:hover:not([data-timer]) > div {\n  background: white;\n  color: black;\n  position: fixed;\n  display: block ! important;\n  bottom: 70px;\n  right: 20px\n}\nbody.sliding > .gif {\n  z-index: 5;\n  pointer-events: none;\n  position: absolute;\n  top: 3vh;\n  right: 2vw;\n  width: 3.5vw;\n  opacity: .7;\n  min-width: 50px;\n  transition: ease .15s margin-top;\n  margin-top: 0;\n  will-change: margin-top\n}\nbody.sliding {\n  padding: 0;\n  overflow: hidden\n}\nbody.sliding > .viewpre {\n  display: block\n}\nbody.sliding > .viewpre.showimagelist > .tentcon {\n  transform: unset\n}\n.viewpre > div {\n  display: inherit;\n  z-index: 5;\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: ${200 + paheal}px\n}\n.viewpre > .tentcon {\n  transform: translateY(-100%);\n  transition: ease .15s transform;\n  background: linear-gradient(to bottom, black, transparent);\n  will-change: transform\n}\n.viewpre:hover > .tentcon {\n  transform: unset\n}\n.viewpre .wrapthatshit, .viewpre .wrapthatshit > .listimage {\n  transform: rotateX(180deg);\n}\n.viewpre.showimagelist ~ .gif, .viewpre:hover ~ .gif {\n  margin-top: ${200 + paheal * 2}px\n}\n.wrapthatshit {\n  height: 100%;\n  width: 100%;\n  overflow-x: auto\n}\n.listimage {\n  height: ${180 + paheal}px;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  user-select: none;\n  margin: 0 auto\n}\n.listimage span {\n  height: ${180 + paheal}px;\n  width: ${180 + paheal}px;\n  text-align: center;\n  display: table-cell ! important;\n  vertical-align: middle\n}\n.listimage span img {\n  cursor: pointer\n}\n.listimage .current {\n  background: linear-gradient(to top, transparent 0%, hsla(204, 100%, 56%, .8) 2%, transparent 30%, transparent 100%)\n}\n.listimage .next::after {\n  content: "LOAD\\ANEXT\\APAGE";\n  font-size: 30px;\n  text-transform: full-width;\n  white-space: pre-wrap;\n  color: white;\n  filter: url(#__dropshadow)\n}\n.listimage .next {\n  cursor: pointer\n}\nbody.sliding > .posel {\n  position: fixed;\n  bottom: 20px;\n  left: 0;\n  display: block;\n  pointer-events: none;\n  z-index: 2;\n  font-size: 16px;\n  font-family: verdana, sans-serif\n}\n.posel > div {\n  position: relative;\n  color: #fff;\n  z-index: 2\n}\n.posel::before {\n  content: attr(title);\n  position: absolute;\n  -webkit-text-stroke: 2px black;\n  left: 0;\n  z-index: 1\n}\n[data-res]:hover::after {\n  content: attr(data-res);\n  color: white;\n  position: absolute;\n  top: 8px;\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 3px 5px;\n  background: rgba(0,0,0,.7);\n  border-radius: 5px;\n  border: 2px black solid;\n  box-shadow: 0 0 2px 1px black;\n  pointer-events: none\n}\n[data-res]:hover {\n  position: relative;\n  display: inline-block\n}\nbody:not(.sliding) > div.viewpre {\n  display: none ! important\n}\nbody > .oFfScReEn {\n  display: block;\n  position: fixed;\n  top: -500px\n}`
};

Main.init();
