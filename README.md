# ahnboat lab 온톨로지 피드

ahnboat.xyz 공개 콘텐츠의 **최신 온톨로지(개념·정의·관계)를 분야별 RSS**로 내보내고, 그 피드를 근거로 생성 AI에게 **내 아이디어를 검증해 달라고 요청하는 지시문**을 만들어 주는 저장소입니다.

- 지시문 생성 페이지: https://adminmrobo.github.io/ahnboat_ontology_feed/
- AI 도구용 안내: https://adminmrobo.github.io/ahnboat_ontology_feed/llms.txt

## 왜 RSS인가

질문마다 답을 돌려주는 API와 달리, 여기서 필요한 것은 **지금 이 분야의 최신 온톨로지 한 벌**입니다. 그래서 서버 없이 GitHub Pages에 정적 파일로 두고, 원본이 바뀔 때마다 최신판으로 덮어씁니다. 사용자는 뉴스 주제를 고르듯 분야를 하나 이상 고르거나 전체를 고릅니다.

## 지시문 생성 페이지 (`index.html`)

연구실 스킬(ai-lab-explainer-plain)의 형식을 서비스 화면에 맞춰 옮겼습니다.

- 히어로 무대: 하루·시아·모아가 안내하고, 주판봇과 초파리 연구원은 만족해하고, 미공개 X1·X2·X3은 방청석에서 박수를 칩니다. 박사는 이걸 만드느라 밤을 새워 자는 중입니다.
- 처음 오신 분께 3줄 요약과 처음 보는 말 풀이
- 튜토리얼 5단계: 시작(하루) → 분야 고르기(시아) → 아이디어 쓰기(모아) → 복사해서 붙이기(하루) → 답 확인하기(시아). 단계마다 해당 도구로 이동해 강조 표시
- 도구: 분야 고르기 → 아이디어 쓰기 → 지시문 복사
- AI 판단 코너: 지어낸 출처가 섞인 답에서 수상한 줄 찾기(초파리 연구원)
- 시연: 같은 아이디어를 지시문만으로 / 피드와 함께 물었을 때 비교
- 피드 주소 표, 마무리 대화
- 그림은 연구실 캐릭터 팩(lab4, `ahnboat_lab_explainer/packs/character`)의 표정·동작 그림을 `assets/char/`에 복사해 씁니다. 전용 표지 요청문은 [`docs/cover_prompt.md`](docs/cover_prompt.md)
- 서비스 페이지라서 해설 페이지의 지식 색인(#kg)·꾸러미(#export)는 넣지 않았습니다. 이 페이지가 공개 카탈로그에 오르면 피드가 자기 자신을 개념으로 다시 담게 되기 때문입니다.

## 만들어지는 파일

| 파일 | 내용 |
|---|---|
| `feeds/<분야>.xml` | 분야 하나의 피드(RSS 리더 구독용 전체). 콘텐츠(해설 시리즈)마다 항목 하나, 설명에 페이지 목록(`p1 = 제목 — 주소`)·개념(유형·정의·`[p1#위치]`)·관계. 같은 피드 안에서 이미 나온 개념은 이름만 다시 적음 |
| `feeds/<분야>-p1.xml`, `-p2.xml` | 생성 AI용 나눔 파일. 생성 AI의 웹 읽기 도구는 한 번에 약 10만 자까지만 읽는 경우가 많아, 9만 자를 넘는 분야는 나눠서 함께 만든다. 지시문에는 이 파일이 들어간다 |
| `feeds/all.xml` (+ `all-p1/p2.xml`) | 전체 분야 요약 피드. 개념 이름만 담아 가볍게 |
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
