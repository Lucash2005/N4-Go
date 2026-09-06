# N4 Go — 日檢 N4 學習助手

現代化 PWA，協助準備 **JLPT N4（2026 年 12 月）**。資料存於瀏覽器 LocalStorage，無需後端。

## iPhone 直接使用（不需電腦）

靜態站台會發佈到 `gh-pages` 分支。用 **Safari** 打開這個網址（不要用 jsDelivr 開 HTML，會變成純文字）：

**https://lucash2005.github.io/N4-Go/**

然後：分享 → **加入主畫面**。

若畫面還是舊的：Safari 重新整理一次，或清掉該網站資料後再開。

## 本機開發（有電腦時）

```bash
npm install
npm run dev
```

建置：

```bash
npm run build
npm run preview
```

## 功能

- **Dashboard**：考試倒數、進度條、今日自動排程（單字／文法／複習／聽力）
- **卡片**：翻牌、TTS、已學會／需複習、搜尋篩選；支援今日練習模式
- **測驗**：隨機選擇題＋即時解析
- **計畫**：8–12 月階段時程
- **自動打勾**：完成今日排程卡片後，任務清單會自動更新

## 技術

React + Vite + Tailwind CSS + vite-plugin-pwa（HashRouter，適合靜態託管）
