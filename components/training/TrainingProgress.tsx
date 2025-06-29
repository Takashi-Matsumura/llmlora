'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Play, Pause, Square, Clock, Zap, TrendingDown, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { trainingApi, ApiError } from '@/lib/api'
import { TrainingJob, TrainingProgress as TrainingProgressType } from '@/types'

interface TrainingProgressProps {
  job: TrainingJob
}

export function TrainingProgress({ job }: TrainingProgressProps) {
  const { updateTrainingJob, trainingProgress, setTrainingProgress, setError } = useStore()
  const [isPolling, setIsPolling] = useState(job.status === 'running')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 10 // Increased for training jobs

  const progress = trainingProgress[job.id]

  useEffect(() => {
    if (job.status === 'running' || job.status === 'pending') {
      startPolling()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [job.status, job.id])

  const startPolling = () => {
    if (intervalRef.current) return

    const poll = async () => {
      try {
        const [jobData, progressData] = await Promise.all([
          trainingApi.getJob(job.id),
          trainingApi.getProgress(job.id)
        ])

        updateTrainingJob(job.id, jobData)
        setTrainingProgress(job.id, progressData)
        
        // Reset connection error and retry count on success
        setConnectionError(null)
        setRetryCount(0)

        if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'cancelled') {
          stopPolling()
        }
      } catch (error) {
        console.error('Failed to fetch training progress:', error)
        
        if (error instanceof ApiError) {
          setConnectionError(error.message)
        } else {
          setConnectionError('接続エラーが発生しました')
        }
        
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        
        // Stop polling after max retries for network errors
        if (newRetryCount >= maxRetries) {
          console.error(`Max retries (${maxRetries}) reached, stopping polling`)
          stopPolling()
          setError('ネットワークエラーが継続しています。モデルのダウンロードに時間がかかっている可能性があります。しばらく待ってから「再接続」ボタンを押してください。')
        }
      }
    }

    // Initial poll
    poll()
    
    // Set up interval with adaptive frequency based on job status
    let interval
    if (job.status === 'running') {
      // More frequent polling during training
      interval = Math.min(2000 * Math.pow(1.1, retryCount), 5000) // 2s, 2.2s, 2.4s, ... 5s max during training
    } else {
      // Less frequent for other states
      interval = Math.min(5000 * Math.pow(1.2, retryCount), 15000) // 5s, 6s, 7.2s, ... 15s max
    }
    intervalRef.current = setInterval(poll, interval)
  }

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }

  const retryConnection = () => {
    setConnectionError(null)
    setRetryCount(0)
    stopPolling() // Stop existing polling first
    if (job.status === 'running' || job.status === 'pending') {
      startPolling()
    }
  }

  const handleCancel = async () => {
    if (!confirm('このトレーニングジョブをキャンセルしますか？')) return

    try {
      await trainingApi.cancelJob(job.id)
      updateTrainingJob(job.id, { status: 'cancelled' })
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError('ジョブのキャンセルに失敗しました')
      }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'running': return <Zap className="h-4 w-4" />
      case 'completed': return <TrendingDown className="h-4 w-4" />
      case 'failed': return <AlertCircle className="h-4 w-4" />
      case 'cancelled': return <Square className="h-4 w-4" />
      default: return null
    }
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const chartData = progress?.metrics?.slice(-50).map(metric => ({
    step: metric.step,
    loss: metric.loss,
    learning_rate: metric.learning_rate
  })) || []

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(job.status)}
              {job.name}
            </CardTitle>
            <CardDescription>
              Model: {job.model_name} • Dataset ID: {job.dataset_id}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {connectionError && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <WifiOff className="h-3 w-3 mr-1" />
                接続エラー
              </Badge>
            )}
            {!connectionError && isPolling && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Wifi className="h-3 w-3 mr-1" />
                ライブ
              </Badge>
            )}
            <Badge className={getStatusColor(job.status)}>
              {job.status.toUpperCase()}
            </Badge>
            {job.status === 'running' && (
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{job.progress.toFixed(1)}%</span>
          </div>
          <Progress value={job.progress} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Epoch {job.current_epoch} / {job.total_epochs}</span>
            {progress && (
              <span>Step {progress.current_step} / {progress.total_steps}</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current Loss</p>
            <p className="text-2xl font-bold">
              {job.loss ? job.loss.toFixed(4) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Learning Rate</p>
            <p className="text-2xl font-bold">
              {progress?.metrics?.length ? progress.metrics[progress.metrics.length - 1].learning_rate.toExponential(2) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Duration</p>
            <p className="text-2xl font-bold">
              {job.started_at ? formatDuration(job.started_at, job.completed_at) : 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">ETA</p>
            <p className="text-2xl font-bold">
              {job.status === 'running' && job.started_at && job.progress > 0 ? (
                (() => {
                  const elapsed = new Date().getTime() - new Date(job.started_at).getTime()
                  const estimatedTotal = (elapsed / job.progress) * 100
                  const remaining = Math.max(0, estimatedTotal - elapsed)
                  const eta = Math.floor(remaining / 1000 / 60)
                  return `${eta}m`
                })()
              ) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Loss Chart */}
        {chartData.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Training Loss</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="loss" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Configuration Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold">LoRA Configuration</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Rank:</span>
                <span>{job.lora_config.r}</span>
              </div>
              <div className="flex justify-between">
                <span>Alpha:</span>
                <span>{job.lora_config.alpha}</span>
              </div>
              <div className="flex justify-between">
                <span>Dropout:</span>
                <span>{job.lora_config.dropout}</span>
              </div>
              <div className="flex justify-between">
                <span>Target Modules:</span>
                <span>{job.lora_config.target_modules.join(', ')}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Training Configuration</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Learning Rate:</span>
                <span>{job.training_config.learning_rate}</span>
              </div>
              <div className="flex justify-between">
                <span>Batch Size:</span>
                <span>{job.training_config.batch_size}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Length:</span>
                <span>{job.training_config.max_length}</span>
              </div>
              <div className="flex justify-between">
                <span>Weight Decay:</span>
                <span>{job.training_config.weight_decay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Error */}
        {connectionError && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-orange-800 mb-2">接続エラー</h4>
                <p className="text-sm text-orange-700 mb-2">{connectionError}</p>
                <p className="text-xs text-orange-600">再試行回数: {Math.min(retryCount, maxRetries)}/{maxRetries}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryConnection}
              >
                再接続
              </Button>
            </div>
          </div>
        )}

        {/* Training Status/Error Message */}
        {job.error_message && (
          <div className={`p-4 border rounded-lg ${
            job.error_message.includes('中...') || job.error_message.includes('準備中') || job.error_message.includes('ロード中') || job.error_message.includes('ダウンロード中') || job.error_message.includes('適用中')
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              job.error_message.includes('中...') || job.error_message.includes('準備中') || job.error_message.includes('ロード中') || job.error_message.includes('ダウンロード中') || job.error_message.includes('適用中')
                ? 'text-blue-800'
                : 'text-red-800'
            }`}>
              {job.error_message.includes('中...') || job.error_message.includes('準備中') || job.error_message.includes('ロード中') || job.error_message.includes('ダウンロード中') || job.error_message.includes('適用中')
                ? '初期化中'
                : 'トレーニングエラー'
              }
            </h4>
            <p className={`text-sm ${
              job.error_message.includes('中...') || job.error_message.includes('準備中') || job.error_message.includes('ロード中') || job.error_message.includes('ダウンロード中') || job.error_message.includes('適用中')
                ? 'text-blue-700'
                : 'text-red-700'
            }`}>
              {job.error_message}
            </p>
            {job.error_message.includes('ダウンロード中') && (
              <p className="text-xs text-blue-600 mt-1">
                初回モデルダウンロードには数分かかる場合があります。
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}