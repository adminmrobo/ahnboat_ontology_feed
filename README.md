# ahnboat lab 온톨로지 피드

ahnboat.xyz 공개 콘텐츠의 **최신 온톨로지(개념·정의·관계)를 분야별 RSS**로 내보내고, 그 피드를 근거로 생성 AI에게 **내 아이디어를 검증해 달라고 요청하는 지시문**을 만들어 주는 저장소입니다.

- 지시문 생성 페이지: https://adminmrobo.github.io/ahnboat_ontology_feed/
- AI 도구용 안내: https://adminmrobo.github.io/ahnboat_ontology_feed/llms.txt

## 왜 RSS인가

질문마다 답을 돌려주는 API와 달리, 여기서 필요한 것은 **지금 이 분야의 최신 온톨로지 한 벌**입니다. 그래서 서버 없이 GitHub Pages에 정적 파일로 두고, 원본이 바뀔 때마다 최신판으로 덮어씁니다. 사용자는 뉴스 주제를 고르듯 분야를 하나 이상 고르거나 전체를 고릅니다.

## 만들어지는 파일

| 파일 | 내용 |
|---|---|
| `feeds/<분야>.xml` | 분야 하나의 피드. 콘텐츠(해설 시리즈)마다 항목 하나, 설명에 개념(유형·정의·출처 쪽)·관계·페이지 목록 |
| `feeds/all.xml` | 전체 분야 요약 피드. 개념 이름만 담아 가볍게 |
| `ontology/<분야>.jsonld` | 분야 하나의 전체 온톨로지(SKOS 기반 JSON-LD). 기계가 읽는 용도 |
| `feeds/index.json` | 분야 목록·통계. 지시문 생성 페이지가 읽음 |
| `llms.txt` | 생성 AI가 이 사이트를 읽는 법 |
| `config/field_slugs.json` | 분야 이름 → 피드 파일 이름. **한번 정한 이름은 바꾸지 않습니다**(피드 주소 고정). 분야 이름이 바뀌면 새 줄이 생기며, 예전 주소를 살리려면 새 이름에 예전 파일 이름을 손으로 적어 줍니다 |

분야는 서버실 랙(대분류)과 같습니다: 머신러닝, 딥러닝·뇌과학, AI 감각·생성, LLM·추론 엔지니어링, 경제·수학·최적화, 금융·핀테크·블록체인, 통계·데이터 기초, 인공지능 응용.

## 데이터 흐름

```
각 해설 저장소의 #kg(지식 색인)
   → ahnboat_lab_cover_status  scripts/build_ontology.py  → data/ontology.json   (하루 두 번)
   → 이 저장소                 scripts/build_feeds.py     → feeds/ · ontology/ · llms.txt (하루 두 번)
```

온톨로지를 새로 모으지 않고, cover_status가 이미 만든 `data/ontology.json`(공개 카탈로그에 있는 콘텐츠만)을 받아 형식만 바꿉니다. 그래서 공개 범위와 분류는 cover_status의 관리실 설정을 그대로 따릅니다.

## 자동 갱신

`.github/workflows/build.yml`이 하루 두 번(한국 시간 08:43·20:43 예약, GitHub 사정으로 밀릴 수 있음)과 Actions 탭의 수동 실행 때 피드를 다시 만들고, 바뀐 것이 있으면 커밋합니다.

## GitHub Pages 켜기

Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: **main** / **(root)** → Save.

## 로컬에서 만들기

```bash
python3 scripts/build_feeds.py                          # GitHub에서 원본을 받아 만든다
python3 scripts/build_feeds.py --src ../ahnboat_lab_cover_status   # 로컬 사본으로 만든다
python3 -m http.server 8000                             # http://localhost:8000/
```

글 · 안상선 ((주)M-Robo 대표) · 콘텐츠 라이선스 CC BY-NC 4.0
