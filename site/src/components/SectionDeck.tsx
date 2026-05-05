import type { SiteContent } from "../types/content"
import { MarkdownBody } from "./MarkdownBody"

// Per-section gradient palettes — one per section, cycles if more are added
const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)",   // 0 intro — blue→violet
  "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",   // 1 data-sourcing — green
  "linear-gradient(135deg, #fae8ff 0%, #f0abfc 100%)",   // 2 synthetic — purple/pink
  "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)",   // 3 filtering — teal
  "linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)",   // 4 models — amber
  "linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%)",   // 5 training — violet
  "linear-gradient(135deg, #d1fae5 0%, #a5f3fc 100%)",   // 6 results — green→cyan
  "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)",   // 7 analysis — sky blue
]

interface Props {
  content: SiteContent
  /** -1 = before first stop, 0..n-1 = section index, n = thank-you */
  activeIdx: number
}

export function SectionDeck({ content, activeIdx }: Props) {
  const isThankYou = activeIdx >= content.sections.length
  const visible = activeIdx >= 0

  const sectionEntry =
    !isThankYou && activeIdx >= 0 ? content.sections[activeIdx] : null

  const gradient =
    THUMB_GRADIENTS[activeIdx % THUMB_GRADIENTS.length] ?? THUMB_GRADIENTS[0]

  return (
    <aside
      className="section-panel"
      data-visible={visible ? "true" : "false"}
      aria-live="polite"
      aria-label="Section content"
    >
      {isThankYou && visible ? (
        <ThankYouPanel content={content} gradient={gradient} />
      ) : sectionEntry ? (
        <SectionPanel
          title={sectionEntry.title}
          body={sectionEntry.body}
          code={sectionEntry.code}
          imageCaption={sectionEntry.imageCaption}
          index={activeIdx + 1}
          gradient={gradient}
        />
      ) : null}
    </aside>
  )
}

interface SectionPanelProps {
  title: string
  body: string
  code?: string
  imageCaption?: string
  index: number
  gradient: string
}

function SectionPanel({
  title,
  body,
  code,
  imageCaption,
  index,
  gradient,
}: SectionPanelProps) {
  return (
    <>
      {/* Coloured header strip */}
      <div
        className="panel-thumb"
        role="presentation"
        style={{ background: gradient }}
      >
        {imageCaption && <span>{imageCaption}</span>}
      </div>

      <div className="panel-index">Stop {index}</div>
      <h2 className="panel-title">{title}</h2>

      {/* Markdown-rendered body */}
      <div className="panel-body">
        <MarkdownBody src={body} />
      </div>

      {/* Optional code block */}
      {code && <pre className="panel-code mono">{code}</pre>}
    </>
  )
}

function ThankYouPanel({
  content,
  gradient,
}: {
  content: SiteContent
  gradient: string
}) {
  return (
    <>
      <div
        className="panel-thumb"
        style={{ background: gradient, fontSize: "2rem" }}
        role="presentation"
      >
        ✦
      </div>
      <div className="panel-index">Finale</div>
      <h2 className="panel-title">{content.thankYou.title}</h2>

      {/* Thank you body also supports markdown */}
      <div className="panel-body">
        <MarkdownBody src={content.thankYou.body} />
      </div>

      <p
        className="panel-body mono"
        style={{ opacity: 0.55, paddingTop: 0, fontSize: "0.82rem" }}
      >
        {content.thankYou.signature}
      </p>
    </>
  )
}
