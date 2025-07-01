'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { X } from 'lucide-react'
import { modelsApi } from '@/lib/api'

interface TrainingJob {
  id: number
  name: string
  model_name: string
  completed_at: string
  model_path: string
}

interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

type ModelOption = 
  | { type: 'training'; job: TrainingJob }
  | { type: 'ollama'; model: OllamaModel }

interface NewSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateSession: (sessionData: { name: string; job_id?: number; model_name?: string; settings?: any }) => void
  completedJobs: TrainingJob[]
}

export function NewSessionDialog({
  isOpen,
  onClose,
  onCreateSession,
  completedJobs
}: NewSessionDialogProps) {
  const [sessionName, setSessionName] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [temperature, setTemperature] = useState([0.7])
  const [maxTokens, setMaxTokens] = useState([512])
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(false)

  // Load Ollama models when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadOllamaModels()
    }
  }, [isOpen])

  const loadOllamaModels = async () => {
    try {
      setLoading(true)
      const response = await modelsApi.list()
      setOllamaModels(response.models || [])
    } catch (error) {
      console.error('Failed to load Ollama models:', error)
      setOllamaModels([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionName.trim() || !selectedModel) {
      return
    }

    // Determine if it's a training job or Ollama model
    const isTrainingModel = selectedModel.startsWith('training:')
    const isOllamaModel = selectedModel.startsWith('ollama:')

    const sessionData: any = {
      name: sessionName.trim(),
      settings: {
        temperature: temperature[0],
        max_tokens: maxTokens[0]
      }
    }

    if (isTrainingModel) {
      sessionData.job_id = parseInt(selectedModel.replace('training:', ''))
    } else if (isOllamaModel) {
      sessionData.model_name = selectedModel.replace('ollama:', '')
    }

    onCreateSession(sessionData)

    // Reset form
    setSessionName('')
    setSelectedModel('')
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
              <Label htmlFor="model">モデル実行環境の選択</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} required>
                <SelectTrigger>
                  <SelectValue placeholder="実行環境とモデルを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {/* ファインチューニング済みモデル */}
                  {completedJobs.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded">
                        🎯 ファインチューニング済みモデル (PEFT/Neural Engine)
                      </div>
                      {completedJobs.map((job) => (
                        <SelectItem key={`training:${job.id}`} value={`training:${job.id}`}>
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span>{job.name}</span>
                            <span className="text-xs text-muted-foreground">({job.model_name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {/* オリジナルOllamaモデル */}
                  {ollamaModels.length > 0 && (
                    <>
                      {completedJobs.length > 0 && (
                        <div className="border-t my-2" />
                      )}
                      <div className="px-2 py-1.5 text-sm font-semibold text-green-600 bg-green-50 rounded">
                        🤖 オリジナルモデル (Ollama サーバー)
                      </div>
                      {ollamaModels.map((model) => (
                        <SelectItem key={`ollama:${model.name}`} value={`ollama:${model.name}`}>
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>{model.name}</span>
                            <span className="text-xs text-muted-foreground">({(model.size / 1e9).toFixed(1)}GB)</span>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {loading && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      モデルを読み込み中...
                    </div>
                  )}
                  
                  {!loading && completedJobs.length === 0 && ollamaModels.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      利用可能なモデルがありません
                    </div>
                  )}
                </SelectContent>
              </Select>
              
              {/* 実行環境の説明 */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>ファインチューニング済み: カスタマイズされたモデル（高速・高精度）</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Ollamaサーバー: オリジナルモデル（比較・ベースライン用）</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Temperature:</Label>
                  <span className="text-sm font-semibold text-blue-600">{temperature[0]}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-2">
                  <span>決定的</span>
                  <span>創造的</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">最大トークン数:</Label>
                  <span className="text-sm font-semibold text-blue-600">{maxTokens[0]}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    max={2048}
                    min={64}
                    step={64}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-2">
                  <span>短い</span>
                  <span>長い</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                キャンセル
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
              >
                作成
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}