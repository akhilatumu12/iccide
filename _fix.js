(function () {
  // Next.js's <Image> client component reconstructs src/srcset as
  // /_next/image?url=...&w=..&q=.. on hydration, which only resolves on
  // Vercel's image-optimization API. This mirror is static, so that endpoint
  // doesn't exist -- redirect any such attribute back to the original file.
  function directFromNextImage(val) {
    if (!val) return null;
    var idx = val.indexOf("/_next/image");
    if (idx === -1) return null;
    var qIndex = val.indexOf("?", idx);
    if (qIndex === -1) return null;
    var params = new URLSearchParams(val.slice(qIndex + 1));
    var real = params.get("url");
    return real ? decodeURIComponent(real) : null;
  }

  function patch(img) {
    var direct = directFromNextImage(img.getAttribute("src"));
    if (direct) img.setAttribute("src", direct);
    var srcset = img.getAttribute("srcset");
    if (srcset && srcset.indexOf("/_next/image") !== -1) {
      img.removeAttribute("srcset");
    }
  }

  document.querySelectorAll("img").forEach(patch);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (
        m.type === "attributes" &&
        (m.attributeName === "src" || m.attributeName === "srcset") &&
        m.target.tagName === "IMG"
      ) {
        patch(m.target);
      }
    });
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["src", "srcset"],
    subtree: true,
  });

  document.addEventListener(
    "error",
    function (e) {
      if (e.target && e.target.tagName === "IMG") patch(e.target);
    },
    true
  );
})();

(function () {
  // The header dropdowns (About / Committees / Speakers) are pure CSS
  // group-hover with no forgiveness: the trigger is a narrow text link and
  // the panel sits just below it, so any natural (non-dead-straight) mouse
  // path from trigger to menu item can momentarily leave both boxes and the
  // menu snaps shut before it can be clicked. Add a short close-delay and
  // force the panel open via a class so real mouse movement is tolerated.
  var CLOSE_DELAY = 350;
  var closeTimers = new WeakMap();

  function isDropdownGroup(li) {
    return (
      li.tagName === "LI" &&
      li.classList.contains("group") &&
      li.querySelector(':scope > ul[class*="group-hover:flex"]')
    );
  }

  function wire(li) {
    if (li.__hoverFixWired) return;
    li.__hoverFixWired = true;
    var panel = li.querySelector(':scope > ul[class*="group-hover:flex"]');
    if (!panel) return;

    function open() {
      var t = closeTimers.get(li);
      if (t) {
        clearTimeout(t);
        closeTimers.delete(li);
      }
      li.classList.add("force-open");
    }
    function scheduleClose() {
      var t = closeTimers.get(li);
      if (t) clearTimeout(t);
      closeTimers.set(
        li,
        setTimeout(function () {
          li.classList.remove("force-open");
          closeTimers.delete(li);
        }, CLOSE_DELAY)
      );
    }

    li.addEventListener("mouseenter", open);
    li.addEventListener("mouseleave", scheduleClose);
    panel.addEventListener("mouseenter", open);
    panel.addEventListener("mouseleave", scheduleClose);
    // touch/click support: tapping the trigger toggles the panel
    var trigger = li.querySelector(":scope > a");
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        if (!li.classList.contains("force-open")) {
          e.preventDefault();
          open();
        }
      });
    }
  }

  function wireAll() {
    document.querySelectorAll("li.group").forEach(function (li) {
      if (isDropdownGroup(li)) wire(li);
    });
  }

  var style = document.createElement("style");
  style.textContent =
    'li.group.force-open > ul[class*="group-hover:flex"] { display: flex !important; }';
  document.head.appendChild(style);

  wireAll();
  new MutationObserver(wireAll).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

(function () {
  // The mobile hamburger button (.uni_navbar-menu) is leftover markup from
  // an unfinished component: it has no working click handler on the live
  // site either, so the mobile nav has never actually opened. Build a real
  // one and wire it to the existing button.
  var NAV = [
    { text: "Home", href: "/" },
    {
      text: "About",
      children: [
        { text: "Conference", href: "/conference" },
        { text: "University", href: "/university" },
        { text: "School", href: "/school" },
      ],
    },
    {
      text: "Committees",
      children: [
        { text: "Organizing Committee", href: "/organizing-committee" },
        { text: "Program Committee", href: "/program-committee" },
      ],
    },
    { text: "Call For Papers", href: "/call-for-papers" },
    { text: "Important Dates", href: "/important-dates" },
    {
      text: "Speakers",
      children: [
        { text: "Present Speakers", href: "/present-speakers" },
        { text: "Previous Speakers", href: "/previous-speakers" },
      ],
    },
    { text: "Paper Submission", href: "/paper-submission" },
    { text: "Registration", href: "/registration" },
    { text: "Contact Us", href: "/contact-us" },
  ];

  function close() {
    var o = document.getElementById("mnav-overlay");
    if (o) o.classList.remove("open");
    document.body.style.overflow = "";
  }

  function build() {
    if (document.getElementById("mnav-overlay")) return;

    var style = document.createElement("style");
    style.textContent = [
      "#mnav-overlay{position:fixed;inset:0;z-index:9999;display:none;font-family:sans-serif;}",
      "#mnav-overlay.open{display:block;}",
      "#mnav-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.5);}",
      "#mnav-panel{position:absolute;top:0;right:0;height:100%;width:80%;max-width:320px;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.25);overflow-y:auto;padding:18px 20px 40px;transform:translateX(100%);transition:transform .25s ease;box-sizing:border-box;}",
      "#mnav-overlay.open #mnav-panel{transform:translateX(0);}",
      "#mnav-close{font-size:30px;line-height:1;color:#650010;text-align:right;cursor:pointer;padding:2px 4px 12px;}",
      "#mnav-list{list-style:none;margin:0;padding:0;}",
      "#mnav-list>li{border-bottom:1px solid #eee;padding:10px 0;}",
      ".mnav-top-link,.mnav-top-label{display:block;font-weight:700;font-size:17px;color:#650010;font-family:serif;text-decoration:none;}",
      ".mnav-sub{list-style:none;margin:8px 0 0 12px;padding:0;display:flex;flex-direction:column;gap:10px;}",
      ".mnav-sub a{display:block;font-size:15px;color:#333;text-decoration:none;}",
    ].join("");
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "mnav-overlay";

    var backdrop = document.createElement("div");
    backdrop.id = "mnav-backdrop";
    backdrop.addEventListener("click", close);
    overlay.appendChild(backdrop);

    var panel = document.createElement("div");
    panel.id = "mnav-panel";

    var closeBtn = document.createElement("div");
    closeBtn.id = "mnav-close";
    closeBtn.setAttribute("aria-label", "Close menu");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", close);
    panel.appendChild(closeBtn);

    var list = document.createElement("ul");
    list.id = "mnav-list";

    NAV.forEach(function (item) {
      var li = document.createElement("li");
      if (item.href) {
        var a = document.createElement("a");
        a.href = item.href;
        a.textContent = item.text;
        a.className = "mnav-top-link";
        a.addEventListener("click", close);
        li.appendChild(a);
      } else {
        var label = document.createElement("div");
        label.textContent = item.text;
        label.className = "mnav-top-label";
        li.appendChild(label);
      }
      if (item.children) {
        var sub = document.createElement("ul");
        sub.className = "mnav-sub";
        item.children.forEach(function (c) {
          var sli = document.createElement("li");
          var sa = document.createElement("a");
          sa.href = c.href;
          sa.textContent = c.text;
          sa.addEventListener("click", close);
          sli.appendChild(sa);
          sub.appendChild(sli);
        });
        li.appendChild(sub);
      }
      list.appendChild(li);
    });

    panel.appendChild(list);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function open() {
    build();
    document.getElementById("mnav-overlay").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function toggle() {
    var o = document.getElementById("mnav-overlay");
    if (o && o.classList.contains("open")) close();
    else open();
  }

  function wireHamburger() {
    var btn = document.querySelector(".uni_navbar-menu");
    if (!btn || btn.__mnavWired) return;
    btn.__mnavWired = true;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
  }

  wireHamburger();
  new MutationObserver(wireHamburger).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 768) close();
  });
})();

(function () {
  // The PDF preview <object> tags (Program Schedule, Invitation) use
  // hardcoded pixel width/height (e.g. 600x450) that overflow on mobile
  // and tablet widths. Make them fluid while keeping their aspect ratio.
  function fix(obj) {
    if (obj.__responsiveFixed) return;
    var w = parseInt(obj.getAttribute("width"), 10);
    var h = parseInt(obj.getAttribute("height"), 10);
    if (!w || !h) return;
    obj.__responsiveFixed = true;
    obj.style.width = "100%";
    obj.style.maxWidth = w + "px";
    obj.style.height = "auto";
    obj.style.aspectRatio = w + " / " + h;
  }
  function fixAll() {
    document
      .querySelectorAll('object[type="application/pdf"]')
      .forEach(fix);
  }
  fixAll();
  new MutationObserver(fixAll).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

(function () {
  // Every page wraps its main content section and its footer section in a
  // shared layout component hardcoded to max-h-[1800px], with no overflow
  // rule attached. Whenever real content needs more room than that -- which
  // happens on any page once elements stack into a single column (mobile,
  // tablet, or a split/narrow desktop window) -- the excess visually spills
  // out past the box and overlaps whatever section comes next (typically the
  // footer). There's no legitimate reason for the cap: it's never paired
  // with overflow-auto/scroll anywhere on the site, so it's safe to lift.
  var style = document.createElement("style");
  style.textContent = '.max-h-\\[1800px\\]{max-height:none!important;}';
  document.head.appendChild(style);
})();
