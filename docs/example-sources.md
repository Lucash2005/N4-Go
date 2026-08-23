# 字卡例句來源說明

每張單字卡的 `exampleSource` 欄位標示例句從哪裡來（App 背面也會顯示「例句來源：…」）。

## 優先順序（高 → 低）

| 值 | 畫面顯示 | 說明 |
|---|---|---|
| `override` | 手動校正 | `scripts/vocab-overrides.json` 人工寫入的例句 |
| `openjlpt` | OpenJLPT | [evanclan/OpenJLPT](https://github.com/evanclan/OpenJLPT) 詞條附帶例句（多來自 Tatoeba，CC BY-SA 4.0）。會依讀音跨級查找漢字形（如 N5「あびる」→ N3「浴びる」），並以字義消歧同音異義 |
| `jlpt` | 日檢教材風 | `scripts/jlpt-extra-examples.json`：OpenJLPT 無合格句時，補上 N5／N4 常見教材風格例句 |
| `template` | 安全模板 | 僅限少數安全框架。**禁止**對抽象名詞產生「ここに病気があります」這類句子 |
| `missing` | 待補 | 尚無合格例句，顯示占位提示，並加 `needs_example` 旗標 |

## 不會再做的事

- 對任意名詞套用「ここに〜があります」（造成「ここに病気／都合／意見があります」）
- 對任意動詞套用「もう一度＋辞書形」或一律「〜ことができます」
- 用 OpenJLPT「只依漢字／假名字面」亂配例句（例如把「なる」配到「なるほどね」）

## 管線

1. `build:vocab` — 從 OpenJLPT 帶入初版例句  
2. `enrich:vocab` — Jisho 補義項（**不**改例句來源）  
3. `postprocess:vocab` — 校正、還原 OpenJLPT、套用 JLPT 補句／override、標 `exampleSource`、補振り仮名  

重建：`npm run postprocess:vocab && npm run validate:vocab`
