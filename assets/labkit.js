/* ahnboat lab 도구함 공통 코드 — 모든 도구 페이지가 함께 쓴다.
   LabKit.TOOLS        도구 목록 (새 도구는 여기 한 줄 추가 → 모든 페이지 위쪽 메뉴에 나타남)
   LabKit.nav(el, cur, base)       위쪽 메뉴 그리기 (오른쪽 끝에 지금 도구의 버전)
   LabKit.versionBox(footer, id)   바닥글에 버전·바뀐 점 접기 상자
   LabKit.stamp(id)                지시문 끝에 붙이는 '어떤 판으로 만들었는지' 한 줄
   LabKit.sprites(base)            .spr 요소를 캐릭터 팩 동작 그림으로 움직이기
   LabKit.loadSX(base)             개념 지도 색인(feeds/search.json) 읽기 (Promise)
   LabKit.findConcepts(SX, text, sel)  글에서 관련 개념 찾기 (+ 관계로 이어진 개념)
   LabKit.checkLinks(SX, text)     AI 답의 연구실 링크를 개념 지도와 대조
   LabKit.esc(t)                   HTML 이스케이프
*/
(function () {
  "use strict";
  /* 버전 표시: 도구를 고칠 때마다 log 맨 앞에 [버전, 날짜, 바뀐 점] 한 줄을 더한다. 맨 앞 줄이 지금 버전이다. */
  var TOOLS = [
    { id: "home",   href: "",        name: "연구실 도구함",   short: "도구함",
      log: [["v1.2", "2026-11-26", "비포·애프터 그림 반영: 오리지널 'AI 손님 일곱'이 가이드 매뉴얼(도구함)을 받고 달라지는 두 컷"],
            ["v1.1", "2026-11-26", "'도구함이 하는 일' 비포·애프터 그림 자리 (그림을 올리면 자동으로 나타남)"],
            ["v1.0", "2026-11-26", "첫 판: 도구 목록, 공통 메뉴, 모든 도구가 함께 쓰는 코드(labkit)"]] },
    { id: "check",  href: "check/",  name: "아이디어 검증하기", short: "아이디어 검증", icon: "asst_spark",
      desc: "머릿속 아이디어를 연구실 개념 지도에 비춰, AI가 근거 있는 것과 없는 것을 나눠 답하게 합니다.",
      log: [["v1.4", "2026-11-26", "연구실 도구함으로 옮김(check/), 공통 메뉴·버전 표시, 개념 찾기에서 숫자 낱말·예시 값 걸러 내기"],
            ["v1.3", "2026-11-24", "관계로 이어진 개념까지 찾기, 분야 카드에 색인 콘텐츠 수와 홈페이지 수를 함께 표시"],
            ["v1.2", "2026-11-24", "ChatGPT 시험 반영: 텍스트판 피드, 관련 개념 미리 찾기, 답 형식 선택, 답 확인 도우미"],
            ["v1.1", "2026-11-24", "Genspark 표지·무대 배경 그림, 공유 미리보기"],
            ["v1.0", "2026-11-24", "첫 판: 분야별 온톨로지 피드, 지시문 만들기, 하루·시아·모아 튜토리얼, AI 판단 코너"]] },
    { id: "review", href: "review/", name: "결과물 평가하기", short: "결과물 평가", icon: "sia_explain",
      desc: "아이디어·논문·제안서·사내 개선안·강의안·도안을 기준표로 채점하고, AI 점수가 부풀려졌는지 확인합니다.",
      log: [["v1.0", "2026-11-26", "첫 판: 기준표 6종(항목 40개), 심사위원·반대 심사위원, 튜토리얼, 점수 확인 도우미"]] }
  ];
  TOOLS.forEach(function (t) { t.version = t.log[0][0]; t.date = t.log[0][1]; });
  function tool(id) { return TOOLS.filter(function (t) { return t.id === id; })[0]; }
  function ver(id) { var t = tool(id); return t ? t.version : ""; }
  /* 지시문 끝에 붙이는 한 줄: 어떤 판으로 만든 지시문인지 남긴다 */
  function stamp(id) { var t = tool(id); return t ? "— 만든 도구: ahnboat lab " + t.name + " " + t.version + " (" + t.date + ")" : ""; }
  /* 바닥글 맨 앞에 '도구 이름 버전 · 날짜 · 바뀐 점' 접기 상자를 넣는다 */
  function versionBox(el, id) {
    var t = tool(id); if (!el || !t) return;
    var d = document.createElement("details");
    d.className = "labver";
    d.innerHTML = "<summary><b>" + esc(t.name) + " " + esc(t.version) + "</b> · " + esc(t.date) + " · 바뀐 점</summary><ul>" +
      t.log.map(function (l) { return "<li><b>" + esc(l[0]) + "</b> <span>" + esc(l[1]) + "</span> — " + esc(l[2]) + "</li>"; }).join("") + "</ul>";
    el.insertBefore(d, el.firstChild);
  }

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function nav(el, cur, base) {
    if (!el) return;
    el.className = "labnav";
    var c = tool(cur);
    el.innerHTML = TOOLS.map(function (t) {
      return '<a href="' + base + t.href + '"' + (t.id === cur ? ' aria-current="page" class="on"' : "") + ">" + esc(t.id === "home" ? "🧪 " + t.name : t.short) + "</a>";
    }).join("") + (c ? '<span class="ver" title="' + esc(c.name + " " + c.version + " · " + c.date) + '">' + esc(c.version) + "</span>" : "");
  }

  /* ---------- 픽셀 캐릭터 (캐릭터 팩 lab4 동작 그림 가로 스트립) ---------- */
  var SHEETS = {
    doc:  { file: "doc_fight_d4_192.webp",  fw: 118, n: 8 },
    asst: { file: "asst_fight_a4_192.webp", fw: 119, n: 8 },
    sia:  { file: "sia_fight_s14_192.webp", fw: 98,  n: 8 },
    moa:  { file: "moa_fight_m14_192.webp", fw: 103, n: 8 },
    siaclap: { file: "sia_fight_s14_192.webp", fw: 98, n: 8 },
    moaclap: { file: "moa_fight_m14_192.webp", fw: 103, n: 8 },
    robo: { file: "robo_fight_r2_192.webp", fw: 120, n: 8 },
    fly:  { file: "fly_fight_f1_192.webp",  fw: 166, n: 8 },
    x1:   { file: "x1_crowd_x1a_192.webp",  fw: 119, n: 8 },
    x2:   { file: "x2_crowd_x2a_192.webp",  fw: 149, n: 8 },
    x3:   { file: "x3_crowd_x3a_192.webp",  fw: 171, n: 8 }
  };
  function sprites(base) {
    var FH = 192, FILL = 0.72, list = [];
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function draw(o) { o.el.style.backgroundPosition = (-Math.round(o.sh.fw * o.sc * (o.frames[o.i] - 1))) + "px 0"; }
    function layout() {
      list.forEach(function (o) {
        var st = o.el.closest(".stage"), u = Math.min(1.2, (st ? st.clientWidth : 780) / 780);
        var h = Math.round(118 * o.r / FILL * u), sc = h / FH;       // 박사(1.00)의 서 있는 키 ≈ 118px
        o.el.style.width = Math.round(o.sh.fw * sc) + "px"; o.el.style.height = h + "px";
        o.el.style.backgroundSize = Math.round(o.sh.fw * o.sh.n * sc) + "px " + h + "px";
        o.sc = sc; draw(o);
      });
    }
    document.querySelectorAll(".spr").forEach(function (el) {
      var sh = SHEETS[el.dataset.s]; if (!sh) return;
      var o = { el: el, sh: sh, r: parseFloat(el.dataset.r), frames: el.dataset.f.split(",").map(Number), i: 0, fps: parseFloat(el.dataset.fps || "0") };
      el.style.backgroundImage = "url(" + base + "assets/char/" + sh.file + ")";
      list.push(o);
      if (!reduce && o.fps > 0 && o.frames.length > 1) setInterval(function () { o.i = (o.i + 1) % o.frames.length; draw(o); }, 1000 / o.fps);
    });
    layout();
    window.addEventListener("resize", layout);
  }

  /* ---------- 개념 지도 색인 ---------- */
  var sxPromise = null;
  function loadSX(base) {
    if (!sxPromise) sxPromise = fetch(base + "feeds/search.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function (e) { sxPromise = null; throw e; });
    return sxPromise;
  }

  var STOP = "그렇다면 그러면 무엇 무엇이 것 것은 같다 같은 같은데 있을까 있다 있는 하는 한다 된다 되는 방식 방식으로 정도 많이 매우 구조가 추정할 수 다르고 다른 처럼 이런 그런 어떤 통해 대한 위한 관련 생각 아이디어 이것 그것 우리 내가 나는 경우 때문 때문에 하면 해서 보면 봐야 싶다 확인 검증 가능 가능한 가능할까 정말 아주 조금 거의 모든 각각 서로 사이 기존 전통적 일정 예산 목표 방법 배경 기대 효과 결과 내용 계획 운영 시범 단계 기간 감소 증가 개선 활용 필요 현황 문제 하루 종일 정도의 이번 다음 제안 제안서 과제 단위 자료 기록".split(" ");
  function toks(t) {
    var out = [];
    t.split(/[^0-9A-Za-z가-힣]+/).forEach(function (w) {
      if (!w) return;
      if (/^[가-힣]+$/.test(w) && w.length > 2) w = w.replace(/(으로|에서|에게|까지|부터|처럼|보다|이며|이고|이란|라는|하는|으로서|와의|과의|은|는|이|가|을|를|의|와|과|로|에|도|만)$/, "");
      if (w.length < 2 || STOP.indexOf(w) >= 0 || /^[0-9]/.test(w)) return;   // 숫자로 시작하는 낱말(3개월·2년)은 개념 이름이 아니다
      if (out.indexOf(w) < 0) out.push(w);
    });
    return out;
  }

  /* 글(idea)에서 관련 개념 찾기. sel = {분야 번호: 1} (비어 있으면 모든 분야)
     돌려주는 것: [{c, sc, mine, rel, via, on}] — 직접 찾은 것 → 관계로 이어진 것 → 고르지 않은 분야 순 */
  function findConcepts(SX, idea, sel) {
    sel = sel || {};
    var tk = toks(idea), low = idea.toLowerCase();
    var seen = {}, res = [], W = {};
    tk.forEach(function (t) {   // 낱말 무게: 개념 이름에 드물게 나오는 낱말일수록 무겁게 (네트워크·학습처럼 흔한 낱말은 가볍게)
    var df = 0; SX.concepts.forEach(function (c) { if (c[0].indexOf(t) >= 0) df++; });
    W[t] = df === 0 ? 0 : df <= 3 ? 5 : df <= 12 ? 4 : df <= 40 ? 2 : 1;
    });
    SX.concepts.forEach(function (c) {
    var ko = c[0], en = (c[1] || "").toLowerCase(), def = c[3] || "", sc = 0, dhit = 0;
    if (ko.length >= 2 && idea.indexOf(ko) >= 0) sc += ko.length >= 3 ? 7 : 5;
    if (en.length >= 4 && low.indexOf(en) >= 0) sc += 4;
    tk.forEach(function (t) {
      if (ko.indexOf(t) >= 0) sc += W[t] + (ko === t ? 2 : 0);
      else if (/^[a-z]/i.test(t) && en.indexOf(t.toLowerCase()) >= 0) sc += 2;
      if (dhit < 2 && def.indexOf(t) >= 0 && (W[t] || 0) >= 2) { sc += 1; dhit++; }
    });
    if (!def || def === ko) sc -= 2;   // 정의가 없거나 이름을 되풀이한 개념은 근거로 약하니 뒤로
    if (/주판봇|초파리|대결에서|이 페이지의 예시|예시 단위/.test(def)) sc -= 4;   // 해설 페이지 안의 장면·예시 값은 일반 개념이 아니다
    if (sc < 4) return;
    var key = ko + "|" + c[4];
    if (seen[key]) return; seen[key] = 1;
    var mine = c[5].some(function (i) { return sel[i]; });
    res.push({ c: c, sc: sc + (mine ? 1 : 0), mine: mine });
    });
    res.sort(function (a, b) { return b.sc - a.sc || a.c[0].length - b.c[0].length; });
    var anySel = Object.keys(sel).length > 0;
    var direct = res.filter(function (r) { return r.mine || !anySel; }).slice(0, 12);
    var otherF = anySel ? res.filter(function (r) { return !r.mine; }).slice(0, 6) : [];
    // 관계로 이어진 개념: 위쪽 직접 찾은 개념 8개의 이웃 (아이디어에 쓰지 않은 낱말의 개념을 찾는다)
    var have = {}, nbs = {};
    direct.concat(otherF).forEach(function (r) { have[r.c[0] + "|" + r.c[4]] = 1; });
    var PRI = { "관련": 0, "먼저 알아야 함": 1, "상위 개념": 2, "대비": 2 };
    direct.slice(0, 8).forEach(function (r, rank) {
    var taken = 0;   // 개념 하나에서 이웃은 둘까지 (이웃이 많은 개념이 자리를 독차지하지 않게)
    (r.c[6] || []).slice().sort(function (a, b) { return (PRI[a[1]] === undefined ? 3 : PRI[a[1]]) - (PRI[b[1]] === undefined ? 3 : PRI[b[1]]); })
    .forEach(function (e) {
      if (taken >= 2) return;
      var c = SX.concepts[e[0]]; if (!c || !c[3]) return;
      var k = c[0] + "|" + c[4]; if (have[k]) return;
      var mine = c[5].some(function (i) { return sel[i]; }) || !anySel;
      if (!mine) return;
      if (!nbs[k]) taken++;
      var x = nbs[k] || (nbs[k] = { c: c, sc: 0, mine: true, rel: true, via: [], pri: 9, rank: rank });
      var pr = PRI[e[1]] === undefined ? 3 : PRI[e[1]];
      x.sc += 2; x.pri = Math.min(x.pri, pr); if (x.via.length < 2) x.via.push(r.c[0] + " → " + e[1]);
    });
    });
    var rel = Object.keys(nbs).map(function (k) { return nbs[k]; })
    .sort(function (a, b) { return b.sc - a.sc || a.pri - b.pri || a.rank - b.rank; }).slice(0, 8);
    rel.forEach(function (r) { r.on = r.sc >= 4; });
    direct.concat(otherF).forEach(function (r) { r.on = true; });
    return direct.concat(rel, otherF);
  }

  /* AI 답의 연구실 링크 대조. 돌려주는 것: {html, ok, mid, bad, urls, nFeed, nGen, noLink} */
  function checkLinks(SX, t) {
    var re = /https?:\/\/adminmrobo\.github\.io\/[^\s)\]>"'`,]+/g, m, urls = [], seen = {};
    while ((m = re.exec(t))) {
    var u = m[0].replace(/[.;:!?]+$/, ""), clean = u.replace(/\?[^#]*/, "");
    if (!seen[clean]) { seen[clean] = 1; urls.push({ raw: u, clean: clean, utm: u !== clean }); }
    }
    var byUrl = {};
    SX.concepts.forEach(function (c) { (byUrl[c[4]] = byUrl[c[4]] || []).push(c[0]); });
    var ok = 0, mid = 0, bad = 0, rows = urls.map(function (x) {
    var page = x.clean.split("#")[0], anc = x.clean.indexOf("#") >= 0 ? "#" + x.clean.split("#")[1] : "";
    var pa = SX.pages[page], st, cls, note;
    if (byUrl[x.clean]) { st = "있음"; cls = "ok"; ok++; note = byUrl[x.clean].slice(0, 4).join(", "); }
    else if (pa && pa.indexOf(anc) >= 0) { st = "있음"; cls = "ok"; ok++; note = anc ? "그 위치에 개념이 걸려 있음" : "연구실 페이지"; }
    else if (pa) { st = "위치 확인 필요"; cls = "mid"; mid++; note = "페이지는 있지만 " + anc + " 위치에는 개념이 없음"; }
    else if (x.clean.indexOf("/ahnboat_ontology_feed/") >= 0) { st = "피드 주소"; cls = "ok"; ok++; note = "근거 피드 자체"; }
    else { st = "없는 주소"; cls = "bad"; bad++; note = "개념 지도에 없는 주소 — 지어낸 출처일 수 있음"; }
    return "<tr><td class=\"st " + cls + "\">" + st + "</td><td><a href=\"" + esc(x.clean) + "\" target=\"_blank\" rel=\"noopener\"><code>" +
      esc(x.clean.replace("https://adminmrobo.github.io/", "")) + "</code></a>" + (x.utm ? " <small class=\"note\">(추적 꼬리표는 떼고 확인)</small>" : "") + "</td><td>" + esc(note) + "</td></tr>";
    });
    var nFeed = (t.match(/\[피드\]/g) || []).length, nGen = (t.match(/\[일반 지식/g) || []).length;
    var noLink = t.split("\n").filter(function (l) { return l.indexOf("[피드]") >= 0 && !/adminmrobo\.github\.io/.test(l); }).length;
    var h = '<div class="tally"><span>[피드] 표시 ' + nFeed + '번</span><span>[일반 지식] 표시 ' + nGen + '번</span><span>연구실 링크 ' + urls.length +
    '개</span><span class="ok">있음 ' + ok + '</span><span class="mid">위치 확인 ' + mid + '</span><span class="bad">없는 주소 ' + bad + '</span></div>';
    if (urls.length) h += '<table><thead><tr><th>판정</th><th>링크</th><th>내용</th></tr></thead><tbody>' + rows.join("") + "</tbody></table>";
    return { html: h, ok: ok, mid: mid, bad: bad, urls: urls, nFeed: nFeed, nGen: nGen, noLink: noLink };
  }

  window.LabKit = { TOOLS: TOOLS, tool: tool, ver: ver, stamp: stamp, versionBox: versionBox, nav: nav, sprites: sprites, loadSX: loadSX, findConcepts: findConcepts, checkLinks: checkLinks, toks: toks, esc: esc };
})();
