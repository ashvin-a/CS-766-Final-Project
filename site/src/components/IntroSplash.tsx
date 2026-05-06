import content from "../data/sections.json"
import type { SiteContent } from "../types/content"

const copy = content as SiteContent

// Per-author accent colours — blue, purple, teal
const AUTHOR_COLORS = ["#2563eb", "#7c3aed", "#0d9488"]

interface Props {
  visible: boolean
  onSkip: () => void
}

export function IntroSplash({ visible, onSkip }: Props) {
  if (!visible) return null

  const team = copy.thankYou?.team ?? []

  return (
    <div className="intro-overlay" aria-hidden="true">
      <div style={{ textAlign: "center" }}>
        <div className="intro-tagline">{copy.tagline}</div>
        <div className="intro-sub">{copy.subtitle}</div>

        {/* Author byline */}
        {team.length > 0 && (
          <div className="intro-byline">
            {team.map((name, i) => (
              <span key={name} className="intro-author">
                <span
                  className="intro-author-dot"
                  style={{ background: AUTHOR_COLORS[i % AUTHOR_COLORS.length] }}
                />
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="intro-skip" onClick={onSkip}>
        Skip intro →
      </button>
    </div>
  )
}
