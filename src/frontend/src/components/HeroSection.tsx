import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { HeroCanvas } from "./HeroCanvas"
import { Play, FileCode, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { useRunState } from "@/utils/useRunState"

interface HeroSectionProps {
  onLoadExample?: () => void
}

export function HeroSection({ onLoadExample }: HeroSectionProps) {
  const run = useRunState()
  const isActive = run.isActive

  return (
    <section className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden px-4 py-16">
      <HeroCanvas />
      <motion.div
        className="relative z-10 max-w-3xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Prompt-to-Model
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          Turn natural-language instructions into fine-tuned image classification models
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {isActive ? (
            <Button asChild size="lg" className="gap-2" variant="secondary">
              <Link to="/new-run">
                <Eye className="h-4 w-4" />
                View active run
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="gap-2">
              <Link to="/new-run">
                <Play className="h-4 w-4" />
                Start New Run
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            className="gap-2"
            onClick={onLoadExample}
            disabled={isActive}
            title={isActive ? "A run is currently in progress" : undefined}
          >
            <FileCode className="h-4 w-4" />
            Load Example
          </Button>
        </div>
        {isActive && (
          <p className="mt-4 text-xs text-muted-foreground">
            A run is currently in progress — new runs are paused until it finishes.
          </p>
        )}
      </motion.div>
    </section>
  )
}
