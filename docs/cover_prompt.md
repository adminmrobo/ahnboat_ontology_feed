# 표지 그림 요청문 (픽셀아트)

지금 페이지 무대와 공유 미리보기(`assets/og.png`)는 캐릭터 팩(lab4)의 동작 그림을 합성한 것이다. 전용 표지를 새로 그릴 때 아래 요청문을 쓴다. 캐릭터 기본 그림(박사·조수 하루·인턴 시아·인턴 모아·주판봇·초파리 연구원·미공개 X1~X3)을 참고 그림으로 함께 올린다.

## 요청문

16-bit RPG pixel art, white background, 16:9, crisp pixel edges, no text in the image.

A small research lab after an all-night build. On the left, the professor (lab coat, thin teal square glasses, short tied-back hair with a white streak) is fast asleep face-down on a desk next to a laptop, with small purple "Z" bubbles.
In the center, three guides stand in front of a big screen showing a tidy concept map (dots joined by lines, color-coded by field) and a feed icon:
- assistant Haru (long pink hair in two buns with a navy streak, lab coat, jeans) holding a clipboard and smiling at the viewer,
- intern Sia (long black hair, black-and-white maid-style apron) gesturing toward the screen with an open palm,
- intern Moa (light brown hair, white ribbon, mustard cardigan with a red bow) pointing at a checklist.
On the right, the boxy robot Jupanbot (green pixel-face screen, abacus) raises its arms in delight, and the small fruit fly researcher (blue helmet, red goggle eyes, white coat over black vest) stands with arms crossed, smiling with sparkles.
In the front row, three secret silhouette characters X1, X2, X3 (dark silhouettes with only white dot eyes; X1 with a pink ribbon ponytail, X2 round with glasses, X3 hooded with cat ears) clap with both hands raised.
Warm, friendly mood. Keep the characters' height order: professor ≥ Haru > Jupanbot > fruit fly.

## 반영

- 저장 이름: `assets/cover.png` (생성 원본), 픽셀 격자를 찾아 `NEAREST` 정수배로 키운 무손실 WebP `assets/cover.webp`
- `index.html`의 `og:image`를 표지에서 자른 1200×630으로 바꾼다
