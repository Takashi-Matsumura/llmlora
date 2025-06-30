'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Play, Loader2 } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { modelsApi, trainingApi } from '@/lib/api'
import { LoRAConfig, TrainingConfig } from '@/types'
import { LoRAConfigForm } from './LoRAConfigForm'
import { TrainingConfigForm } from './TrainingConfigForm'

export function TrainingJobForm() {
  const { datasets, models, setModels, addTrainingJob, setError, setIsLoading } = useStore()
  const [jobName, setJobName] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [loraConfig, setLoraConfig] = useState<LoRAConfig>({
    r: 8,
    alpha: 16,
    dropout: 0.1,
    target_modules: ['q_proj', 'v_proj']
  })

  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    learning_rate: 0.0002,
    num_epochs: 3,
    batch_size: 4,
    max_length: 512,
    gradient_accumulation_steps: 1,
    warmup_ratio: 0.1,
    weight_decay: 0.01,
    logging_steps: 10,
    save_steps: 500
  })

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const response = await modelsApi.list()
      setModels(response.models)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load models')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobName || !selectedModel || !selectedDataset) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      const job = await trainingApi.createJob({
        name: jobName,
        model_name: selectedModel,
        dataset_id: parseInt(selectedDataset),
        lora_config: loraConfig,
        training_config: trainingConfig
      })
      
      addTrainingJob(job)
      
      // Reset form
      setJobName('')
      setSelectedModel('')
      setSelectedDataset('')
      
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create training job')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>訓練ジョブを作成</CardTitle>
          <CardDescription>
            選択したモデルとデータセットで新しいLoRAファインチューニングジョブを開始
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-name">ジョブ名</Label>
                <Input
                  id="job-name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="私のLoRA訓練ジョブ"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model-select">ベースモデル</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} required>
                  <SelectTrigger>
                    <SelectValue placeholder="モデルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-select">訓練データセット</Label>
              <Select value={selectedDataset} onValueChange={setSelectedDataset} required>
                <SelectTrigger>
                  <SelectValue placeholder="データセットを選択" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      {dataset.name} ({dataset.size} 例)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !jobName || !selectedModel || !selectedDataset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ジョブ作成中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  訓練を開始
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <LoRAConfigForm config={loraConfig} onChange={setLoraConfig} />
      
      <TrainingConfigForm config={trainingConfig} onChange={setTrainingConfig} />
    </div>
  )
}