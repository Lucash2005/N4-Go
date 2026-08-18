#!/usr/bin/env python3
"""Build N4 target content: 1500 vocab + 80 grammar + extra readings."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

ROOT = Path("/workspace")
SRC = Path("/tmp/jlpt-src")
CACHE_PATH = SRC / "zh-cache.json"
OUT_VOCAB = ROOT / "src/data/vocabulary.js"
OUT_GRAMMAR = ROOT / "src/data/grammar.js"
OUT_MEMORY = ROOT / "src/data/memory.js"
OUT_READINGS = ROOT / "src/data/readings.js"

TARGET_VOCAB = 1500
BATCH = 25


def js_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def load_cache() -> dict[str, str]:
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text())
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=0))


def is_mostly_cjk(text: str) -> bool:
    if not text:
        return False
    cjk = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    return cjk >= max(1, len(text) // 4)


def translate_one(text: str) -> str:
    from deep_translator import GoogleTranslator

    translator = GoogleTranslator(source="en", target="zh-TW")
    for attempt in range(4):
        try:
            out = (translator.translate(text) or "").strip()
            if out and (is_mostly_cjk(out) or not text.isascii()):
                return out
        except Exception:
            time.sleep(0.6 * (attempt + 1))
    return ""


def translate_missing(texts: list[str], cache: dict[str, str]) -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    missing = []
    seen = set()
    for t in texts:
        t = (t or "").strip()
        if not t or t in seen:
            continue
        seen.add(t)
        cached = cache.get(t, "")
        if cached and (is_mostly_cjk(cached) or not t.isascii()):
            continue
        missing.append(t)
    print(f"translate missing: {len(missing)}", flush=True)
    if not missing:
        return
    done = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(translate_one, src): src for src in missing}
        for fut in as_completed(futures):
            src = futures[fut]
            try:
                dst = fut.result()
            except Exception:
                dst = ""
            if dst:
                cache[src] = dst
            done += 1
            if done % 50 == 0:
                save_cache(cache)
                print(f"  {done}/{len(missing)}", flush=True)
    save_cache(cache)
    print(f"  done {done}/{len(missing)} cached={len(cache)}", flush=True)


def zh(cache: dict[str, str], text: str, fallback: str = "") -> str:
    key = (text or "").strip()
    if not key:
        return fallback
    return cache.get(key) or fallback or key


def parse_existing_vocab() -> list[dict]:
    text = (ROOT / "src/data/vocabulary.js").read_text()
    cards = []
    for block in re.findall(r"\{[^{}]*id: 'v\d+'[^{}]*\}", text):
        def field(name: str) -> str:
            m = re.search(rf"{name}: '((?:\\'|[^'])*)'", block)
            return m.group(1) if m else ""
        cards.append(
            {
                "id": field("id"),
                "word": field("word"),
                "reading": field("reading"),
                "meaning": field("meaning"),
                "example": field("example"),
                "exampleMeaning": field("exampleMeaning"),
                "exampleFurigana": field("exampleFurigana"),
                "category": field("category"),
                "level": "N4",
            }
        )
    return cards


def infer_category(word: str, meaning_en: str, meaning_zh: str) -> str:
    blob = f"{word} {meaning_en} {meaning_zh}".lower()
    pairs = [
        ("外來語", r"[ァ-ヶー]{3,}|loan|english|america|asia"),
        ("敬語", r"humble|respectful|honorable|polite|謙|敬"),
        ("時間", r"day|week|month|year|time|morning|night|hour|clock|週|時|午"),
        ("場所", r"place|station|school|park|shop|store|hospital|bank|駅|学校"),
        ("食物", r"eat|food|drink|rice|bread|meat|fish|tea|coffee|食|飲"),
        ("動作", r"^to |verb|する"),
        ("形容", r"adjective|い$|な$|beautiful|big|small|形"),
        ("學習", r"study|school|book|exam|class|勉強|試験"),
        ("自然", r"weather|rain|wind|tree|flower|mountain|sea|雨|風"),
        ("生活", r"family|home|house|work|job|life|家|仕事"),
    ]
    for cat, pat in pairs:
        if re.search(pat, blob, re.I):
            return cat
    if re.fullmatch(r"[ァ-ヶー]+", word or ""):
        return "外來語"
    if meaning_en.lower().startswith("to "):
        return "動作"
    return "生活"


def annotate_headword(example: str, word: str, reading: str) -> str:
    if not example:
        return ""
    if not word or word not in example:
        return example
    if not reading or reading == word or not re.search(r"[\u4e00-\u9fff]", word):
        return example
    # Avoid double annotation
    if f"{word}[" in example:
        return example
    return example.replace(word, f"{word}[{reading}]", 1)


def normalize_entry(item: dict, cache: dict[str, str], level: str) -> dict | None:
    word = (item.get("word") or "").strip()
    if not word or word in {"あ"}:
        return None
    reading = (item.get("reading") or "").strip() or word
    meanings = item.get("meanings") or []
    meaning_en = meanings[0] if meanings else word
    meaning_zh = zh(cache, meaning_en, meaning_en)
    if len(meanings) > 1:
        extra = zh(cache, meanings[1], "")
        if extra and extra not in meaning_zh:
            meaning_zh = f"{meaning_zh}；{extra}"
    examples = item.get("examples") or []
    example_ja = word
    example_en = meaning_en
    if examples:
        example_ja = examples[0].get("ja") or word
        example_en = examples[0].get("en") or meaning_en
    example_zh = zh(cache, example_en, meaning_zh)
    return {
        "word": word,
        "reading": reading,
        "meaning": meaning_zh,
        "example": example_ja,
        "exampleMeaning": example_zh,
        "exampleFurigana": annotate_headword(example_ja, word, reading),
        "category": infer_category(word, meaning_en, meaning_zh),
        "level": level,
    }


def emit_vocab(cards: list[dict]) -> str:
    lines = [
        "/** @typedef {{ id: string, type: 'vocab', word: string, reading: string, meaning: string, example: string, exampleFurigana?: string, exampleMeaning: string, category: string, level?: string }} VocabCard */",
        "",
        "/** N5+N4 core list (OpenJLPT, CC BY-SA 4.0) topped up to the N4 study target. */",
        "/** @type {VocabCard[]} */",
        "export const vocabulary = [",
    ]
    for card in cards:
        lines.append("  {")
        lines.append(f"    id: {js_str(card['id'])},")
        lines.append("    type: 'vocab',")
        for key in (
            "word",
            "reading",
            "meaning",
            "example",
            "exampleMeaning",
            "exampleFurigana",
            "category",
        ):
            lines.append(f"    {key}: {js_str(card[key])},")
        if card.get("level"):
            lines.append(f"    level: {js_str(card['level'])},")
        lines.append("  },")
    lines.append("]")
    lines.append("")
    return "\n".join(lines)


def emit_grammar(existing: list[dict], extra: list[dict]) -> str:
    lines = [
        "/** @typedef {{ id: string, type: 'grammar', word: string, reading: string, meaning: string, example: string, exampleFurigana?: string, exampleMeaning: string, category: string, pattern: string }} GrammarCard */",
        "",
        "/** @type {GrammarCard[]} */",
        "export const grammar = [",
    ]
    for card in existing + extra:
        lines.append("  {")
        lines.append(f"    id: {js_str(card['id'])},")
        lines.append("    type: 'grammar',")
        for key in (
            "word",
            "reading",
            "meaning",
            "pattern",
            "example",
            "exampleMeaning",
            "exampleFurigana",
            "category",
        ):
            lines.append(f"    {key}: {js_str(card[key])},")
        lines.append("  },")
    lines.append("]")
    lines.append("")
    return "\n".join(lines)


def parse_existing_grammar() -> list[dict]:
    text = (ROOT / "src/data/grammar.js").read_text()
    cards = []
    for block in re.findall(r"\{[^{}]*id: 'g\d+'[^{}]*\}", text):
        def field(name: str) -> str:
            m = re.search(rf"{name}: '((?:\\'|[^'])*)'", block)
            return (m.group(1) if m else "").replace("\\'", "'")
        cards.append(
            {
                "id": field("id"),
                "word": field("word"),
                "reading": field("reading"),
                "meaning": field("meaning"),
                "pattern": field("pattern"),
                "example": field("example"),
                "exampleMeaning": field("exampleMeaning"),
                "exampleFurigana": field("exampleFurigana"),
                "category": field("category"),
            }
        )
    return cards


def emit_readings(existing: list[dict], extra: list[dict]) -> str:
    lines = [
        "/** Extra + original N4-style reading items for the quiz bank. */",
        "export const readingQuestions = [",
    ]
    all_items = existing + extra
    for i, item in enumerate(all_items, start=1):
        qid = f"r{i:03d}"
        lines.append("  {")
        lines.append(f"    id: {js_str(qid)},")
        lines.append("    type: 'reading',")
        lines.append("    prompt: 'この文の内容と合っているものを選んでください。',")
        lines.append(f"    passage: {js_str(item['passage'])},")
        lines.append(f"    options: {json.dumps(item['options'], ensure_ascii=False)},")
        lines.append(f"    answer: {item['answer']},")
        lines.append(f"    explanation: {js_str(item['explanation'])},")
        lines.append("  },")
    lines.append("]")
    lines.append("")
    return "\n".join(lines)


def patch_memory(extra_grammar: list[dict]) -> None:
    text = (ROOT / "src/data/memory.js").read_text()
    extra_lines = []
    for g in extra_grammar:
        extra_lines.append(f"  {g['id']}: {{")
        extra_lines.append(f"    useWhen: {js_str(g['useWhen'])},")
        extra_lines.append(f"    form: {js_str(g['form'])},")
        extra_lines.append(f"    compare: {js_str(g['compare'])},")
        extra_lines.append(f"    tip: {js_str(g['tip'])},")
        extra_lines.append("  },")
    block = "\n".join(extra_lines) + "\n"
    if "g025:" in text:
        # replace from g025 to end of GRAMMAR_MEMORY
        text = re.sub(r"  g025: \{.*?\n  \},\n\}", block.rstrip() + "\n}", text, count=1, flags=re.S)
        # If g025 was not originally present, the above no-ops; insert before closing of GRAMMAR_MEMORY
    if "g025:" not in text:
        text = text.replace(
            "    tip: '〜の間に＝趁這段時間',\n  },\n}",
            "    tip: '〜の間に＝趁這段時間',\n  },\n" + block + "}",
        )

    helper = '''
function inferPos(card) {
  const word = card.word || ''
  const reading = card.reading || ''
  if (/[ァ-ヶー]{2,}/.test(word) && !/[一-龯]/.test(word)) return '外來語'
  if (word.endsWith('する')) return '名詞／サ變'
  if ((card.meaning || '').includes('的') && word.endsWith('い')) return 'い形容詞'
  if (word.endsWith('い') && reading.endsWith('い') && /[一-龯]/.test(word)) return 'い形容詞'
  if (/する$|動詞/.test(card.meaning || '')) return '動詞'
  return '名詞'
}

function inferMemory(card) {
  const reading = card.reading && card.reading !== card.word ? card.reading : ''
  const bit = reading ? `${reading}＝` : ''
  return `${bit}${card.meaning}`
}

'''
    if "function inferPos" not in text:
        text = text.replace(
            "export function withMemory(card) {",
            helper + "export function withMemory(card) {",
        )
    text = text.replace(
        """  const extra = VOCAB_MEMORY[card.id]
  if (!extra) return card
  return { ...card, pos: extra.pos, memory: extra.memory }
}""",
        """  const extra = VOCAB_MEMORY[card.id]
  if (extra) return { ...card, pos: extra.pos, memory: extra.memory }
  return { ...card, pos: inferPos(card), memory: inferMemory(card) }
}""",
    )
    OUT_MEMORY.write_text(text)


def main() -> None:
    n5 = json.loads((SRC / "n5.json").read_text())
    n4 = json.loads((SRC / "n4.json").read_text())
    n3 = json.loads((SRC / "n3.json").read_text())
    extra_grammar = json.loads((ROOT / "scripts/n4-grammar-extra.json").read_text())
    extra_readings = json.loads((ROOT / "scripts/n4-readings-extra.json").read_text())

    existing_vocab = parse_existing_vocab()
    existing_words = {c["word"] for c in existing_vocab}
    print("existing vocab", len(existing_vocab))

    texts = []
    n3_for_fill = n3[:400]
    for item in n5 + n4 + n3_for_fill:
        for m in (item.get("meanings") or [])[:2]:
            texts.append(m)
        for ex in (item.get("examples") or [])[:1]:
            if ex.get("en"):
                texts.append(ex["en"])
    cache = load_cache()
    translate_missing(texts, cache)

    built: list[dict] = list(existing_vocab)
    seen = set(existing_words)

    def add_level(items: list[dict], level: str) -> None:
        for item in items:
            if len(built) >= TARGET_VOCAB:
                return
            card = normalize_entry(item, cache, level)
            if not card or card["word"] in seen:
                continue
            seen.add(card["word"])
            card["id"] = f"v{len(built) + 1:03d}"
            built.append(card)

    add_level(n5, "N5")
    add_level(n4, "N4")
    add_level(n3_for_fill, "N4")  # everyday top-up toward 1500 N4 target
    print("vocab built", len(built))
    if len(built) < TARGET_VOCAB:
        raise SystemExit(f"only {len(built)} vocab cards")

    OUT_VOCAB.write_text(emit_vocab(built[:TARGET_VOCAB]))

    existing_grammar = parse_existing_grammar()
    extra_for_js = [
        {k: g[k] for k in (
            "id", "word", "reading", "meaning", "pattern",
            "example", "exampleMeaning", "exampleFurigana", "category",
        )}
        for g in extra_grammar
    ]
    OUT_GRAMMAR.write_text(emit_grammar(existing_grammar, extra_for_js))
    patch_memory(extra_grammar)

    original_readings = [
        {
            "passage": "山田さんは来月から大阪で働きます。今、アパートを探しています。駅から近いところがいいそうです。",
            "options": [
                "山田さんは今大阪で働いている",
                "山田さんは駅から近いアパートを探している",
                "山田さんは来月アパートを探す",
                "山田さんは駅から遠いところがいい",
            ],
            "answer": 1,
            "explanation": "文中說他正在找公寓，且希望靠近車站，因此第二項正確。",
        },
        {
            "passage": "明日は雨が降るそうです。運動会は来週に延期になりました。子どもたちは少しがっかりしています。",
            "options": [
                "運動会は明日行われる",
                "運動会は来週に延期された",
                "子どもたちは喜んでいる",
                "明日は晴れそうだ",
            ],
            "answer": 1,
            "explanation": "「延期になりました」表示運動會延到下週。",
        },
        {
            "passage": "私は毎日日本語を勉強しています。特に漢字が難しいですが、諦めずに続けています。来年の N4 に合格したいです。",
            "options": [
                "話者は漢字が簡単だと思っている",
                "話者は勉強をやめた",
                "話者は来年 N4 に合格したい",
                "話者は週に一度だけ勉強する",
            ],
            "answer": 2,
            "explanation": "最後一句明確寫出「来年の N4 に合格したいです」。",
        },
    ]
    OUT_READINGS.write_text(emit_readings(original_readings, extra_readings))
    print("done", "vocab", TARGET_VOCAB, "grammar", len(existing_grammar) + len(extra_grammar))


if __name__ == "__main__":
    main()
