# 내 아이디어 검증하기 — Genspark 배경·표지 그림 요청문

> 지시문 생성 페이지(`index.html`)와 홈페이지 바로가기 배너(`banner.html`)에 들어갈 그림 3장입니다.
> 화풍은 연구실 해설 페이지와 같은 **16비트 SNES풍 픽셀아트**, 페이지 배경은 흰색이므로 그림도 **밝은 흰색·크림 톤**으로 맞춥니다.

## 쓰는 법

1. **G1·G2(배경)는 사람·캐릭터가 없는 그림**입니다. 페이지가 그 위에 캐릭터 팩의 움직이는 그림(하루·시아·모아·주판봇·초파리 연구원·미공개 X1~X3·자는 박사)을 세웁니다. 그래서 아래쪽 바닥을 비워 둡니다.
2. **G3(표지)만 캐릭터가 들어갑니다.** 이때는 캐릭터 기본 그림을 참조 이미지로 먼저 올립니다.
   - `ahnboat_lab_explainer/packs/character/setting_shots/` 의 k02(박사)·k03(조수 하루)·k04(초파리 연구원) 3면도
   - `ahnboat_lab_explainer/packs/character/jupanbot_genspark/ref/` 의 주판봇 참조 그림
   - 시아·모아·미공개 X1~X3은 `ahnboat_lab_explainer/packs/character/character_pack/webp/192/` 의 기본 표정 그림
3. 아래 프롬프트를 **그대로** 붙여 넣고, 네거티브 프롬프트 칸에는 공통 네거티브를 넣습니다.
4. **G1부터** 만들고, 마음에 들면 G1을 G2·G3의 참조 이미지로 함께 올려 같은 방·같은 색감을 유지합니다.
5. 받은 PNG를 이 저장소 `assets/`에 지정한 이름으로 올리면 끝입니다. 자동 갱신 작업이 WebP로 바꾸고, 페이지와 배너가 다음 갱신부터 그림을 배경으로 씁니다(아래 「반영」).

## 공통 네거티브 프롬프트

```text
text, letters, numbers, words, captions, logo, watermark, signature, UI buttons, real brand names, photorealistic, 3D render, blurry, soft airbrush, painterly, dark gloomy mood, neon cyberpunk, heavy vignette, cluttered foreground, extra limbs, off-model characters, gold coins, white glossy round robot head, black pill-shaped screen
```

## G1. 페이지 무대 배경 (캐릭터 없음) → `assets/bg_hero.png`

비율 **16:9**. 페이지 맨 위 무대의 배경입니다. 아래 약 30%는 캐릭터가 설 바닥이라 비워 둡니다.

```text
Detailed 16-bit SNES-era pixel art, crisp pixels, dithering shading, thick dark outlines, bright and airy palette dominated by white, cream and very light warm gray, with small accents of eight soft colors (green, purple, orange, blue, brown, mustard, teal, raspberry). Wide interior of a cozy small research lab in the early morning after an all-night build, soft sunrise light through a window on the right. In the center back wall, a large wall screen shows a tidy concept map: many small round nodes joined by thin lines, clustered into eight colored groups, glowing gently. Next to the screen, a small signal-wave icon panel radiating three curved arcs (a generic feed symbol, no letters). On the left, a wooden desk with a laptop, a desk lamp still on, scattered sticky notes without writing, two empty coffee mugs and a rolled-up blanket on a small sofa beside it, showing someone worked all night. Bookshelves with plain colored book spines, a potted plant, a whiteboard with only simple diagrams of dots and arrows. The lower third of the image is an empty, clean, light wooden floor with nothing on it, reserved for characters to stand on later. No people, no characters, no animals, no robots. Even, flat front view like a game stage background, no text, no letters, no numbers.
```

## G2. 홈페이지 바로가기 배너 배경 (캐릭터 없음) → `assets/bg_banner.png`

비율 **21:9**(가장 넓게). 배너 왼쪽에는 글이, 오른쪽에는 캐릭터가 섭니다. 그래서 **왼쪽 40%는 아주 단순하게** 비웁니다.

```text
Detailed 16-bit SNES-era pixel art, crisp pixels, dithering shading, thick dark outlines, bright and airy palette dominated by white, cream and very light warm gray, with small accents of eight soft colors (green, purple, orange, blue, brown, mustard, teal, raspberry). Ultra-wide panoramic banner of the same cozy small research lab in early morning light. The left 40 percent of the image is a plain, softly lit cream wall with a subtle dotted paper texture and nothing else, kept very simple for overlaid text. The right 60 percent shows a large wall screen with a tidy concept map of small round nodes joined by thin lines in eight colored clusters, a small generic feed symbol of three curved arcs beside it, a desk with a laptop and two empty coffee mugs, and a small sofa with a rolled blanket. The bottom quarter across the whole width is an empty light wooden floor reserved for characters. No people, no characters, no animals, no robots. Flat front view like a game stage background, no text, no letters, no numbers.
```

## G3. 표지·공유 미리보기 (캐릭터 포함) → `assets/cover.png`

비율 **16:9**. 공유할 때 보이는 대표 그림입니다. 캐릭터 참조 이미지를 꼭 함께 올립니다.

```text
Detailed 16-bit SNES-era pixel art, crisp pixels, dithering shading, thick dark outlines, bright and airy palette dominated by white, cream and very light warm gray. The same cozy research lab in early morning light, with a large wall screen showing a tidy concept map of small round nodes joined by thin lines in eight colored clusters. Characters, keep each exactly as in its own reference image:
- On the left, the Doctor (white lab coat over a black vest, thin teal square glasses, messy dark hair with a white streak tied back in a short ponytail) is fast asleep face-down on the desk next to his laptop, with small purple Z bubbles above him.
- In the center, three guides stand in front of the screen: the assistant Haru (long pink hair in two buns with a navy streak, white lab coat over a lavender hoodie, jeans) holding a clipboard and smiling at the viewer; intern Sia (long straight black hair, black dress with a white frilled apron) gesturing toward the screen with an open palm; intern Moa (long light brown hair with a white frilled headband and ribbon, mustard cardigan with a red checked bow, white apron) pointing up with one finger, cheerful.
- On the right, AbaBot the robot (boxy beige CRT-monitor body, dark green screen with a mint-green pixel smile, short antenna, gray arms, tank treads, holding a small wooden abacus) raises the abacus overhead in delight, and the small Fruit Fly Researcher (blue helmet, big red goggle eyes, white coat over a black vest, black gloves, translucent wings) stands with arms crossed and a satisfied smile with small sparkles.
- In the front row, seen from behind and slightly to the side like an audience, three secret silhouette characters with only white dot eyes clap with both hands raised: X1 with a pink ribbon ponytail, X2 round with round glasses, X3 small with a hood with cat ears.
Height order: Doctor ≥ Haru > AbaBot > Fruit Fly Researcher; the Fruit Fly Researcher is the smallest, about knee height of the Doctor. Warm, happy, quiet mood. No text, no letters, no numbers.
```

## 결과물 검수

- 그림 안에 글자·숫자·로고가 보이면 버리고 다시 만듭니다(스크린의 개념 지도는 점과 선만).
- G1·G2에 사람·로봇이 하나라도 들어가면 다시 만듭니다(캐릭터는 페이지가 따로 세웁니다).
- G3: 주판봇이 흰 둥근 머리·검은 알약형 화면·금화로 나오면 다시 만듭니다(회사 캐릭터와 섞임 방지). 박사·하루의 브릿지 방향이 3면도와 반대면 다시 만듭니다(두 캐릭터는 좌우 뒤집기 금지).
- 전체가 어둡게 나오면 "bright and airy, white and cream" 문장을 맨 앞으로 옮겨 다시 만듭니다.

## 반영 (자동)

`assets/`에 `bg_hero.png`·`bg_banner.png`·`cover.png`(또는 `.jpg`)를 올리면, 자동 갱신 작업(`scripts/build_feeds.py`)이:

1. 가로 1920px 이하의 WebP(`assets/bg_hero.webp` 등)로 바꾸고,
2. `cover`가 있으면 가운데를 1200×630으로 잘라 공유 미리보기 `assets/og.png`를 바꾸고,
3. `feeds/index.json`의 `images`에 적어 둡니다.

페이지와 배너는 `images`에 그림이 있을 때만 배경으로 깔고, 없으면 지금처럼 흰 종이 배경을 씁니다.
