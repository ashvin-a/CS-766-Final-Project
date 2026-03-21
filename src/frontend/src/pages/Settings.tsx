import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function Settings() {
  const [apiBaseUrl, setApiBaseUrl] = useState("/api")
  const [modelProvider, setModelProvider] = useState("openai")
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)

  return (
    <div className="space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure API, model providers, and notifications
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">API</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">API base URL</Label>
              <Input
                id="api-url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Model provider</h2>
          </CardHeader>
          <CardContent>
            <Select value={modelProvider} onValueChange={setModelProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="local">Local / Self-hosted</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Cloud delivery</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Placeholder for S3, GCS, or Azure blob configuration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Notifications</h2>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2">
              <Switch
                checked={notifyOnComplete}
                onCheckedChange={setNotifyOnComplete}
              />
              <span className="text-sm">Email when run completes</span>
            </label>
          </CardContent>
        </Card>

        <Button>Save changes</Button>
      </div>
    </div>
  )
}
