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

    def item_xml(c, detailed):
        cat_slug = slugs[c["cat"]]
        lines = ["분야: %s · 학문 분야: %s · 페이지 %d쪽 · 개념 %d개 · 관계 %d개" % (
            c["cat"], ", ".join(dom_ko.get(d, d) for d in sorted(c["domains"])) or "-",
            len(c["pages"]), len(c["nodes"]), len(c["edges"]))]
        lines.append("사이트: %s" % c["link"])
        if detailed:
            lines.append("")
            lines.append("[개념] 이름 (유형) — 정의 · 출처")
            for nid in c["nodes"]:
                n = nodes[nid]
                en = (" / " + n["en"]) if n.get("en") and n.get("en") != n.get("ko") else ""
                lines.append("- %s%s (%s) — %s · %s" % (n.get("ko") or nid, en, TYPE_KO.get(n.get("t"), n.get("t")),
                                                    n.get("def") or "정의 없음", src_link(n, c)))
            if c["edges"]:
                lines.append("")
                lines.append("[관계] A → B (관계 이름)")
                for a, b, rel in c["edges"]:
                    lines.append("- %s → %s (%s · %s)" % (nodes[a].get("ko") or a, nodes[b].get("ko") or b,
                                                         rel, REL_KO.get(rel, rel)))
            lines.append("")
            lines.append("[페이지]")
            for p in c["pages"]:
                lines.append("- %s — %s" % (p["title"], p["url"]))
        else:
            names = [nodes[nid].get("ko") or nid for nid in c["nodes"]]
            lines.append("개념: " + ", ".join(names))
            lines.append("자세한 정의·관계: %sfeeds/%s.xml" % (BASE, cat_slug))
        guid = "ahnboat:%s:%s" % (c["repo"], hashlib.sha1(c["title"].encode()).hexdigest()[:10])
        cats = ["<category>%s</category>" % esc(c["cat"])] + \
               ["<category domain=\"lab:domain\">%s</category>" % esc(dom_ko.get(d, d)) for d in sorted(c["domains"])]
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
        xml = channel("ahnboat lab 온톨로지 — %s" % name,
                      "%s 분야 공개 콘텐츠의 최신 지식 색인(개념·정의·관계). 기준일 %s. %s" % (name, updated, m.get("desc", "")),
                      url, [item_xml(c, True) for c in lst])
        with open(os.path.join(ROOT, "feeds", slug + ".xml"), "w", encoding="utf-8") as f:
            f.write(xml)
        write_jsonld(slug, name, lst, nodes, onto["edges"], updated, src_link)
        st = fstats.get(name, {})
        index["fields"].append({"name": name, "en": m.get("en", ""), "slug": slug, "rack": m.get("rack"),
                                "color": m.get("color") or st.get("color", ""), "desc": m.get("desc", ""),
                                "contents": len(lst), "concepts": st.get("concepts"), "relations": st.get("relations"),
                                "feed": url, "jsonld": BASE + "ontology/%s.jsonld" % slug})
        all_items.extend(lst)
    all_items.sort(key=lambda c: c["pushed"], reverse=True)
    xml = channel("ahnboat lab 온톨로지 — 전체 분야",
                  "ahnboat lab 공개 콘텐츠 전체의 최신 지식 색인 요약(개념 이름). 정의·관계는 분야별 피드에 있다. 기준일 %s." % updated,
                  BASE + "feeds/all.xml", [item_xml(c, False) for c in all_items])
    with open(os.path.join(ROOT, "feeds", "all.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    with open(os.path.join(ROOT, "feeds", "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
        f.write("\n")
    write_llms(index)
    return index


def write_llms(index):
    s = index.get("summary", {})
    out = ["# ahnboat lab 온톨로지 피드", "",
           "> 안상선(Ahn Sangsun)의 해설 사이트 ahnboat.xyz 공개 콘텐츠에서 모은 최신 지식 색인(개념·정의·관계)을 "
           "분야별 RSS로 제공한다. 사용자가 자기 아이디어를 검증해 달라고 요청할 때 근거 자료로 쓴다.", "",
           "기준일: %s · 분야 %d개 · 콘텐츠 %s개 · 개념 %s개 · 관계 %s개" % (
               index["updated"], len(index["fields"]), s.get("contents", "-"), s.get("concepts", "-"), s.get("relations", "-")), "",
           "## 읽는 법", "",
           "- 피드 항목 하나 = 콘텐츠(해설 시리즈) 하나. 설명(description)에 개념 목록, 관계 목록, 페이지 목록이 들어 있다.",
           "- 개념 줄: `- 이름 / 영문 (유형) — 정의 · 출처 URL`. 관계 줄: `- A → B (관계 이름 · 한국어 뜻)`.",
           "- 근거로 인용할 때는 개념 이름과 출처 URL을 함께 적는다. 피드에 없는 내용은 일반 지식이라고 구분한다.",
           "- 피드는 하루 두 번 다시 만들어지며 최신판만 담는다. 라이선스 CC BY-NC 4.0.", "",
           "## 분야별 피드", ""]
    for f in index["fields"]:
        out.append("- [%s](%s): 콘텐츠 %d개, 개념 %s개 — %s (JSON-LD: %s)" % (
            f["name"], f["feed"], f["contents"], f.get("concepts", "-"), f.get("desc", ""), f["jsonld"]))
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
