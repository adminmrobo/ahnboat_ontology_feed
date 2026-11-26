/* ahnboat lab 연구실 도구함 — 강의 PPT 지시서 만들기 (화면 없이 쓰는 핵심 코드)
   DeckKit.build(S)      입력(S)으로 강의 PPT 제작 지시서(md)를 만든다 → {md, slides, count, lo, hi}
   DeckKit.slides(S)     장 구성만 계산 → [{h, rows:[{n,type,title,content}]}]
   DeckKit.check(md)     다 쓴 지시서(md)를 점검 → {items:[{cls,text}], n, fill, todo}
   DeckKit.fromIdea(t)   아이디어 글에서 장 수·도구·언어·대시보드 여부 읽기
   두 예시(EX1·EX2)는 deck/examples/ 의 원본 지침서를 입력으로 옮긴 것이다.
*/
(function (root) {
  "use strict";
  var FILL = "[AI가 채움", TODO = "[확정 필요";

  /* ---------- 조사 ---------- */
  function lastCh(w) { w = String(w || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/[\s"'”’」』\]\)·.]+$/, ""); return w.slice(-1); }
  function jong(w) {
    var c = lastCh(w), k = c.charCodeAt(0);
    if (k >= 0xAC00 && k <= 0xD7A3) return (k - 0xAC00) % 28;
    if (/[0-9]/.test(c)) return "013678".indexOf(c) >= 0 ? 1 : 0;
    if (/[lmnLMN]/.test(c)) return /[lL]/.test(c) ? 8 : 1;
    return 0;
  }
  function j(w, a, b) { return w + (jong(w) ? a : b); }
  var eul = function (w) { return j(w, "을", "를"); }, eun = function (w) { return j(w, "은", "는"); },
      ga = function (w) { return j(w, "이", "가"); },
      ro = function (w) { var t = jong(w); return w + (t && t !== 8 ? "으로" : "로"); };
  function short(t) { return String(t || "").replace(/\s*\([^)]*\)\s*$/, "").trim(); }
  function cut(list) { return String(list || "").split(/\s*[,，、]\s*/).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ---------- 용어표 (한국어 → 중국어 간체·영어·일본어) ---------- */
  var TERMS = [
    ["데이터 시각화", "数据可视化", "data visualization", "データ可視化"],
    ["프롬프트", "提示词", "prompt", "プロンプト"],
    ["차트", "图表", "chart", "グラフ"],
    ["선 그래프", "折线图", "line chart", "折れ線グラフ"],
    ["막대", "柱状图", "bar chart", "棒グラフ"],
    ["히트맵", "热力图", "heatmap", "ヒートマップ"],
    ["산점도", "散点图", "scatter plot", "散布図"],
    ["파레토 차트", "帕累托图", "Pareto chart", "パレート図"],
    ["버블 지도", "气泡地图", "bubble map", "バブルマップ"],
    ["추세선", "趋势线", "trend line", "トレンドライン"],
    ["게이지", "仪表图", "gauge", "ゲージ"],
    ["대시보드", "仪表板", "dashboard", "ダッシュボード"],
    ["필터", "筛选器", "filter", "フィルター"],
    ["주석", "注释", "annotation", "注釈"],
    ["이상 거래", "异常交易", "anomalous transaction", "異常取引"],
    ["스마트시티", "智慧城市", "smart city", "スマートシティ"],
    ["물류", "物流", "logistics", "物流"],
    ["헬스케어", "健康管理", "healthcare", "ヘルスケア"],
    ["의료데이터", "医疗数据", "medical data", "医療データ"],
    ["핀테크", "金融科技", "fintech", "フィンテック"],
    ["발표자 노트", "演讲者备注", "speaker notes", "発表者ノート"],
    ["수업용 가상 데이터", "教学用虚拟数据", "synthetic data for class use", "授業用の架空データ"]
  ];
  var PROMPTS = { ko: "프롬프트모음", zh: "提示词合集", en: "prompts", ja: "プロンプト集" };
  var LANG = {
    ko: { name: "한국어", col: -1 },
    zh: { name: "중국어", col: 1 },
    en: { name: "영어", col: 2 },
    ja: { name: "일본어", col: 3 }
  };

  /* ---------- 기본값 ---------- */
  function blank() {
    return {
      idea: "", title: "", course: "", audience: "beginner", target: 40,
      message: "", goals: ["", "", ""],
      main: "Qwen (Qwen Chat)", sub: "Google AI Studio", taste: "",
      chain: "A",
      practices: [{ name: "", pfx: "", intro: "", who: "", q: "", charts: "", cols: "", filter: "", data: "" }],
      opts: { chartPick: true, privacy: false, mistakes: true, compare: false, next: false },
      nextText: "", dataPolicy: "undecided",
      langs: { ko: true, zh: false, en: false, ja: false }, zhScript: "undecided",
      deckTool: "Genspark", design: "", concepts: []
    };
  }

  var AUD = {
    beginner: "처음 배우는 사람. 코딩 경험 없음을 기준으로 한다",
    basic: "기초를 아는 학습자. 엑셀·차트는 써 봤고 코딩은 거의 안 해 봤다",
    pro: "현업 실무자. 배운 것을 자기 업무 데이터에 바로 써 보려는 사람"
  };

  /* ---------- 장 구성 ---------- */
  function slides(S) {
    var P = S.practices.filter(function (p) { return p.name || p.pfx || p.q || p.charts; });
    if (!P.length) P = [{ name: "실습 1", pfx: "실습1", charts: "" }];
    var A = S.chain !== "B", main = short(S.main) || "주 도구", sub = short(S.sub);
    var S_TOOL = sub || main, kind = A ? "차트" : "대시보드";
    var secs = [], n = 0, cur;
    function sec(h) { cur = { h: h, rows: [] }; secs.push(cur); }
    function add(type, title, content) { cur.rows.push({ n: ++n, type: type, title: title, content: content }); }
    var virt = S.dataPolicy !== "public";
    function nm(p, i) { return p.name || "실습 " + (i + 1); }
    function px(p, i) { return p.pfx || (p.name ? p.name.split(/\s+/)[0] : "실습" + (i + 1)); }

    sec("여는 부분");
    add("표지", S.title || "[확정 필요: 덱 제목]", "과목, 주차, 강의자");
    add("목표", "오늘 끝나면 이 세 가지를 할 수 있다", "학습 목표 3개");
    add("완성 예시", "오늘 만들 " + kind + "는 이것이다", P.map(nm).join("·") + " 완성 화면 미리 보기");
    if (A) {
      P.forEach(function (p, i) {
        add("개념", p.intro || "[AI가 채움: " + eul(nm(p, i)) + " 한 문장으로 정의하는 제목]", "한 문장 정의, 그림 1개, 일상 비유 1개");
      });
      add("개념", "모든 데이터는 \"언제·어디서·얼마나\"로 읽는다", "세 축 그림");
    } else {
      add("개념", "대시보드는 여러 차트를 한 화면에 모은 판이다", "자동차 계기판 비유");
    }

    if (S.opts.chartPick) {
      sec("차트 고르기");
      add("개념", "질문이 차트를 정한다", "질문 → 차트 짝 표");
      add("개념", "시간의 변화는 선, 크기 비교는 막대다", "두 차트 나란히");
      add("개념", "두 가지가 겹치면 히트맵을 쓴다", "요일×시간 예시");
      add("퀴즈", "이 질문에는 어떤 차트가 맞을까", "3문항, 답은 발표자 노트");
    }

    sec("도구 준비");
    if (A) {
      add("따라하기", main + "에 접속하고 로그인한다", "화면 캡처 ①②③");
      add("따라하기", "파일을 올리고 글을 입력하는 곳은 여기다", "입력창 캡처");
      add("개념", "프롬프트는 네 가지를 넣어 쓴다", "역할·데이터·요청·조건");
      add("개념", "한 번에 끝내지 않고 다섯 번 이어 묻는다", "사슬 5단계 그림, \"화면이 달라도 정상\"");
      if (S.opts.privacy) add("주의", "진짜 개인 정보는 올리지 않는다", "개인정보 규칙 3줄");
    } else {
      if (sub) add("개념", "쉬운 일은 " + main + ", 어려운 일은 " + ga(sub) + " 맡는다", "도구 나누기 표를 줄여서");
      add("따라하기", S_TOOL + "에 접속하고 로그인한다", "화면 캡처 ①②③");
      add("따라하기", "만들기 화면은 이렇게 생겼다", "입력창·미리 보기 자리 표시");
      add("개념", "다섯 번 이어 물어서 완성한다", "사슬 5단계 그림 (Q1·Q2·S1·S2·S3)");
      if (S.opts.privacy) add("주의", "진짜 개인 정보는 올리지 않는다", "개인정보 규칙 3줄");
      add("안내", "내 화면이 달라도 정상이다", "달라지는 이유, 막혔을 때 문장");
    }

    P.forEach(function (p, i) {
      var name = nm(p, i), pf = px(p, i), ch = cut(p.charts), c1 = ch[0] || "[AI가 채움: 첫 차트]";
      sec((A ? "실습 " + String.fromCharCode(65 + i) : "실습 " + (i + 1)) + " — " + name);
      var dataT = p.data ? (A ? "실습 " + String.fromCharCode(65 + i) + " 데이터는 " : "데이터는 ") + j(p.data, "이다", "다") : name + " 데이터를 살펴본다";
      var dataC = A ? "출처, 기간, 열 풀이 표" : "열 풀이 표";
      if (virt) dataC += ", \"수업용 가상 데이터\" 표기";
      if (A) {
        add("데이터", dataT, dataC);
        add("프롬프트", pf + "-P1: 이 표에 무엇이 있는지 묻는다", "프롬프트 원문");
        add("결과", "AI가 열과 기간을 설명해 준다", "결과 캡처, 볼 곳 표시");
        add("프롬프트", p.q ? pf + "-P2: " + eul("\"" + p.q + "\"") + " 질문으로 정한다" : pf + "-P2: 보여줄 질문 하나를 고른다", "프롬프트와 AI가 고른 질문(결과)");
        add("프롬프트", pf + "-P3: " + eul(c1) + " 만든다", "프롬프트 원문");
        add("결과", "첫 차트가 나왔다", "결과 캡처");
        add("프롬프트", pf + "-P4-1: 제목과 단위를 고친다", "프롬프트와 결과");
        add("프롬프트", ch[1] ? pf + "-P4-2: " + ro(ch[1]) + " 바꾸고 주석을 단다" : pf + "-P4-2: 가장 중요한 값에 주석을 단다", "프롬프트 원문");
        add("전/후", "다듬기 전과 후는 이렇게 다르다", "좌우 비교, 바뀐 점 3가지");
        add("프롬프트", pf + "-P5: 세 문장으로 해석한다", "프롬프트와 해석 예시");
        add("확인", "여기까지 됐나요?", "완성 화면, 확인 항목 3개, 막혔을 때 문장");
      } else {
        add("산업 소개", p.intro || name + ": 누가 무엇을 보고 싶은가", "보는 사람(" + (p.who || "[AI가 채움]") + "), 알고 싶은 것 한 문장, 일상 예시 1개");
        add("데이터", dataT, dataC);
        add("프롬프트", pf + "-Q1·Q2: " + ro(main) + " " + eul(c1) + " 하나 만든다", "프롬프트 2개와 결과");
        if (sub) add("전환", "차트 세 개를 모으려면 " + ro(sub) + " 간다", "옮기는 이유 한 줄");
        add("프롬프트", pf + "-S1: 대시보드 뼈대를 만든다", "프롬프트 원문 (차트: " + (ch.length >= 3 ? ch.slice(0, 3).join(" / ") : "[AI가 채움: 차트 3개]") + ")");
        add("결과", "차트 세 개가 한 화면에 나왔다", "결과 캡처, 볼 곳 표시");
        add("프롬프트", pf + "-S2: " + (p.filter || "[AI가 채움]") + " 필터를 단다", "프롬프트와 결과");
        add("프롬프트", pf + "-S3: 제목·색·주석을 다듬는다", "프롬프트, 전/후 비교");
        add("확인", "여기까지 됐나요?", "완성 화면, 확인 3개, 해석 세 문장");
      }
    });

    sec("마무리");
    if (S.opts.compare && P.length > 1) add("비교", "실습이 달라도 묻는 순서는 같았다", P.length + "개 실습 × 5단계 표, 실수 3가지");
    if (S.opts.mistakes) add("실수", "이렇게 물으면 이렇게 틀린다", "흔한 실수 3가지와 고친 프롬프트");
    if (A && sub && S.taste) add("맛보기", eun(short(S.taste)) + " " + ro(sub) + " 만든다", "완성 화면, 프롬프트 1개");
    add("과제", A ? "다른 질문으로 차트 하나를 더 만든다" : "내가 고른 주제로 대시보드를 만든다", "할 일, 제출물, 시간");
    add("정리", "오늘 배운 것은 세 줄이다", "3줄 요약");
    if (S.opts.next) add("다음", S.nextText ? "다음 시간에는 " + eul(S.nextText) + " 배운다" : "[확정 필요: 다음 시간 예고]", "예고 한 줄");
    return secs;
  }

  /* ---------- 지시서 md ---------- */
  function table(head, rows) {
    return "| " + head.join(" | ") + " |\n|" + head.map(function () { return "---"; }).join("|") + "|\n" +
      rows.map(function (r) { return "| " + r.join(" | ") + " |"; }).join("\n");
  }

  function build(S, stamp) {
    var A = S.chain !== "B", main = short(S.main) || "주 도구", sub = short(S.sub);
    var P = S.practices.filter(function (p) { return p.name || p.pfx || p.q || p.charts; });
    var secs = slides(S), count = 0;
    secs.forEach(function (s) { count += s.rows.length; });
    var tgt = +S.target || 40, lo = Math.max(1, tgt - 2), hi = tgt + 2;
    var langs = Object.keys(LANG).filter(function (k) { return S.langs[k]; });
    if (langs.indexOf("ko") < 0) langs.unshift("ko");
    var multi = langs.length > 1, tool = S.deckTool || "Genspark";
    var kind = A ? "차트" : "대시보드", title = S.title || "[확정 필요: 덱 제목]";
    var virt = S.dataPolicy !== "public";
    var o = [], h = 0;
    function H(t) { h++; o.push("", "---", "", "## " + h + ". " + t, ""); }
    var pfxs = P.map(function (p, i) { return p.pfx || (p.name ? p.name.split(/\s+/)[0] : "실습" + (i + 1)); });

    o.push("# 강의 PPT 제작 지침서 — " + title, "",
      "> 이 문서는 강의 슬라이드(PPT)를 만드는 사람 또는 AI에게 주는 작업 지침이다.",
      "> 이 문서 하나만 보고 덱 한 벌을 만들 수 있게 쓴다.",
      "> `[확정 필요]`는 저자가 값을 채워야 하는 자리, `[AI가 채움]`은 AI가 초안을 채울 자리다.");

    /* 0. 한눈에 */
    o.push("", "---", "", "## 0. 덱 한눈에 보기", "");
    var ov = [
      ["덱 제목", title],
      ["분량", "**" + tgt + "장 내외 (" + lo + "~" + hi + "장)** — 지금 구성 " + count + "장"],
      ["대상", AUD[S.audience] || AUD.beginner],
      ["방식", "프롬프트를 여러 번 이어 입력해 " + eul(kind) + " 완성하는 따라하기 실습"],
      ["실습", P.map(function (p, i) { return p.name || "실습 " + (i + 1); }).join(" · ") || "[확정 필요]"],
      ["주 도구", S.main || "[확정 필요]"]
    ];
    if (sub) ov.push(["보조 도구", S.sub + (A ? " — " + (S.taste ? short(S.taste) + "처럼 " : "") + ro(main) + " 어려운 작업 1회만" : " — 어려운 작업(여러 차트가 함께 움직이는 대시보드)")]);
    ov.push(["과목·주차", S.course || "`[확정 필요]`"], ["덱 제작 도구", "**" + tool + "** (AI 슬라이드 기능)"]);
    ov.push(["언어판", multi ? "**" + langs.map(function (k) { return LANG[k].name + "판"; }).join(" + ") + "**, 각각 별도 폴더에 PPT로 저장" : "한국어판 1벌"]);
    o.push(table(["항목", "내용"], ov), "");
    o.push("핵심 메시지: **\"" + (S.message || (A ? "좋은 차트는 한 번의 프롬프트가 아니라, 이어 묻는 프롬프트에서 나온다." : "쉬운 일은 " + ro(main) + ", 어려운 일은 " + ro(sub || main) + ". 실습이 달라도 묻는 순서는 같다.")) + "\"**", "");
    o.push("학습 목표 (슬라이드에는 이 3개만 싣는다)");
    var G = S.goals.map(function (g) { return g.trim(); });
    for (var gi = 0; gi < 3; gi++) o.push((gi + 1) + ". " + (G[gi] || "[AI가 채움: 학습 목표 " + (gi + 1) + " — '~한다'로 끝나는 한 문장]"));

    /* 1. 작성 원칙 */
    H((S.audience === "beginner" ? "초보자를 위한 " : "") + "작성 원칙 (가장 중요)");
    var R = [
      "**한 장에 한 동작.** \"파일 올리기\"와 \"프롬프트 입력\"을 한 장에 넣지 않는다.",
      "**새 용어는 나온 그 장에서 바로 풀이한다.** 괄호 한 줄로 쓴다.\n   예: " + (A ? "히트맵(숫자가 클수록 진한 색으로 칠한 표)" : "대시보드(여러 차트를 한 화면에 모은 판), 필터(보고 싶은 것만 골라 보는 단추)"),
      "**영어 약어는 처음 한 번 풀어 쓴다.** 예: CSV(쉼표로 값을 나눈 표 파일)",
      "**프롬프트는 복사해서 그대로 쓸 수 있는 원문으로 싣는다.** 고쳐 써야 하는 부분만 색으로 표시한다.",
      "**프롬프트 장에는 결과 화면을 함께 싣거나, 바로 다음 장에 결과 장을 둔다.**",
      "**따라하기 장에는 클릭 순서를 번호 원형(①②③)으로 표시한다.** 한 장에 3단계까지.",
      "**\"내 화면이 달라요\" 안내를 넣는다.** AI 결과는 매번 조금씩 다르다. 달라도 정상이라고 실습 첫 장에 적는다.",
      "**막혔을 때 쓸 문장을 준다.** 예: \"오류가 났어. 원인을 쉬운 말로 설명하고 고쳐줘.\"",
      S.audience === "beginner" ? "**본문은 5줄 이내, 한 줄 25자 이내.** 넘으면 장을 나눈다." : "**본문은 6줄 이내.** 넘으면 장을 나눈다.",
      S.audience === "beginner" ? "**수식·코드는 본문에 싣지 않는다.** 코드는 AI가 만들고, 학생은 결과만 본다." : "**코드는 본문에 싣지 않는다.** 꼭 보여 줄 줄만 발표자 노트나 부록에 싣는다.",
      "**실습마다 \"여기까지 됐나요?\" 확인 장을 둔다.** 완성 화면과 확인 항목 3개."
    ];
    if (P.length > 1) R.push("**실습은 똑같은 순서와 똑같은 장 배치로 만든다.** 두 번째 실습부터는 학생이 순서를 예상할 수 있어야 한다.");
    if (S.audience === "pro") R.push("**장마다 업무 예시를 하나 붙인다.** \"내 일에서는 어디에 쓰나\"에 답한다.");
    R.forEach(function (r, i) { o.push((i + 1) + ". " + r); });

    /* 2. 도구 나누기 */
    if (sub) {
      H("도구 나누기 규칙");
      var TR = A ? [
        ["표 설명 듣기, 질문 정하기", main, "묻고 답하기만 하면 된다"],
        ["차트 1개 만들기와 다듬기", main, "한 화면에 그림 하나면 충분하다"],
        [S.taste ? short(S.taste) : "지도처럼 만들 것이 많은 작업", sub, "만들 것이 많고 복잡하다"],
        [main + "에서 같은 오류가 두 번 날 때", sub, "도구를 바꾸는 편이 빠르다"]
      ] : [
        ["표 설명 듣기, 질문 정하기", main, "묻고 답하기만 하면 된다"],
        ["차트 1개 만들기", main, "한 화면에 그림 하나면 충분하다"],
        ["차트 3개 이상이 함께 움직이는 대시보드", sub, "여러 부품을 한꺼번에 맞춰야 한다"],
        ["필터를 누르면 전체가 바뀌는 화면", sub, "차트끼리 연결해야 한다"],
        [main + "에서 같은 오류가 두 번 날 때", sub, "도구를 바꾸는 편이 빠르다"]
      ];
      o.push(table(["이런 작업은", "이 도구로", "이유(쉬운 말)"], TR), "",
        "도구 화면 설명 장 규칙",
        "- 메뉴 이름과 단추 위치는 자주 바뀐다. **덱을 만들기 직전에 실제 화면을 열어 캡처한다.**",
        "- 요금·한도·모델 이름은 본문에 고정해 쓰지 않고 \"수업일 기준\"이라고 적는다.");
    }

    /* 3. 프롬프트 사슬 */
    H("프롬프트 사슬 (실습 공통 5단계)");
    if (A) {
      o.push(table(["단계", "이름", "학생이 하는 일", "쉬운 말 설명"], [
        ["P1", "데이터 알아보기", "파일을 올리고 설명을 부탁한다", "\"이 표에 뭐가 들어 있어?\""],
        ["P2", "질문 정하기", "보여줄 것 한 가지를 고른다", "\"이걸로 뭘 알 수 있어?\""],
        ["P3", "첫 차트", "차트 하나를 만든다", "\"그걸 그림으로 그려줘\""],
        ["P4", "다듬기", "제목·색·주석을 고친다 (2회)", "\"더 보기 좋게 고쳐줘\""],
        ["P5", "해석하기", "세 문장으로 설명한다", "\"이 그림이 뭘 말해?\""]]));
    } else {
      var st = sub || main;
      o.push(table(["단계", "도구", "학생이 하는 일", "쉬운 말 설명"], [
        ["Q1", main, "파일을 올리고 설명을 부탁한다", "\"이 표에 뭐가 들어 있어?\""],
        ["Q2", main, "차트 1개를 만들어 본다", "\"먼저 하나만 그려줘\""],
        ["S1", st, "대시보드 뼈대를 만든다", "\"차트 세 개를 한 화면에 모아줘\""],
        ["S2", st, "필터를 달아 차트를 연결한다", "\"고르면 다 같이 바뀌게 해줘\""],
        ["S3", st, "제목·색·주석을 다듬는다", "\"더 보기 좋게 고쳐줘\""]]));
    }
    var vmark = virt ? ", \"수업용 가상 데이터\" 표기" : ", 출처와 기간 표기";
    o.push("", "프롬프트 틀 (모든 프롬프트 장에 같은 순서로 쓴다)", "", "```",
      "[역할] 너는 ○○ 데이터 분석가야.",
      "[데이터] 올린 파일은 ○○이고, 열은 A, B, C야.",
      A ? "[요청] ○○을 보여주는 ○○ 차트를 HTML 한 파일로 만들어줘." : "[요청] ○○을 보여주는 대시보드를 만들어줘. 차트는 ○○, ○○, ○○ 세 개야.",
      "[조건] 제목은 한국어, 단위 표시, 색은 3가지 이내" + vmark + ".", "```", "");
    var ex = A ? "`" + pfxs[0] + "-P3`" + (pfxs[1] ? ", `" + pfxs[1] + "-P4-2`" : ", `" + pfxs[0] + "-P4-2`") + " (실습-단계-순번)"
               : "`" + pfxs[0] + "-Q1`" + (pfxs[1] ? ", `" + pfxs[1] + "-S2`" : "") + (pfxs[2] ? ", `" + pfxs[2] + "-S3`" : "") + " (실습-단계)";
    o.push("프롬프트 번호 규칙: " + ex);

    /* 4. 실습 설계 */
    H("실습 설계와 데이터");
    if (A) {
      var rows = P.map(function (p, i) {
        return ["실습 " + String.fromCharCode(65 + i) + " (" + (p.name || "[확정 필요]") + ")", p.q || "[AI가 채움]", (cut(p.charts).join(" → ") || "[AI가 채움]"), short(S.main) || "[확정 필요]", p.cols || "[AI가 채움]"];
      });
      if (sub && S.taste) rows.push(["맛보기", "[AI가 채움]", short(S.taste), sub, "[AI가 채움]"]);
      o.push(table(["실습", "질문", "차트", "도구", "데이터 열(예시)"], rows));
    } else {
      o.push(table(["실습", "누가 보는가", "질문", "데이터 열(예시)", "대시보드 차트 3개", "필터"], P.map(function (p, i) {
        var ch = cut(p.charts);
        return [p.name || "실습 " + (i + 1), p.who || "[AI가 채움]", p.q || "[AI가 채움]", p.cols || "[AI가 채움]", ch.length ? ch.join(" / ") : "[AI가 채움]", p.filter || "[AI가 채움]"];
      })));
    }
    o.push("", "데이터 규칙");
    if (S.dataPolicy === "virtual") o.push("- 수업용 가상 데이터를 만들어 쓴다. 화면과 슬라이드에 \"수업용 가상 데이터\"라고 적는다.");
    else if (S.dataPolicy === "public") o.push("- 공공 개방 데이터를 쓴다. 출처와 기간을 슬라이드와 차트에 적는다. `[확정 필요: 실습별 데이터셋 이름과 주소]`");
    else o.push("- 공공 개방 데이터 또는 수업용 가상 데이터만 쓴다. `[확정 필요: 가상 데이터를 만들지, 공공 통계를 쓸지]`", "- 가상 데이터는 화면과 슬라이드에 \"수업용 가상 데이터\"라고 적는다.");
    o.push("- 실습 하나에 CSV 1개, 열 8개 이내, 1,000행 안팎으로 줄여서 나눠 준다.", "- 열 이름은 한국어로 바꿔 둔다" + (P[0] && P[0].cols ? " (예: " + cut(P[0].cols).slice(0, 3).map(function (c) { return "`" + c + "`"; }).join(", ") + ")" : "") + ".");
    if (S.opts.privacy) {
      o.push("", "개인정보 규칙 (필수 장으로 넣는다)",
        "- **실제 사람의 의료 기록·거래 내역·위치 기록은 절대 쓰지 않는다.** 수업용 가상 데이터 또는 공공 통계만 쓴다.",
        "- 이름·주민번호·계좌번호·전화번호 열은 데이터에 넣지 않는다.",
        "- 학생에게 \"내 진료 기록, 내 카드 내역을 올리지 마세요\"라고 슬라이드에 적는다.",
        "- " + kind + " 화면에 \"수업용 가상 데이터\"라고 표기한다.");
    }

    /* 5. 장 구성 */
    H("슬라이드 구성 (" + count + "장)");
    var used = {};
    secs.forEach(function (s, si) {
      if (!s.rows.length) return;
      var a = s.rows[0].n, b = s.rows[s.rows.length - 1].n;
      o.push("### " + h + "." + (si + 1) + " " + s.h + " (" + (a === b ? a : a + "~" + b) + ")");
      o.push(table(["번호", "유형", "제목(문장으로)", "내용"], s.rows.map(function (r) { used[r.type] = 1; return [r.n, r.type, r.title, r.content]; })), "");
    });
    if (count < lo) o.push("> 장 수가 목표(" + lo + "~" + hi + "장)보다 적다. 실습을 하나 더하거나 \"차트 고르기\"·\"흔한 실수\" 장을 넣는다.");
    if (count > hi) o.push("> 장 수가 목표(" + lo + "~" + hi + "장)보다 많다. 실습 묶음 하나를 빼거나 덱을 두 차시로 나눈다.");
    o.push(A ? "실습을 하나 더 넣을 때: 실습 묶음(11장)을 하나 더 만들고, 덱을 두 차시로 나눈다." : "실습을 하나 더 넣을 때: 실습 묶음(" + (sub ? 9 : 8) + "장)을 하나 더 만들고, 덱을 두 차시로 나눈다.");

    /* 6. 유형별 필수 요소 */
    H("슬라이드 유형별 필수 요소");
    var NEED = {
      "개념": "한 문장 정의, 그림 1개, 일상 비유 1개",
      "산업 소개": "보는 사람, 알고 싶은 것 한 문장, 일상 예시 1개",
      "데이터": "출처, 기간, 열 풀이(열 이름·뜻·단위)" + (virt ? ", \"수업용 가상 데이터\" 표기" : ""),
      "따라하기": "화면 캡처, 번호 원형 3개 이내",
      "프롬프트": "번호, 도구 칩, 원문 상자(고정폭 글꼴), 고쳐 쓸 부분 색 표시",
      "전환": main + " 결과 → " + ro(sub || main) + " 가는 화살표, 이유 한 줄",
      "결과": "화면 캡처, \"여기를 보세요\" 표시 1~2곳",
      "전/후": "좌우 비교, 바뀐 점 3가지",
      "확인": "완성 화면, 확인 항목 3개, 막혔을 때 쓸 문장",
      "실수": "틀린 결과, 원인 한 줄, 고친 프롬프트",
      "퀴즈": "문항 3개, 답과 풀이는 발표자 노트",
      "주의": "하지 말 것 3줄, 왜 위험한지 한 줄",
      "맛보기": "완성 화면, 프롬프트 1개, \"오늘은 보기만\" 안내"
    };
    o.push(table(["유형", "필수 요소"], Object.keys(NEED).filter(function (k) { return used[k]; }).map(function (k) { return [k, NEED[k]]; })), "",
      "발표자 노트: 모든 장에 말할 내용 2~4문장과 예상 질문 1개를 쓴다.", "",
      "디자인: " + (S.design ? S.design : "`[확정 필요: 기존 강의 덱 스타일 사용 여부]`") + ". 도구 칩 색은 " + (sub ? j(main, "과", "와") + " " + eul(sub) + " 서로 다른 색으로" : main + " 한 가지 색으로") + " 고정" + (P.length > 1 ? "하고, 실습마다 구분 색을 하나씩 정한다." : "한다."));

    /* 7. 좋은 차트 기준 */
    H("좋은 " + kind + " 기준 (예시 화면과 학생 결과물 공통)");
    (A ? [
      "제목이 질문에 답한다 (예: \"금요일 저녁 6시가 가장 붐빈다\").",
      "축 이름과 단위가 있다.", "색은 3가지 이내, 강조할 곳만 진하게.",
      "가장 중요한 값 한 곳에 주석이 있다.", virt ? "\"수업용 가상 데이터\" 표기와 기간이 있다." : "출처와 기간이 있다."
    ] : [
      "맨 위 제목이 질문에 답한다 (예: \"월요일 오전, 내과가 가장 붐빈다\").",
      "차트는 3개, 가장 중요한 차트가 가장 크다.", "모든 차트에 축 이름과 단위가 있다.",
      "색은 3가지 이내, 강조할 곳만 진하게.", "필터는 1개, 눌렀을 때 세 차트가 함께 바뀐다.",
      virt ? "\"수업용 가상 데이터\" 표기와 기간이 있다." : "출처와 기간이 있다."
    ]).concat(["해석은 세 문장: 무엇이 보이는가 → 왜 그럴까(추측임을 밝힘) → 무엇을 하면 좋을까."]).forEach(function (b) { o.push("- " + b); });

    /* 8. 언어판과 제작 도구 */
    H((multi ? "언어판과 " : "") + "제작 도구 (" + tool + ")");
    var base = (S.title || "강의덱").replace(/[\\/:*?"<>|·]+/g, " ").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    var dir = "강의지시서_" + base;
    o.push("### 가. 만드는 것");
    o.push(multi ? "같은 내용의 덱을 **" + langs.map(function (k) { return LANG[k].name + "판"; }).join("과 ") + "**으로 만든다. 판마다 서로 다른 폴더에 따로 저장한다. 한 파일에 두 언어를 섞지 않는다."
                 : "한국어판 덱 한 벌을 만든다. 덱과 함께 나눠 줄 프롬프트 모음과 실습 CSV를 같은 폴더에 둔다.", "");
    o.push("### 나. 폴더 구조", "", "```", dir + "/");
    langs.forEach(function (k, i) {
      var last = i === langs.length - 1, b = last ? "└─ " : "├─ ", v = last ? "   " : "│  ";
      o.push(b + k + "/" + "                                  ← ".slice(k.length) + LANG[k].name + "판");
      o.push(v + "├─ " + (k === "ko" ? base : "(덱 제목을 " + LANG[k].name + "로)") + "_" + k + ".pptx");
      o.push(v + "├─ " + PROMPTS[k] + "_" + k + ".txt");
      o.push(v + "├─ data/      (실습 CSV, 열 이름 " + LANG[k].name + ")");
      o.push(v + "└─ captures/  (" + LANG[k].name + " 프롬프트로 얻은 결과 화면)");
    });
    o.push("```", "");
    o.push("### 다. " + tool + " 제작 순서");
    var step = 1;
    o.push((step++) + ". **한국어판을 먼저 만든다.** " + tool + "에 이 지침서 전체를 붙이고 아래 \"한국어판 요청문\"을 입력한다.",
      (step++) + ". " + count + "장 구성표(" + 5 + "절)와 장 번호·제목이 맞는지" + (P.length > 1 ? ", 실습 묶음의 장 배치가 같은지" : "") + " 확인하고, 틀린 장은 장 번호를 지정해 고친다.",
      (step++) + ". PPT 파일(.pptx)로 내려받아 `ko/` 폴더에 넣는다.");
    langs.slice(1).forEach(function (k) {
      o.push((step++) + ". **" + LANG[k].name + "판은 새 작업으로 따로 만든다.** 확정된 한국어판과 이 지침서를 함께 주고 \"" + LANG[k].name + "판 요청문\"을 입력한다.",
        (step++) + ". PPT 파일로 내려받아 `" + k + "/` 폴더에 넣는다.");
    });
    o.push((step++) + ". " + (multi ? "모든 파일을" : "파일을") + " PowerPoint에서 열어 글자 깨짐, 줄 넘침, 장 수를 확인한다.", "",
      "※ " + tool + "의 메뉴 이름과 내려받기 방식은 바뀔 수 있다. 제작 당일 화면을 기준으로 한다.", "");
    o.push("한국어판 요청문", "", "```", "첨부한 지침서를 그대로 따라 강의 슬라이드를 만들어줘.", "- 언어: 한국어",
      "- 장 수: " + count + "장 (지침서 5절의 번호·유형·제목을 그대로 사용)",
      "- 대상: " + (AUD[S.audience] || AUD.beginner).split(".")[0] + ". 지침서 1절의 작성 원칙을 모두 지켜.");
    if (P.length > 1) o.push("- " + P.map(function (p, i) { return p.name || "실습 " + (i + 1); }).join("·") + " 묶음은 똑같은 배치로 만들어.");
    o.push("- 프롬프트 장: 원문을 고정폭 글꼴 상자에 넣어.", "- 화면 캡처 자리는 \"캡처 넣을 곳\" 상자로 비워 둬.", "- 모든 장에 발표자 노트를 써.", "- 편집 가능한 PPT 파일(.pptx)로 내보낼 수 있게 만들어.", "```");
    langs.slice(1).forEach(function (k) {
      var L = LANG[k].name, scr = k === "zh" ? (S.zhScript === "trad" ? "중국어 번체" : "중국어 간체") : L;
      o.push("", L + "판 요청문", "", "```", "첨부한 한국어 슬라이드와 지침서를 바탕으로 " + L + "판을 새로 만들어줘.",
        "- 언어: " + scr + ". 한국어 글자를 한 글자도 남기지 마.",
        "- 장 수, 장 번호, 장 순서, 배치는 한국어판과 똑같이 해.",
        "- 직역하지 말고 " + L + "권 초보자가 읽기 쉬운 문장으로 써.",
        "- 프롬프트 원문도 " + L + "로 바꿔. [역할][데이터][요청][조건] 틀은 유지해.",
        "- 데이터 열 이름과 " + kind + " 제목·단위" + (A ? "" : "·필터 이름") + "도 " + L + "로 바꿔.",
        "- 발표자 노트도 " + L + "로 써.", "- 편집 가능한 PPT 파일(.pptx)로 내보낼 수 있게 만들어.", "```");
    });
    if (multi) {
      o.push("", "### 라. 외국어판 규칙");
      if (S.langs.zh) o.push("- 중국어 글자: " + (S.zhScript === "simp" ? "간체." : S.zhScript === "trad" ? "번체." : "간체를 기본으로 한다. `[확정 필요: 간체/번체]`"));
      o.push("- **프롬프트는 번역만 하지 말고 그 언어로 " + (sub ? j(main, "과", "와") + " " + sub : main) + "에 실제로 입력해 결과를 다시 확인한다.** 결과 화면 캡처도 그 언어 결과로 새로 찍는다.",
        "- 실습 CSV의 열 이름을 그 언어로 바꾼 파일을 따로 만든다.",
        "- 프롬프트 번호의 실습 이름(" + pfxs.map(function (x) { return "`" + x + "`"; }).join("·") + ")도 그 언어로 바꾼다.",
        "- 용어는 아래 표로 통일한다. 표에 없는 용어는 추가한 뒤 쓴다.", "");
      var others = langs.slice(1), body = null;
      var mdSoFar = o.join("\n") + secs.map(function (s) { return s.rows.map(function (r) { return r.title + r.content; }).join(""); }).join("");
      var tr = TERMS.filter(function (t) { return mdSoFar.indexOf(t[0]) >= 0 || P.some(function (p) { return (p.name + p.charts).indexOf(t[0]) >= 0; }); });
      body = tr.map(function (t) { return [t[0]].concat(others.map(function (k) { return t[LANG[k].col]; })); });
      P.forEach(function (p) {
        if (p.name && !TERMS.some(function (t) { return p.name === t[0]; })) body.push([p.name].concat(others.map(function () { return "[AI가 채움]"; })));
      });
      o.push(table(["한국어"].concat(others.map(function (k) { return LANG[k].name; })), body), "",
        "- 글꼴: 판마다 그 언어를 지원하는 글꼴을 쓴다. 외국어판에 한국어 글꼴을 쓰면 글자가 깨진다.",
        "- 같은 뜻이라도 언어마다 글자 수가 다르다. 빈자리가 크면 글자 크기를 키우고, 내용을 더 넣지 않는다.");
      if (S.opts.privacy) o.push("- 개인정보 주의 장은 외국어판에서도 빠뜨리지 않는다.");
      o.push("- **도구 접속 확인이 먼저다.** " + eun([S.main, S.sub].filter(Boolean).map(short).join("·")) + " 지역에 따라 접속이 안 될 수 있다. 수강생이 있는 곳에서 접속되는지 확인하고, 안 되면 대체 도구를 정한 뒤 도구 준비 장을 그 도구로 바꾼다. `[확정 필요: 외국어판 수강 대상과 수업 장소]`");
    }

    /* 참고 개념 */
    if (S.concepts && S.concepts.length) {
      H("참고: 연구실 개념 지도에서 찾은 용어 (용어 풀이 근거)");
      o.push("용어 풀이 장과 괄호 풀이를 쓸 때 아래 정의와 어긋나지 않게 쓴다. 정의는 쉬운 말로 줄여도 된다.", "");
      S.concepts.forEach(function (c) { o.push("- **" + c.name + "** (" + c.type + ") — " + c.def + " · " + c.url); });
    }

    /* 점검표 */
    H("완성 전 점검표");
    var CK = [];
    if (multi) CK.push("판마다 " + langs.map(function (k) { return "`" + k + "/`"; }).join("·") + " 폴더에 PPT 파일로 따로 있다.", "모든 판의 장 수와 장 번호가 같다.", "외국어판에 한국어 글자가 남아 있지 않다 (본문·차트·캡처·노트).", "외국어 프롬프트를 실제로 입력해 결과를 확인했다.");
    CK.push("장 수가 " + lo + "~" + hi + "장이다.", "모든 프롬프트를 실제로 입력해 결과를 확인했다 (수업 1주일 이내).", "화면 캡처가 지금 도구 화면과 같다.");
    if (P.length > 1) CK.push("실습 묶음의 장 배치가 서로 같다.");
    CK.push("새 용어마다 괄호 풀이가 있다.", "프롬프트 장마다 결과 화면이 함께 있거나 다음 장에 있다.", "실습마다 \"여기까지 됐나요?\" 장이 있다.");
    if (S.opts.privacy) CK.push("개인정보 주의 장이 있다.");
    CK.push("본문이 " + (S.audience === "beginner" ? 5 : 6) + "줄을 넘는 장이 없다.", "모든 장에 발표자 노트가 있다.", "실습 CSV와 프롬프트 모음(txt)을 덱과 함께 나눠 준다.", "`[AI가 채움]`과 `[확정 필요]`가 하나도 남아 있지 않다.");
    CK.forEach(function (c) { o.push("- [ ] " + c); });

    /* 처음 아이디어 */
    if (S.idea && S.idea.trim()) {
      H("부록: 처음 아이디어 (지시서를 만든 출발점)");
      S.idea.trim().split("\n").forEach(function (l) { o.push("> " + l); });
    }

    /* 확정 필요 항목 — 위에서 쓴 자리를 모은다 */
    var text = o.join("\n"), seen = {}, todo = [];
    var re = /\[확정 필요(?::\s*([^\]]+))?\]/g, m;
    while ((m = re.exec(text))) { var k2 = (m[1] || "").trim(); if (k2 && !seen[k2]) { seen[k2] = 1; todo.push(k2); } }
    if (!S.course) todo.unshift("과목·주차, 수업 시간");
    todo.push("과제 제출 형식과 평가 기준");
    H("확정 필요 항목");
    todo.forEach(function (t, i) { o.push((i + 1) + ". " + t); });
    o.push("", "---", "", "> " + (stamp || "만든 도구: ahnboat lab 강의 PPT 지시서 만들기"));
    var md = o.join("\n") + "\n";
    return { md: md, slides: secs, count: count, lo: lo, hi: hi, fill: (md.match(/\[AI가 채움/g) || []).length, todo: (md.match(/\[확정 필요/g) || []).length };
  }

  /* ---------- 지시서 점검 ---------- */
  function check(md) {
    var items = [], rows = [];
    md.split("\n").forEach(function (l) {
      var m = l.match(/^\s*\|\s*(\d{1,3})\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/);
      if (m) rows.push({ n: +m[1], type: m[2].trim(), title: m[3].trim(), content: m[4].trim() });
    });
    function add(cls, t) { items.push({ cls: cls, text: t }); }
    if (!rows.length) { add("bad", "장 구성표를 찾지 못했습니다. '| 번호 | 유형 | 제목 | 내용 |' 모양의 표가 있어야 점검할 수 있어요."); return { items: items, n: 0 }; }
    var n = rows.length;
    var range = md.match(/(\d{2,3})\s*~\s*(\d{2,3})\s*장/);
    if (range) {
      var lo = +range[1], hi = +range[2];
      add(n >= lo && n <= hi ? "ok" : "bad", "장 수 " + n + "장 — 목표 " + lo + "~" + hi + "장" + (n >= lo && n <= hi ? " 안에 있어요." : " 밖이에요."));
    } else add("mid", "장 수 " + n + "장 — 목표 범위(예: 38~42장)가 적혀 있지 않아요.");
    var gap = [], dup = [];
    rows.forEach(function (r, i) { if (r.n !== i + 1) gap.push(r.n); });
    var cnt = {}; rows.forEach(function (r) { cnt[r.n] = (cnt[r.n] || 0) + 1; if (cnt[r.n] === 2) dup.push(r.n); });
    add(gap.length || dup.length ? "bad" : "ok", gap.length || dup.length ? "장 번호가 이어지지 않아요" + (dup.length ? " (겹친 번호 " + dup.join(", ") + ")" : "") + " — " + gap.slice(0, 5).join(", ") + "번 근처를 보세요." : "장 번호가 1번부터 빠짐없이 이어져요.");
    var noRes = [];
    rows.forEach(function (r, i) {
      if (r.type !== "프롬프트") return;
      var nx = rows[i + 1];
      var withRes = /결과|예시|해석|고른|전\/후|비교/.test(r.content);
      if (!withRes && !(nx && /결과|전\/후|확인/.test(nx.type))) noRes.push(r.n + "번(" + r.title.split(":")[0] + ")");
    });
    add(noRes.length ? "mid" : "ok", noRes.length ? "결과 화면이 없는 프롬프트 장 " + noRes.length + "개: " + noRes.join(", ") + ". 내용에 결과를 함께 싣거나 다음 장에 결과 장을 두세요." : "프롬프트 장마다 결과가 함께 있거나 바로 다음 장에 있어요.");
    // 실습 묶음: 프롬프트 번호의 접두어(도시-P1, 헬스-Q1 …)로 나눈다
    var blocks = [], curB = null;
    rows.forEach(function (r) {
      var m = r.title.match(/^([^\s:：]+?)-(P|Q|S)\d/);
      if (m && (!curB || curB.p !== m[1])) { curB = { p: m[1], from: r.n, ok: false, types: [] }; blocks.push(curB); }
      if (curB) { if (r.type === "확인") curB.ok = true; if (!curB.done) curB.types.push(r.type); if (r.type === "확인") curB.done = true; }
    });
    if (blocks.length) {
      var miss = blocks.filter(function (b) { return !b.ok; }).map(function (b) { return b.p; });
      add(miss.length ? "bad" : "ok", "실습 묶음 " + blocks.length + "개(" + blocks.map(function (b) { return b.p; }).join("·") + ")" + (miss.length ? " 중 '여기까지 됐나요?' 확인 장이 없는 것: " + miss.join(", ") : " 모두 확인 장이 있어요."));
      if (blocks.length > 1) {
        var sig = blocks.map(function (b) { return b.types.filter(function (t) { return t !== "개념"; }).join(">"); });
        var same = sig.every(function (s) { return s === sig[0]; });
        add(same ? "ok" : "mid", same ? "실습 묶음의 장 배치가 서로 같아요. 학생이 두 번째부터 순서를 예상할 수 있어요." : "실습 묶음의 장 배치가 서로 달라요. 일부러 다르게 한 것이 아니라면 맞춰 보세요.");
      }
    } else add("mid", "프롬프트 번호(예: 도시-P1, 헬스-Q1)를 찾지 못해 실습 묶음을 나누지 못했어요.");
    var fill = (md.match(/\[AI가 채움/g) || []).length, todo = (md.match(/\[확정 필요/g) || []).length;
    add(fill ? "bad" : "ok", fill ? "아직 비어 있는 [AI가 채움] 자리 " + fill + "곳 — 'AI에게 빈자리 채우기' 지시문으로 채우세요." : "[AI가 채움] 자리가 남아 있지 않아요.");
    add(todo ? "mid" : "ok", todo ? "저자가 정할 [확정 필요] 자리 " + todo + "곳 — 덱을 만들기 전에 값을 채우세요." : "[확정 필요] 자리가 남아 있지 않아요.");
    add(/요청문/.test(md) ? "ok" : "mid", /요청문/.test(md) ? "슬라이드 AI에게 줄 요청문이 들어 있어요." : "슬라이드 AI(Genspark 등)에게 줄 요청문이 없어요.");
    add(/발표자 노트/.test(md) ? "ok" : "mid", /발표자 노트/.test(md) ? "발표자 노트 규칙이 있어요." : "발표자 노트 규칙이 없어요.");
    if (/중국어판|영어판|일본어판/.test(md)) add(/\|\s*한국어\s*\|/.test(md) ? "ok" : "bad", /\|\s*한국어\s*\|/.test(md) ? "외국어판 용어표가 있어요." : "외국어판을 만든다고 했는데 용어표가 없어요.");
    var sens = /의료|환자|진료|금융|거래|결제|건강|카드|위치 기록/.test(md);
    if (sens) add(/개인정보|개인 정보/.test(md) && rows.some(function (r) { return r.type === "주의"; }) ? "ok" : "bad", /개인정보|개인 정보/.test(md) && rows.some(function (r) { return r.type === "주의"; }) ? "민감한 분야를 다루고, 개인정보 주의 장이 있어요." : "의료·금융처럼 민감한 분야를 다루는데 개인정보 주의 장(유형 '주의')이 없어요.");
    var longT = rows.filter(function (r) { return r.title.replace(/^[^:]+:\s*/, "").length > 30; }).map(function (r) { return r.n; });
    if (longT.length) add("mid", "제목이 긴 장(30자 넘음): " + longT.slice(0, 8).join(", ") + "번. 한 줄에 들어가게 줄여 보세요.");
    return { items: items, n: n, fill: fill, todo: todo, blocks: blocks.length };
  }

  /* ---------- 아이디어에서 읽기 ---------- */
  function fromIdea(t) {
    var r = {}, m;
    if ((m = t.match(/(\d{2})\s*장/))) r.target = +m[1];
    var L = {};
    if (/중국어|중문|简体|中文/.test(t)) L.zh = true;
    if (/영어판|영문판|영어로|English/i.test(t)) L.en = true;
    if (/일본어|日本語/.test(t)) L.ja = true;
    if (Object.keys(L).length) r.langs = L;
    if (/번체|繁體/.test(t)) r.zhScript = "trad"; else if (/간체|简体/.test(t)) r.zhScript = "simp";
    var tools = [["Qwen", "Qwen (Qwen Chat)"], ["AI Studio", "Google AI Studio"], ["ChatGPT", "ChatGPT"], ["Gemini", "Gemini"], ["Claude", "Claude"], ["DeepSeek", "DeepSeek"], ["Copilot", "Copilot"], ["뤼튼", "뤼튼"]];
    var found = tools.filter(function (x) { return t.toLowerCase().indexOf(x[0].toLowerCase()) >= 0; })
      .map(function (x) { return { at: t.toLowerCase().indexOf(x[0].toLowerCase()), v: x[1] }; }).sort(function (a, b) { return a.at - b.at; });
    if (found[0]) r.main = found[0].v;
    if (found[1]) r.sub = found[1].v;
    if (/대시보드|필터/.test(t)) r.chain = "B";
    if (/개인정보|의료|환자|금융|결제|카드|건강/.test(t)) r.privacy = true;
    if (/가상 데이터|가상데이터/.test(t)) r.dataPolicy = "virtual"; else if (/공공 데이터|공공데이터|공공 통계|공공 개방/.test(t)) r.dataPolicy = "public";
    if (/genspark|젠스파크/i.test(t)) r.deckTool = "Genspark"; else if (/gamma|감마/i.test(t)) r.deckTool = "Gamma";
    return r;
  }

  /* ---------- 예시 두 개 (deck/examples/ 원본 지침서를 입력으로 옮긴 것) ---------- */
  var EX1 = {
    idea: "스마트시티와 물류 데이터로 차트 만드는 법을 처음 배우는 학생에게 가르치고 싶다. 코딩은 몰라도 된다. Qwen에 프롬프트를 여러 번 이어 물어서 차트를 완성하게 하고, 지도처럼 어려운 것은 Google AI Studio로 한 번만 맛보기로 보여 준다. 실습은 요일·시간대별 교통량(언제 붐비는가)과 배송 지연 원인(왜 늦어지는가) 두 개. 40장 안팎, Genspark로 한국어판과 중국어판을 따로 만든다.",
    title: "스마트시티 · 물류 데이터 시각화", course: "", audience: "beginner", target: 40,
    message: "좋은 차트는 한 번의 프롬프트가 아니라, 이어 묻는 프롬프트에서 나온다.",
    goals: ["도시·물류 데이터에서 \"언제, 어디서, 얼마나\"를 찾는다.", "질문에 맞는 차트를 고른다.", "Qwen에 프롬프트를 이어 입력해 차트를 만들고 세 문장으로 해석한다."],
    main: "Qwen (Qwen Chat)", sub: "Google AI Studio", taste: "거점별 물동량 버블 지도", chain: "A",
    practices: [
      { name: "스마트시티 교통량", pfx: "도시", intro: "스마트시티는 도시가 남기는 숫자를 쓰는 도시다", who: "", q: "언제 가장 붐비는가", charts: "시간대별 선 그래프, 요일×시간 히트맵", cols: "요일, 시간, 통행량", filter: "", data: "시간대별 교통량" },
      { name: "물류 배송 지연", pfx: "물류", intro: "물류는 물건이 움직인 기록을 남긴다", who: "", q: "왜 늦어지는가", charts: "지연 원인별 막대 차트, 파레토 차트", cols: "주문일, 출발 거점, 지연 원인, 소요시간", filter: "", data: "배송 기록" }],
    opts: { chartPick: true, privacy: false, mistakes: true, compare: false, next: true },
    nextText: "산업별 대시보드", dataPolicy: "undecided",
    langs: { ko: true, zh: true, en: false, ja: false }, zhScript: "undecided", deckTool: "Genspark", design: ""
  };
  var EX2 = {
    idea: "Google AI Studio로 산업별 데이터 대시보드를 만드는 실습 강의. 쉬운 일(데이터 알아보기, 차트 1개)은 Qwen으로, 여러 차트가 필터로 함께 움직이는 대시보드는 Google AI Studio로 한다. 산업은 헬스케어·의료데이터·핀테크 세 가지이고 산업이 달라도 묻는 순서는 같다는 것을 보여 준다. 실제 의료 기록·거래 내역은 쓰지 않고 수업용 가상 데이터를 쓴다. 40장 안팎, Genspark로 한국어판과 중국어판.",
    title: "Google AI Studio로 만드는 산업별 데이터 시각화", course: "", audience: "beginner", target: 40,
    message: "쉬운 일은 Qwen으로, 어려운 일은 Google AI Studio로. 산업이 달라도 묻는 순서는 같다.",
    goals: ["Qwen으로 할 일과 Google AI Studio로 할 일을 구분한다.", "프롬프트를 이어 입력해 대시보드를 만든다.", "산업마다 보는 사람이 원하는 숫자가 다르다는 것을 설명한다."],
    main: "Qwen", sub: "Google AI Studio", taste: "", chain: "B",
    practices: [
      { name: "헬스케어", pfx: "헬스", intro: "헬스케어는 내 몸의 기록을 보는 일이다", who: "건강을 관리하는 개인", q: "내 생활 습관은 어떻게 변했나", charts: "걸음 수 추세선, 수면 달력 히트맵, 목표 달성 게이지", cols: "날짜, 걸음 수, 수면 시간, 평균 심박", filter: "기간(주·월)", data: "하루 걸음 수와 수면 기록" },
      { name: "의료데이터", pfx: "의료", intro: "의료데이터는 병원이 붐비는 때를 알려 준다", who: "병원 운영 담당자", q: "환자가 어디에, 언제 몰리나", charts: "진료과별 막대, 요일×시간 히트맵, 대기 시간 추세선", cols: "날짜, 요일, 시간대, 진료과, 환자 수, 대기 시간", filter: "진료과", data: "진료과별 환자 수와 대기 시간" },
      { name: "핀테크", pfx: "핀", intro: "핀테크는 돈이 움직인 기록을 보는 일이다", who: "서비스 기획자", q: "돈은 언제, 어디에 쓰이나", charts: "일별 거래액 선 그래프, 업종별 막대, 금액 산점도(이상 거래 강조)", cols: "날짜, 시간, 업종, 결제 수단, 금액, 이상 거래 여부", filter: "결제 수단", data: "결제 기록" }],
    opts: { chartPick: false, privacy: true, mistakes: false, compare: true, next: false },
    nextText: "", dataPolicy: "virtual",
    langs: { ko: true, zh: true, en: false, ja: false }, zhScript: "undecided", deckTool: "Genspark", design: ""
  };

  root.DeckKit = { build: build, slides: slides, check: check, fromIdea: fromIdea, blank: blank, EX: [EX1, EX2], TERMS: TERMS, josa: { eul: eul, eun: eun, ga: ga, ro: ro } };
  if (typeof module !== "undefined" && module.exports) module.exports = root.DeckKit;
})(typeof window !== "undefined" ? window : this);
