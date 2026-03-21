import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
} | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "prompt-to-model-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    let resolved: "dark" | "light" = "dark"
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } else {
      resolved = theme
    }
    setResolvedTheme(resolved)
    root.classList.add(resolved)
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem(storageKey, t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
