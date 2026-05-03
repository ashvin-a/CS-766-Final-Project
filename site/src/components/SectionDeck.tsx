import type { SiteContent } from "../types/content"

// Gradient per-section for the thumb area
const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
  "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
  "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
  "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
  "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
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
          imageAlt={sectionEntry.imageAlt}
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
  code: string
  imageCaption: string
  imageAlt: string
  index: number
  gradient: string
}

function SectionPanel({
  title,
  body,
  code,
  imageCaption,
  imageAlt,
  index,
  gradient,
}: SectionPanelProps) {
  return (
    <>
      <div
        className="panel-thumb"
        role="img"
        aria-label={imageAlt}
        style={{ background: gradient }}
      >
        <span>{imageCaption}</span>
      </div>
      <div className="panel-index">Stop {index}</div>
      <h2 className="panel-title">{title}</h2>
      <p className="panel-body">{body}</p>
      <pre className="panel-code mono">{code}</pre>
    </>
  )
}

function ThankYouPanel({ content, gradient }: { content: SiteContent; gradient: string }) {
  return (
    <>
      <div className="panel-thumb" style={{ background: gradient, fontSize: "2rem" }}>
        ✦
      </div>
      <div className="panel-index">Finale</div>
      <h2 className="panel-title">{content.thankYou.title}</h2>
      <p className="panel-body">{content.thankYou.body}</p>
      <p className="panel-body mono" style={{ opacity: 0.55, paddingTop: 0 }}>
        {content.thankYou.signature}
      </p>
    </>
  )
}
