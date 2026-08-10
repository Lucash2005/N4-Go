# N4 Go — 日檢 N4 學習助手

現代化 PWA 網頁應用，協助準備 **JLPT N4（2026 年 12 月）**。資料皆存於瀏覽器 LocalStorage，無需後端即可使用。

## 功能

- **首頁 Dashboard**：考試倒數、整體進度、今日任務清單
- **單字／文法卡片**：翻牌、搜尋篩選、已學會／需複習標記、TTS 發音
- **模擬測驗**：隨機選擇題（單字／文法／閱讀）＋即時解析
- **學習計畫**：8 月〜12 月階段性時程總覽

## 開始使用

```bash
npm install
npm run dev
```

建置與預覽：

```bash
npm run build
npm run preview
```

## 技術

- React + Vite
- Tailwind CSS v4
- React Router
- vite-plugin-pwa（可安裝至主畫面／離線快取）

## 設計

淡青日系風格、響應式布局，手機底部導覽、桌面頂部／底部導覽並存。
