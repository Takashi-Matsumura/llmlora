'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Play, Pause, Square, Clock, Zap, CheckCircle, XCircle } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { trainingApi } from '@/lib/api'
import { TrainingJobForm } from './TrainingJobForm'
import { TrainingProgress } from './TrainingProgress'

export function TrainingManager() {
  const { trainingJobs, setTrainingJobs, setError, setIsLoading } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState<number | null>(null)

  useEffect(() => {
    loadTrainingJobs()
  }, [])

  const loadTrainingJobs = async () => {
    try {
      setIsLoading(true)
      const jobs = await trainingApi.listJobs()
      setTrainingJobs(jobs)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load training jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteJob = async (id: number) => {
    const job = trainingJobs.find(j => j.id === id)
    
    if (job?.status === 'running') {
      setError('実行中のトレーニングジョブは削除できません。まずジョブを停止してください。')
      return
    }
    
    if (!confirm(`Job #${id}: "${job?.name || id}" を削除してもよろしいですか？この操作は元に戻せません。`)) return

    try {
      setIsLoading(true)
      await trainingApi.deleteJob(id)
      // Reload the training jobs list to ensure UI is updated
      await loadTrainingJobs()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Cannot delete running')) {
          setError('実行中のトレーニングジョブは削除できません。')
        } else if (error.message.includes('not found')) {
          setError('指定されたトレーニングジョブが見つかりません。')
        } else {
          setError(`削除に失敗しました: ${error.message}`)
        }
      } else {
        setError('トレーニングジョブの削除に失敗しました。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'running': return <Zap className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'cancelled': return <Square className="h-4 w-4" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">新しいトレーニングジョブ</h2>
            <p className="text-muted-foreground">新しいLoRAファインチューニングジョブを設定して開始</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            ジョブ一覧に戻る
          </Button>
        </div>
        <TrainingJobForm />
      </div>
    )
  }

  if (selectedJob) {
    const job = trainingJobs.find(j => j.id === selectedJob)
    if (!job) {
      setSelectedJob(null)
      return null
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Job #{job.id}: {job.name}</h2>
            <p className="text-muted-foreground">トレーニングジョブをリアルタイムで監視</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedJob(null)}>
            ジョブ一覧に戻る
          </Button>
        </div>
        <TrainingProgress job={job} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">LLMトレーニング</h2>
          <p className="text-muted-foreground">LoRAファインチューニングジョブを管理</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          新しいトレーニングジョブ
        </Button>
      </div>

      <div className="grid gap-4">
        {trainingJobs.map((job) => (
          <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <div>
                    <CardTitle className="text-lg">Job #{job.id}: {job.name}</CardTitle>
                    <CardDescription>
                      {job.model_name} • 作成日 {formatDate(job.created_at)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(job.status)}>
                    {job.status.toUpperCase()}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedJob(job.id)
                    }}
                  >
                    詳細を表示
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={job.status === 'running'}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteJob(job.id)
                    }}
                    title={job.status === 'running' ? '実行中のジョブは削除できません' : 'トレーニングジョブを削除'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Progress Bar for Running Jobs */}
                {(job.status === 'running' || job.status === 'completed') && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>進捗</span>
                      <span>{job.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>エポック {job.current_epoch} / {job.total_epochs}</span>
                      {job.loss && <span>損失: {job.loss.toFixed(4)}</span>}
                    </div>
                  </div>
                )}

                {/* Job Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">データセットID:</span>
                    <div className="font-medium">{job.dataset_id}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">LoRAランク:</span>
                    <div className="font-medium">{job.lora_config.r}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">学習率:</span>
                    <div className="font-medium">{job.training_config.learning_rate}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">バッチサイズ:</span>
                    <div className="font-medium">{job.training_config.batch_size}</div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {job.started_at && (
                    <span>開始: {formatDate(job.started_at)}</span>
                  )}
                  {job.completed_at && (
                    <span>完了: {formatDate(job.completed_at)}</span>
                  )}
                </div>

                {/* Error Message */}
                {job.error_message && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    エラー: {job.error_message}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {trainingJobs.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Play className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">トレーニングジョブがありません</h3>
              <p className="text-muted-foreground mb-4 text-center">
                最初のLoRAファインチューニングジョブを開始してください
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                トレーニングジョブを作成
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}