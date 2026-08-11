import { parseFurigana } from '../utils/furigana'

/** Render Japanese with ruby only on kanji segments. */
export default function FuriganaText({ text, annotated, showFurigana, className = '' }) {
  if (!showFurigana || !annotated) {
    return <span className={className}>{text || stripBrackets(annotated)}</span>
  }

  const segments = parseFurigana(annotated)
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby key={`${seg.text}-${i}`} className="ruby-word">
            {seg.text}
            <rt className="text-[0.55em] font-medium text-sea-deep">{seg.reading}</rt>
          </ruby>
        ) : (
          <span key={`${seg.text}-${i}`}>{seg.text}</span>
        ),
      )}
    </span>
  )
}

function stripBrackets(annotated = '') {
  return annotated.replace(/\[([^\]]+)\]/g, '')
}
