import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { HeroCanvas } from "./HeroCanvas"
import { Play, FileCode } from "lucide-react"
import { motion } from "framer-motion"

interface HeroSectionProps {
  onLoadExample?: () => void
}

export function HeroSection({ onLoadExample }: HeroSectionProps) {
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
          <Button asChild size="lg" className="gap-2">
            <Link to="/new-run">
              <Play className="h-4 w-4" />
              Start New Run
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={onLoadExample}>
            <FileCode className="h-4 w-4" />
            Load Example
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
