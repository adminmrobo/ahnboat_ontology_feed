#!/usr/bin/env python3
"""ahnboat lab 공개 콘텐츠의 최신 온톨로지를 분야별 RSS 피드로 만든다.

  python3 scripts/build_feeds.py                 # cover_status 저장소에서 받아 만든다 (Actions에서 하루 두 번)
  python3 scripts/build_feeds.py --src DIR       # 로컬 사본(<DIR>/data/ontology.json 등)으로 만든다

원본: adminmrobo/ahnboat_lab_cover_status 의
  data/ontology.json  — 공개 콘텐츠 페이지의 지식 색인(#kg)을 모은 분야별 온톨로지 (그쪽에서 하루 두 번 갱신)
  data/repos.json     — 저장소별 사이트 주소·마지막 갱신 시각
  data/hub_meta.json  — 분야(서버실 랙) 순서·영문 이름·소개

만드는 것:
  feeds/all.xml              모든 분야. 콘텐츠마다 항목 하나, 개념 이름만 (가볍게)
  feeds/<분야>.xml           분야 하나. 콘텐츠마다 항목 하나, 개념 유형·정의·출처 쪽과 관계까지
  ontology/<분야>.jsonld     분야 하나의 전체 온톨로지 (기계가 읽는 JSON-LD)
  feeds/index.json           분야 목록 (지시문 생성 페이지가 읽는다)
  config/field_slugs.json    분야 이름 → 피드 파일 이름. 한번 정한 이름은 바꾸지 않는다(피드 주소 고정)
표준 라이브러리만 쓴다.
"""
import argparse
import collections
import datetime as dt
import email.utils
import hashlib
import json
import os
import re
import sys
import urllib.request

OWNER = "adminmrobo"
SRC_REPO = "ahnboat_lab_cover_status"
BASE = "https://adminmrobo.github.io/ahnboat_ontology_feed/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLUGS = os.path.join(ROOT, "config", "field_slugs.json")
LIMIT = 90000   # 생성 AI의 웹 읽기 도구가 한 번에 읽는 분량(약 10만 자)보다 작게. 넘으면 AI용 나눔 파일을 더 만든다

REL_KO = {
    "partOf": "~의 일부", "prerequisiteOf": "먼저 알아야 함", "evaluatedBy": "~로 평가",
    "relatedTo": "관련", "broader": "상위 개념", "contrastsWith": "대비", "evaluatedOn": "~에서 평가",
    "motivates": "다음으로 이어짐", "derivedFrom": "~에서 나옴", "solves": "해결", "hasLimitation": "한계",
    "bioAnalogueOf": "생물 쪽 대응", "narrower": "하위 개념", "uses": "사용", "implements": "구현",
}
TYPE_KO = {
    "Concept": "개념", "Method": "방법", "Term": "용어", "Metric": "지표", "Dataset": "데이터",
    "Account": "계정", "Standard": "기준", "Identity": "항등식", "Theory": "이론", "BioAnalogue": "생물 대응",
    "Assumption": "가정", "Distribution": "분포", "Indicator": "지표", "Framework": "틀",
    "Definition": "정의", "Theorem": "정리", "Axiom": "공리", "Structure": "구조", "Estimator": "추정량",
}
BAD_XML = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]")


def load_src(src, name):
    if src:
        with open(os.path.join(src, "data", name), encoding="utf-8") as f:
            return json.load(f)
    url = "https://raw.githubusercontent.com/%s/%s/main/data/%s" % (OWNER, SRC_REPO, name)
    req = urllib.request.Request(url, headers={"User-Agent": "ahnboat-ontology-feed"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def clean(s):
    return BAD_XML.sub("", str(s or "")).strip()


def esc(s):
    return clean(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def cdata(s):
    return "<![CDATA[" + clean(s).replace("]]>", "]]]]><![CDATA[>") + "]]>"


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or "field"


def rfc822(iso):
    try:
        t = dt.datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=dt.timezone.utc)
    except ValueError:
        t = dt.datetime.now(dt.timezone.utc)
    return email.utils.format_datetime(t)


def field_meta(hub):
    out = {}
    for c in hub.get("categories", []):
        out[c["name"]] = {"rack": c.get("rack"), "en": (c.get("tr") or {}).get("en", ""),
                          "desc": c.get("desc", ""), "color": c.get("color", "")}
    return out


def assign_slugs(names, meta):
    os.makedirs(os.path.dirname(SLUGS), exist_ok=True)
    try:
        with open(SLUGS, encoding="utf-8") as f:
            slugs = json.load(f)
    except (OSError, ValueError):
        slugs = {}
    used = set(slugs.values()) | {"all", "index"}
    for n in names:
        if n in slugs:
            continue
        base = slugify(meta.get(n, {}).get("en")) if meta.get(n, {}).get("en") else \
            "field-" + hashlib.sha1(n.encode()).hexdigest()[:6]
        s, i = base, 2
        while s in used:
            s, i = "%s-%d" % (base, i), i + 1
        slugs[n] = s
        used.add(s)
    with open(SLUGS, "w", encoding="utf-8") as f:
        json.dump(slugs, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return slugs


def build(src):
    onto = load_src(src, "ontology.json")
    repos = load_src(src, "repos.json")
    hub = load_src(src, "hub_meta.json")
    meta = field_meta(hub)
    repo_info = {r["repo"]: r for r in repos if isinstance(r, dict) and r.get("repo")}
    dom_ko = {d["code"]: d.get("ko", d["code"]) for d in onto.get("domains", [])}
    updated = onto.get("updated") or dt.date.today().isoformat()
    build_time = rfc822(updated + "T00:00:00+09:00")

    # 분야 순서: 서버실 랙 순서, 그다음 온톨로지에만 있는 분야
    order = [c["name"] for c in sorted(hub.get("categories", []), key=lambda c: c.get("rack") or 99)]
    fields = [f["cat"] for f in onto.get("fields", [])]
    fields = [n for n in order if n in fields] + [n for n in fields if n not in order]
    slugs = assign_slugs(fields, meta)

    pages = {p["id"]: p for p in onto["pages"]}
    nodes = {n["id"]: n for n in onto["nodes"]}

    # 콘텐츠 = (저장소, 콘텐츠 이름). 피드 항목 하나.
    contents = collections.OrderedDict()
    for p in onto["pages"]:
        key = (p["repo"], p["content"])
        c = contents.setdefault(key, {"repo": p["repo"], "title": p["content"], "cat": p["cat"],
                                      "pages": [], "domains": set(), "nodes": []})
        c["pages"].append(p)
        c["domains"].update(p.get("d") or [])
    page_content = {p["id"]: (p["repo"], p["content"]) for p in onto["pages"]}
    for n in onto["nodes"]:
        seen = set()
        for pid, _anchor in n.get("p", []):
            k = page_content.get(pid)
            if k and k not in seen:
                seen.add(k)
                contents[k]["nodes"].append(n["id"])
    edges_by = collections.defaultdict(list)
    for a, b, rel in onto["edges"]:
        edges_by[a].append((a, b, rel))

    for c in contents.values():
        info = repo_info.get(c["repo"], {})
        c["link"] = info.get("pages_url") or (c["pages"][0]["url"] if c["pages"] else BASE)
        c["pushed"] = info.get("pushed_at") or updated
        ids = set(c["nodes"])
        c["edges"] = [e for nid in c["nodes"] for e in edges_by.get(nid, []) if e[1] in ids]

    def src_link(n, c):
        for pid, anchor in n.get("p", []):
            p = pages.get(pid)
            if p and p["repo"] == c["repo"]:
                return p["url"] + (anchor or "")
        return c["link"]

    def item_xml(c, detailed, seen=None):
        cat_slug = slugs[c["cat"]]
        if detailed:
            lines = ["분야: %s · 학문 분야: %s · 페이지 %d쪽 · 개념 %d개 · 관계 %d개" % (
                c["cat"], ", ".join(dom_ko.get(d, d) for d in sorted(c["domains"])) or "-",
                len(c["pages"]), len(c["nodes"]), len(c["edges"]))]
            lines.append("사이트: %s" % c["link"])
        else:
            lines = ["%s · 개념 %d개" % (c["cat"], len(c["nodes"]))]
        if detailed:
            code = {}
            for i, p in enumerate(c["pages"], 1):
                code[p["id"]] = "p%d" % i
            lines.append("")
            lines.append("[페이지] 기호 = 제목 — 주소")
            for p in c["pages"]:
                lines.append("%s = %s — %s" % (code[p["id"]], p["title"], p["url"]))
            lines.append("")
            lines.append("[개념] 이름 (유형) — 정의 [출처 페이지 기호#위치]")
            again = []
            for nid in c["nodes"]:
                n = nodes[nid]
                if seen is not None and nid in seen:
                    again.append(n.get("ko") or nid)
                    continue
                if seen is not None:
                    seen.add(nid)
                where = ""
                for pid, anchor in n.get("p", []):
                    if pid in code:
                        where = code[pid] + (anchor or "")
                        break
                lines.append("- %s (%s) — %s [%s]" % (n.get("ko") or nid, TYPE_KO.get(n.get("t"), n.get("t")),
                                                   n.get("def") or "정의 없음", where))
            if again:
                lines.append("- (이 피드 위쪽에 이미 정의된 개념) " + ", ".join(again))
            if c["edges"]:
                lines.append("")
                lines.append("[관계] A → B, C : 관계")
                grp = collections.OrderedDict()
                for a, b, rel in c["edges"]:
                    grp.setdefault((a, rel), []).append(nodes[b].get("ko") or b)
                for (a, rel), bs in grp.items():
                    lines.append("- %s → %s : %s" % (nodes[a].get("ko") or a, ", ".join(bs), REL_KO.get(rel, rel)))
        else:
            names = []
            for nid in c["nodes"]:
                if seen is not None and nid in seen:
                    continue
                if seen is not None:
                    seen.add(nid)
                names.append(nodes[nid].get("ko") or nid)
            lines.append("개념: " + (", ".join(names) or "(위 항목들과 같은 개념)"))
        guid = "ahnboat:%s:%s" % (c["repo"], hashlib.sha1(c["title"].encode()).hexdigest()[:10])
        cats = ["<category>%s</category>" % esc(c["cat"])]
        if detailed:
            cats += ["<category domain=\"lab:domain\">%s</category>" % esc(dom_ko.get(d, d)) for d in sorted(c["domains"])]
        return ("    <item>\n      <title>%s</title>\n      <link>%s</link>\n      <guid isPermaLink=\"false\">%s</guid>\n"
                "      <pubDate>%s</pubDate>\n      %s\n      <description>%s</description>\n    </item>\n") % (
            esc(c["title"]), esc(c["link"]), esc(guid), rfc822(c["pushed"]), "\n      ".join(cats),
            cdata("\n".join(lines)))

    def channel(title, desc, self_url, items):
        return ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n  <channel>\n"
                "    <title>%s</title>\n    <link>%s</link>\n    <description>%s</description>\n"
                "    <language>ko</language>\n    <lastBuildDate>%s</lastBuildDate>\n    <ttl>720</ttl>\n"
                "    <copyright>CC BY-NC 4.0 · 안상선 ((주)M-Robo)</copyright>\n"
                "    <atom:link href=\"%s\" rel=\"self\" type=\"application/rss+xml\"/>\n%s  </channel>\n</rss>\n") % (
            esc(title), esc(BASE), esc(desc), build_time, esc(self_url), "".join(items))

    os.makedirs(os.path.join(ROOT, "feeds"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "ontology"), exist_ok=True)
    by_field = collections.defaultdict(list)
    for c in contents.values():
        by_field[c["cat"]].append(c)
    for lst in by_field.values():
        lst.sort(key=lambda c: c["pushed"], reverse=True)

    index = {"updated": updated, "base": BASE, "all": BASE + "feeds/all.xml",
             "summary": onto.get("summary", {}), "fields": []}
    fstats = {f["cat"]: f for f in onto.get("fields", [])}
    all_items = []
    for name in fields:
        slug = slugs[name]
        lst = by_field.get(name, [])
        m = meta.get(name, {})
        url = BASE + "feeds/%s.xml" % slug
        seen = set()
        title = "ahnboat lab 온톨로지 — %s" % name
        desc = "%s 분야 공개 콘텐츠의 최신 지식 색인(개념·정의·관계). 기준일 %s. %s" % (name, updated, m.get("desc", ""))
        xml = channel(title, desc, url, [item_xml(c, True, seen) for c in lst])
        with open(os.path.join(ROOT, "feeds", slug + ".xml"), "w", encoding="utf-8") as f:
            f.write(xml)
        for old in os.listdir(os.path.join(ROOT, "feeds")):
            if re.fullmatch(re.escape(slug) + r"-p\d+\.xml", old):
                os.remove(os.path.join(ROOT, "feeds", old))
        parts = [url]
        if len(xml) > LIMIT:
            groups, cur, size = [], [], 0
            for c in lst:
                one = len(item_xml(c, True, set()))
                if cur and size + one > LIMIT - 3000:
                    groups.append(cur)
                    cur, size = [], 0
                cur.append(c)
                size += one
            if cur:
                groups.append(cur)
            parts = []
            for i, g in enumerate(groups, 1):
                purl = BASE + "feeds/%s-p%d.xml" % (slug, i)
                pseen = set()
                pxml = channel("%s (%d/%d)" % (title, i, len(groups)),
                               "생성 AI가 한 번에 읽도록 나눈 %d/%d. 전체는 %s. " % (i, len(groups), url) + desc,
                               purl, [item_xml(c, True, pseen) for c in g])
                with open(os.path.join(ROOT, "feeds", "%s-p%d.xml" % (slug, i)), "w", encoding="utf-8") as f:
                    f.write(pxml)
                parts.append(purl)
        write_jsonld(slug, name, lst, nodes, onto["edges"], updated, src_link)
        st = fstats.get(name, {})
        index["fields"].append({"name": name, "en": m.get("en", ""), "slug": slug, "rack": m.get("rack"),
                                "color": m.get("color") or st.get("color", ""), "desc": m.get("desc", ""),
                                "contents": len(lst), "concepts": st.get("concepts"), "relations": st.get("relations"),
                                "feed": url, "parts": parts, "jsonld": BASE + "ontology/%s.jsonld" % slug})
        all_items.extend(lst)
    all_items.sort(key=lambda c: c["pushed"], reverse=True)
    xml = channel("ahnboat lab 온톨로지 — 전체 분야",
                  "ahnboat lab 공개 콘텐츠 전체의 최신 지식 색인 요약(개념 이름). 정의·관계는 분야별 피드(%sfeeds/<분야>.xml, 목록은 %sllms.txt)에 있다. 기준일 %s." % (BASE, BASE, updated),
                  BASE + "feeds/all.xml", [item_xml(c, False, set()) for c in all_items])
    with open(os.path.join(ROOT, "feeds", "all.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    for old in os.listdir(os.path.join(ROOT, "feeds")):
        if re.fullmatch(r"all-p\d+\.xml", old):
            os.remove(os.path.join(ROOT, "feeds", old))
    index["all_parts"] = [BASE + "feeds/all.xml"]
    if len(xml) > LIMIT:
        half = (len(all_items) + 1) // 2
        groups = [all_items[:half], all_items[half:]]
        index["all_parts"] = []
        for i, g in enumerate(groups, 1):
            purl = BASE + "feeds/all-p%d.xml" % i
            pxml = channel("ahnboat lab 온톨로지 — 전체 분야 (%d/2)" % i,
                           "생성 AI가 한 번에 읽도록 나눈 %d/2. 전체는 %sfeeds/all.xml." % (i, BASE), purl,
                           [item_xml(c, False, set()) for c in g])
            with open(os.path.join(ROOT, "feeds", "all-p%d.xml" % i), "w", encoding="utf-8") as f:
                f.write(pxml)
            index["all_parts"].append(purl)
    with open(os.path.join(ROOT, "feeds", "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write("\n")
    index["images"] = prepare_images()
    write_text_feeds(index)
    write_search_index(onto, fields, index)
    with open(os.path.join(ROOT, "feeds", "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write("\n")
    write_llms(index)
    return index


def pixel_grid(im, Image):
    """NEAREST 정수배로 키운 픽셀아트면 (원래 격자 그림, 배수)를, 아니면 (그림, 1)을 돌려준다."""
    from PIL import ImageChops
    for f in (8, 6, 5, 4, 3, 2):
        if im.width % f or im.height % f:
            continue
        small = im.resize((im.width // f, im.height // f), Image.NEAREST)
        if ImageChops.difference(small.resize(im.size, Image.NEAREST), im).getbbox() is None:
            return small, f
    return im, 1


def prepare_images():
    """assets/에 올린 Genspark 그림(bg_hero·bg_banner·cover, png/jpg)을 WebP로 바꾸고 목록을 돌려준다.
    픽셀아트(NEAREST 정수배)면 원래 격자 크기로 되돌려 무손실 WebP로 저장한다. 페이지는 image-rendering:pixelated로
    키워 보여 주므로 또렷하고 파일도 작다. 픽셀아트가 아니면 가로 1920px 이하 WebP(품질 88).
    Pillow가 없으면 이미 있는 WebP만 목록에 넣는다."""
    out = {}
    adir = os.path.join(ROOT, "assets")
    try:
        from PIL import Image
    except ImportError:
        Image = None
    for name in ("bg_hero", "bg_banner", "cover"):
        webp = os.path.join(adir, name + ".webp")
        src = next((os.path.join(adir, name + e) for e in (".png", ".jpg", ".jpeg")
                    if os.path.exists(os.path.join(adir, name + e))), None)
        if Image and src and (not os.path.exists(webp) or os.path.getmtime(src) > os.path.getmtime(webp)):
            im = Image.open(src).convert("RGB")
            grid, f = pixel_grid(im, Image)
            if f > 1:
                grid.save(webp, "WEBP", lossless=True, method=6)
            else:
                if im.width > 1920:
                    im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
                im.save(webp, "WEBP", quality=88, method=6)
            if name == "cover":   # 공유 미리보기: 1.905:1(1200×630 비율)로 가운데를 자르고 정수배로 키운다
                g = grid if f > 1 else im
                ch = min(g.height, round(g.width * 630 / 1200))
                cw = round(ch * 1200 / 630)
                l, t = (g.width - cw) // 2, (g.height - ch) // 2
                crop = g.crop((l, t, l + cw, t + ch))
                if f > 1:
                    k = -(-1200 // cw)
                    crop = crop.resize((cw * k, ch * k), Image.NEAREST)
                else:
                    crop = crop.resize((1200, 630), Image.LANCZOS)
                crop.save(os.path.join(adir, "og.png"), optimize=True)
        if os.path.exists(webp):
            out[name] = BASE + "assets/%s.webp" % name
    return out

def write_text_feeds(index):
    """XML을 못 읽는 AI 웹 도구를 위해 각 피드를 같은 내용의 일반 텍스트(feeds/txt/*.txt)로도 쓴다."""
    import xml.dom.minidom as minidom
    tdir = os.path.join(ROOT, "feeds", "txt")
    os.makedirs(tdir, exist_ok=True)
    for old in os.listdir(tdir):
        if old.endswith(".txt"):
            os.remove(os.path.join(tdir, old))
    def text(node, tag):
        el = node.getElementsByTagName(tag)
        return "".join(c.data for c in el[0].childNodes if c.nodeType in (c.TEXT_NODE, c.CDATA_SECTION_NODE)) if el else ""
    for name in sorted(os.listdir(os.path.join(ROOT, "feeds"))):
        if not name.endswith(".xml"):
            continue
        dom = minidom.parse(os.path.join(ROOT, "feeds", name))
        ch = dom.getElementsByTagName("channel")[0]
        out = ["# " + text(ch, "title"), text(ch, "description"),
               "기준: " + text(ch, "lastBuildDate") + " · 라이선스 CC BY-NC 4.0 · 원본 RSS: " + BASE + "feeds/" + name, ""]
        for it in ch.getElementsByTagName("item"):
            out += ["", "## " + text(it, "title"), "주소: " + text(it, "link"), text(it, "description").strip()]
        with open(os.path.join(tdir, name[:-4] + ".txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(out) + "\n")
    def t(u):
        return u.replace("/feeds/", "/feeds/txt/").replace(".xml", ".txt")
    for f in index["fields"]:
        f["txt"] = t(f["feed"])
        f["txt_parts"] = [t(u) for u in f["parts"]]
    index["all_txt"] = t(index["all"])
    index["all_txt_parts"] = [t(u) for u in index.get("all_parts", [index["all"]])]


def write_search_index(onto, fields, index):
    """지시문 생성 페이지가 아이디어 글에서 관련 개념을 미리 찾고, AI 답의 링크를 확인하는 데 쓰는 색인.
    concepts: [한국어 이름, 영문 이름, 유형, 정의, 출처 주소, 분야 번호들, 관계로 이어진 이웃 [번호, 관계]]"""
    pages = {p["id"]: p for p in onto["pages"]}
    fidx = {n: i for i, n in enumerate(fields)}
    rows, anchors = [], collections.defaultdict(set)
    pos = {n["id"]: i for i, n in enumerate(onto["nodes"])}
    nb = collections.defaultdict(list)          # 관계로 이어진 이웃: [번호, 관계]
    for x, y, rel in onto["edges"]:
        if x in pos and y in pos:
            nb[pos[x]].append([pos[y], REL_KO.get(rel, rel)])
            nb[pos[y]].append([pos[x], REL_KO.get(rel, rel)])
    for n in onto["nodes"]:
        url = ""
        for pid, a in n.get("p", []):
            p = pages.get(pid)
            if p:
                anchors[p["url"]].add(a or "")
                if not url:
                    url = p["url"] + (a or "")
        rows.append([n.get("ko") or n["id"], n.get("en") or "", TYPE_KO.get(n.get("t"), n.get("t") or ""),
                     n.get("def") or "", url, [fidx[c] for c in n.get("c", []) if c in fidx], nb.get(len(rows), [])[:12]])
    for p in onto["pages"]:
        anchors[p["url"]].add("")
    doc = {"updated": index["updated"], "fields": fields, "concepts": rows,
           "pages": {u: sorted(a) for u, a in sorted(anchors.items())}}
    with open(os.path.join(ROOT, "feeds", "search.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))


def write_llms(index):
    s = index.get("summary", {})
    out = ["# ahnboat lab 온톨로지 피드", "",
           "> 안상선(Ahn Sangsun)의 해설 사이트 ahnboat.xyz 공개 콘텐츠에서 모은 최신 지식 색인(개념·정의·관계)을 "
           "분야별 RSS로 제공한다. 사용자가 자기 아이디어를 검증해 달라고 요청할 때 근거 자료로 쓴다.", "",
           "기준일: %s · 분야 %d개 · 콘텐츠 %s개 · 개념 %s개 · 관계 %s개" % (
               index["updated"], len(index["fields"]), s.get("contents", "-"), s.get("concepts", "-"), s.get("relations", "-")), "",
           "## 읽는 법", "",
           "- 피드 항목 하나 = 콘텐츠(해설 시리즈) 하나. 설명(description)에 개념 목록, 관계 목록, 페이지 목록이 들어 있다.",
           "- 항목마다 [페이지] 목록이 먼저 나온다(`p1 = 제목 — 주소`). 개념 줄 `- 이름 (유형) — 정의 [p1#lv3]`의 대괄호는 출처 페이지 기호와 그 안의 위치다. 출처 주소 = 해당 페이지 주소 + #위치.",
           "- 관계 줄: `- A → B : 관계`. 영문 이름과 관계 원어는 분야별 JSON-LD에 있다.",
           "- 근거로 인용할 때는 개념 이름과 출처 URL을 함께 적는다. 피드에 없는 내용은 일반 지식이라고 구분한다.",
           "- 피드는 하루 두 번 다시 만들어지며 최신판만 담는다. 라이선스 CC BY-NC 4.0.",
           "- XML을 읽기 어려우면 같은 내용의 텍스트판을 쓴다: 피드 주소의 /feeds/ 를 /feeds/txt/ 로, .xml 을 .txt 로 바꾼 주소.", "",
           "## 분야별 피드", ""]
    for f in index["fields"]:
        out.append("- [%s](%s): 콘텐츠 %d개, 개념 %s개 — %s (JSON-LD: %s)" % (
            f["name"], f["feed"], f["contents"], f.get("concepts", "-"), f.get("desc", ""), f["jsonld"]))
        if len(f["parts"]) > 1:
            out.append("  - 한 번에 읽기 어려우면 나눔 파일: " + " · ".join(f["parts"]))
    out += ["", "## 전체", "", "- [전체 분야 요약](%s): 개념 이름만 담은 가벼운 피드" % index["all"],
            "- [분야 목록 JSON](%sfeeds/index.json)" % index["base"],
            "- [지시문 생성 페이지](%s)" % index["base"], ""]
    with open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))


def write_jsonld(slug, name, lst, nodes, edges, updated, src_link):
    ids, where = [], {}
    for c in lst:
        for nid in c["nodes"]:
            if nid not in where:
                ids.append(nid)
                where[nid] = src_link(nodes[nid], c)
    idset = set(ids)
    rel = collections.defaultdict(lambda: collections.defaultdict(list))
    for a, b, r in edges:
        if a in idset and b in idset:
            rel[a][r].append({"@id": b})
    graph = []
    for nid in ids:
        n = nodes[nid]
        g = {"@id": nid, "@type": ["skos:Concept", "lab:" + (n.get("t") or "Concept")],
             "skos:prefLabel": [{"@value": n.get("ko") or nid, "@language": "ko"}]}
        if n.get("en"):
            g["skos:prefLabel"].append({"@value": n["en"], "@language": "en"})
        if n.get("def"):
            g["skos:definition"] = {"@value": n["def"], "@language": "ko"}
        g["rdfs:isDefinedBy"] = {"@id": where[nid]}
        if n.get("tp"):
            g["lab:topic"] = [{"@id": t} for t in n["tp"]]
        for r, targets in rel[nid].items():
            g["lab:" + r] = targets
        graph.append(g)
    doc = {"@context": {"skos": "http://www.w3.org/2004/02/skos/core#",
                        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
                        "dct": "http://purl.org/dc/terms/",
                        "lab": BASE + "vocab#"},
           "@id": BASE + "ontology/%s.jsonld" % slug,
           "dct:title": "ahnboat lab 온톨로지 — %s" % name, "dct:modified": updated,
           "dct:license": "https://creativecommons.org/licenses/by-nc/4.0/",
           "dct:creator": "안상선 (Ahn Sangsun)", "@graph": graph}
    with open(os.path.join(ROOT, "ontology", slug + ".jsonld"), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write("\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", help="cover_status 저장소 로컬 사본 경로")
    a = ap.parse_args()
    idx = build(a.src)
    print("기준일 %s · 분야 %d개" % (idx["updated"], len(idx["fields"])))
    for f in idx["fields"]:
        print("  %-28s %-10s 콘텐츠 %2d" % (f["slug"], f["name"], f["contents"]))
    sys.exit(0)
