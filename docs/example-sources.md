# 字卡例句來源說明

每張單字卡的 `exampleSource` 欄位標示例句從哪裡來（App 背面也會顯示「例句來源：…」）。

## 優先順序（高 → 低）

| 值 | 畫面顯示 | 說明 |
|---|---|---|
| `override` | 手動校正 | `scripts/vocab-overrides.json` 人工寫入的例句 |
| `openjlpt` | OpenJLPT | [evanclan/OpenJLPT](https://github.com/evanclan/OpenJLPT) 詞條附帶例句（CC BY-SA 4.0），經詞形／讀音核對後採用 |
| `template` | 安全模板 | 僅限少數安全框架（如具體物「ここに茶碗があります」、い形容詞「とても〜です」）。**禁止**對抽象名詞產生「ここに病気があります」這類句子 |
| `missing` | 待補 | 尚無合格例句，顯示占位提示，並加 `needs_example` 旗標 |

## 不會再做的事

- 對任意名詞套用「ここに〜があります」（造成「ここに病気／都合／意見があります」）
- 對任意動詞套用「もう一度＋辞書形」或一律「〜ことができます」
- 用 OpenJLPT「只依漢字／假名字面」亂配例句（例如把「なる」配到「なるほどね」）

## 管線

1. `build:vocab` — 從 OpenJLPT 帶入初版例句  
2. `enrich:vocab` — Jisho 補義項（**不**改例句來源）  
3. `postprocess:vocab` — 校正、還原 OpenJLPT、套用 override、標 `exampleSource`、補振り仮名  

重建：`npm run postprocess:vocab && npm run validate:vocab`
