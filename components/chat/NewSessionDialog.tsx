'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { X } from 'lucide-react'

interface TrainingJob {
  id: number
  name: string
  model_name: string
  completed_at: string
  model_path: string
}

interface NewSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateSession: (sessionData: { name: string; job_id: number; settings?: any }) => void
  completedJobs: TrainingJob[]
}

export function NewSessionDialog({
  isOpen,
  onClose,
  onCreateSession,
  completedJobs
}: NewSessionDialogProps) {
  const [sessionName, setSessionName] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([512])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionName.trim() || !selectedJobId) {
      return
    }

    onCreateSession({
      name: sessionName.trim(),
      job_id: parseInt(selectedJobId),
      settings: {
        temperature: temperature[0],
        max_tokens: maxTokens[0]
      }
    })

    // Reset form
    setSessionName('')
    setSelectedJobId('')
    setTemperature([0.7])
    setMaxTokens([512])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-white dark:bg-gray-900 border shadow-lg">
        <CardHeader className="bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <CardTitle>新しいチャットセッション</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="bg-white dark:bg-gray-900">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">セッション名</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="例: テストセッション"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">モデル選択</Label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} required>
                <SelectTrigger>
                  <SelectValue placeholder="ファインチューニング済みモデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {completedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.name} ({job.model_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Temperature: {temperature[0]}</Label>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  max={2}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  低い値はより決定的な回答、高い値はより創造的な回答
                </div>
              </div>

              <div className="space-y-2">
                <Label>最大トークン数: {maxTokens[0]}</Label>
                <Slider
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  max={2048}
                  min={64}
                  step={64}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground">
                  生成される回答の最大長さ
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                キャンセル
              </Button>
              <Button type="submit" className="flex-1">
                作成
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}