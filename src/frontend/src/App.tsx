import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/hooks/useTheme"
import { AppShell } from "@/components/AppShell"
import { Dashboard } from "@/pages/Dashboard"
import { NewRun } from "@/pages/NewRun"
import { DatasetStudio } from "@/pages/DatasetStudio"
import { TrainingRuns } from "@/pages/TrainingRuns"
import { Models } from "@/pages/Models"
import { Results } from "@/pages/Results"
import { Settings } from "@/pages/Settings"

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="new-run" element={<NewRun />} />
            <Route path="dataset-studio" element={<DatasetStudio />} />
            <Route path="training-runs" element={<TrainingRuns />} />
            <Route path="models" element={<Models />} />
            <Route path="results" element={<Results />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
