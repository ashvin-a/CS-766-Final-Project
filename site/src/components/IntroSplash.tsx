import content from "../data/sections.json"
import type { SiteContent } from "../types/content"

const copy = content as SiteContent

interface Props {
  visible: boolean
  onSkip: () => void
}

export function IntroSplash({ visible, onSkip }: Props) {
  if (!visible) return null
  return (
    <div className="intro-overlay" aria-hidden="true">
      <div style={{ textAlign: "center" }}>
        <div className="intro-tagline">{copy.tagline}</div>
        <div className="intro-sub">{copy.subtitle}</div>
      </div>
      <button type="button" className="intro-skip" onClick={onSkip}>
        Skip intro →
      </button>
    </div>
  )
}
