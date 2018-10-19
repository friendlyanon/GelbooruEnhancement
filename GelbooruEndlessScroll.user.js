// ==UserScript==
// @id             gelbooru-endless-scroll
// @name           Gelbooru Endless Scroll
// @version        1.6.9.7
// @namespace      intermission
// @author         intermission
// @description    Adds endless scroll function to various boorus
// @match          *://gelbooru.com/index.php?*
// @match          *://rule34.xxx/index.php?*
// @match          *://e621.net/post/index/*
// @match          *://*.booru.org/index.php?*
// @match          *://rule34.paheal.net/post/list*
// @match          *://yande.re/post*
// @match          *://lolibooru.moe/*
// @match          *://konachan.com/*
// @match          *://atfbooru.ninja/*
// @match          *://safebooru.org/*
// @match          *://hypnohub.net/*
// @match          *://tbib.org/*
// @match          *://booru.splatoon.ink/*
// @run-at         document-end
// @grant          none
// ==/UserScript==

/* This program is free software. It comes without any warranty, to the extent
 * permitted by applicable law. You can redistribute it and/or modify it under
 * the terms of the Do What The Fuck You Want To Public License, Version 2, as
 * published by Sam Hocevar. See http://www.wtfpl.net/ for more details. */

(function(){
  "use strict";
  var d = document, url, host = location.hostname.match(/[^.]+\.[^.]+$/)[0],
  v = ".thumb",
  vis = function() {
    var rect = target().getBoundingClientRect();
    return rect.x === 0 && rect.y === 0 ? false :
      rect.top + rect.height >= 0 &&
      document.documentElement.clientHeight - rect.bottom + rect.height >= 0;
  }, total, myImuoto = ~["yande.re", "lolibooru.moe", "konachan.com", "hypnohub.net"].indexOf(host),
  page = function(doc) {
    try {
      var images, pageNo = d.createElement("paheal.net" === host ? "div" : "span"), frag = d.createDocumentFragment(), container,
      fn = (e) => {
        (e = e.target.parentNode.parentNode).style.overflow = "";
        if (!e.getAttribute("style")) e.removeAttribute("style");
      };
      const isGelbooru = host === "gelbooru.com";
      if (isGelbooru && !d.querySelector("body > .viewpre > .tentcon"))
        v = ".thumbnail-preview";
      images = [...doc.querySelectorAll(myImuoto ? "li[id^='p'][class*='creator-id-']" : v)];
      if (images.length === 0)
        throw Error("API error");
      pageNo.innerHTML = '<span style="height:' + ("paheal.net" === host ? "180px" : "inherit") + ';display:flex;flex-direction:column;">Page ' + url.index + '~<span style="margin:auto 0 30px">out of ' + total + "</span></span>";
      pageNo.className = "thumb";
      if ("paheal.net" === host)
        pageNo.setAttribute("style", "transform: translateY(-180px); margin-bottom: -180px");
      frag.appendChild(pageNo);
      let key;
      for (let a of images) {
        let img = a.querySelector("img");
        if (isGelbooru && !~String(img.getAttribute("src")).indexOf("/")) {
          img.className = "preview";
          if (!key)
            for (let [k, v] of Object.entries(img.dataset))
              if (/[a-f0-9]{32}/.test(v)) {
                key = k;
                break;
              }
          img.setAttribute("src", img.getAttribute("data-" + key));
          img.removeAttribute("data-" + key);
        }
        a.style.overflow = "hidden";
        img.addEventListener("load", fn, { once : true });
        frag.appendChild(a);
      }
      container = d.querySelector(v).parentNode;
      if (container.lastElementChild.tagName === "SPAN") container.appendChild(frag);
      else container.insertBefore(frag, container.querySelector(v + ":last-of-type + *"));
      target().classList.remove("loadingu");
      if (paginator.go) paginator();
      if (list.length > 0) {
        events(true);
        process();
      } return;
    } catch(err) { console.error(err); }
  }, req = _ => fetch(url.href, { credentials: "include" }).then(
    x => x.text().then(
      text => page((new DOMParser()).parseFromString(text, "text/html"))
    )
  ).catch(err => {
    target().classList.remove("loadingu");
    if (typeof err !== "undefined") {
      if (_.attempt < 10) {
        console.error(`An error occured, ${~_.attempt + 11} retries left\n`, err.message, err.stack);
        ++_.attempt;
        setTimeout(req, 5000, _);
      } else
        console.error("Maximum number of retries reached\n", err.message, err.stack);
    }
  }), process = function(_override) {
    if (!d.hidden && vis() || (typeof _override === "boolean" ? _override : false)) {
      target().classList.add("loadingu");
      events();
      url = list.shift();
      return req({attempt: 0});
    }
  }, events = function(_on) {
    var name = _on ? "addEventListener" : "removeEventListener", obj = { passive : true };
    ["scroll", "resize", "visibilitychange"].forEach(evt => window[name](evt, process, obj));
  }, list = [], r = /(page=|pid=|index\/)([0-9]+)|(list\/(?:[^/]+\/)?)([0-9]+)$/, paginator = function() {
    var el = target(), rect1 = d.querySelector(".thumb:last-of-type"),
      el2 = d.querySelector(".sidebar"), rect2;
    if (el.classList.contains("pagination")) el = el.parentNode;
    rect1 = rect1.offsetTop + rect1.offsetHeight;
    rect2 = el2.offsetTop + el2.offsetHeight - 9;
    if (rect2 >= rect1) {
      el.style.position = "absolute";
      el.style.top = rect1 + "px";
      el.style.left = "calc(50vw + " + el2.getBoundingClientRect().width / 2 + "px)";
      el.style.transform = 'translateX(-50%)';
    } else {
      el.style.position = "";
      el.style.top = "";
      el.style.left = "";
      el.style.transform = "";
      paginator.go = false;
    }
  };
  const target = () => d.querySelector("div.pagination") || d.querySelector("div#paginator") || d.querySelector("section#paginator");
  {
    let style = d.createElement("style");
    style.appendChild(d.createTextNode(`.loadingu {
  position: relative;
}
.loadingu::after {
  content: "" ! important;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  min-width: 34px;
  min-height: 34px;
  background: rgba(0,0,0,.5) no-repeat center center url(data:image/svg+xml,%3Csvg%20width%3D%2234px%22%20height%3D%2234px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%20preserveAspectRatio%3D%22xMidYMid%22%20class%3D%22uil-ring-alt%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22none%22%20class%3D%22bk%22%3E%3C%2Frect%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20stroke%3D%22%23b4b197%22%20fill%3D%22none%22%20stroke-width%3D%2210%22%20stroke-linecap%3D%22round%22%3E%3C%2Fcircle%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20stroke%3D%22%23f4efcc%22%20fill%3D%22none%22%20stroke-width%3D%226%22%20stroke-linecap%3D%22round%22%3E%3Canimate%20attributeName%3D%22stroke-dashoffset%22%20dur%3D%221s%22%20repeatCount%3D%22indefinite%22%20from%3D%220%22%20to%3D%22502%22%3E%3C%2Fanimate%3E%3Canimate%20attributeName%3D%22stroke-dasharray%22%20dur%3D%221s%22%20repeatCount%3D%22indefinite%22%20values%3D%22150.6%20100.4%3B1%20250%3B150.6%20100.4%22%3E%3C%2Fanimate%3E%3C%2Fcircle%3E%3C%2Fsvg%3E);
}`));
    d.head.appendChild(style);
  }
  if (target() && /\/post\/?|page=post/.test(location.href)) {
    let pid = location.href.match(r),
    p = (pid && pid[1] === "index/" || myImuoto ? target().lastElementChild.previousElementSibling : location.hostname.endsWith("rule34.xxx") ? [...target().children].find(a => a.getAttribute("alt") === "last page") : target().lastElementChild).href,
    n = d.querySelectorAll(v).length,
    start_index, end_index, increment = 1, index = 0;
    if (host === "paheal.net") {
      let ayy = [...target().children[0].children];
      p = ayy[ayy.indexOf(ayy.find(el => !!~el.textContent.indexOf("Random"))) + 2].href;
    }
    if (!p) return;
    switch(host) {
    case "booru.org":
    case "splatoon.ink":
      start_index = pid ? pid[2] / n : 0;
      increment = n;
      end_index = p.match(r)[2] / n;
      index = 1;
      break;
    case "e621.net":
      start_index = pid ? +pid[2] : 2;
      end_index = +p.match(r)[2];
      break;
    case "yande.re":
    case "lolibooru.moe":
    case "konachan.com":
    case "hypnohub.net":
      start_index = pid ? +pid[2] : 1;
      end_index = +p.match(r)[2];
      break;
    case "paheal.net":
      start_index = pid ? +pid[4] : 1;
      end_index = +p.match(r)[4];
      break;
    case "gelbooru.com":
      start_index = pid ? pid[2] / n : 0;
      increment = n;
      end_index = p.match(r)[2] / n;
      index = 1;
      break;
    default:
      start_index = pid ? pid[2] / n : 0;
      increment = n;
      end_index = p.match(r)[2] / n;
      index = 1;
      paginator.go = true;
      break;
    }
    while(start_index < end_index)
      list.push({
        href: p.replace(r, (host === "paheal.net" ? "$3" : "$1") + ++start_index * increment),
        index: start_index + index
      });
    total = end_index + index;
  } else
    throw Error("*shrug*");
  if (paginator.go) paginator();
  window.addEventListener("keypress", () => {
    if (typeof url !== "object" && vis()) process();
  }, { once : true });
  d.addEventListener("gelbooru-slide", e => {
    if (list.length > 0)
      events(e.detail);
  }, false);
  d.addEventListener("gelbooru-slide-next", e => {
    if (list.length > 0) {
      clearTimeout(e.detail);
      d.querySelector(".loadingu").classList.remove("loadingu");
      process(true);
    }
  }, false);
  events(true);
  if (vis()) process();
}());
