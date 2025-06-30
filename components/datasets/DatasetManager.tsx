'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, Plus, Trash2, Eye, FileText, Database } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { datasetsApi } from '@/lib/api'
import { Dataset } from '@/types'

export function DatasetManager() {
  const { datasets, setDatasets, addDataset, removeDataset, setError, setIsLoading } = useStore()
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadType, setUploadType] = useState<'instruction' | 'chat' | 'completion'>('instruction')

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    try {
      setIsLoading(true)
      const data = await datasetsApi.list()
      setDatasets(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load datasets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return

    try {
      setIsLoading(true)
      const dataset = await datasetsApi.upload(
        uploadFile,
        uploadName || undefined,
        uploadDescription || undefined,
        uploadType
      )
      addDataset(dataset)
      setShowUpload(false)
      setUploadFile(null)
      setUploadName('')
      setUploadDescription('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload dataset')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDataset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return

    try {
      await datasetsApi.delete(id)
      removeDataset(id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete dataset')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'instruction': return <FileText className="h-4 w-4" />
      case 'chat': return <Database className="h-4 w-4" />
      case 'completion': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">データセット作成</h2>
          <p className="text-muted-foreground">訓練データセットを管理</p>
        </div>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          データセットをアップロード
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>データセットアップロード</CardTitle>
            <CardDescription>
              訓練データを含むJSONまたはCSVファイルをアップロード
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label htmlFor="file">ファイル</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">名前（オプション）</Label>
                <Input
                  id="name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="データセット名"
                />
              </div>

              <div>
                <Label htmlFor="description">説明（オプション）</Label>
                <Textarea
                  id="description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="データセットの説明"
                />
              </div>

              <div>
                <Label htmlFor="type">タイプ</Label>
                <select
                  id="type"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="instruction">指示</option>
                  <option value="chat">チャット</option>
                  <option value="completion">補完</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
                >
                  アップロード
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {datasets.map((dataset) => (
          <Card key={dataset.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getTypeIcon(dataset.type)}
                  <div>
                    <CardTitle className="text-lg">{dataset.name}</CardTitle>
                    {dataset.description && (
                      <CardDescription>{dataset.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteDataset(dataset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>タイプ: {dataset.type}</span>
                <span>サイズ: {dataset.size} 例</span>
                <span>作成日: {new Date(dataset.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {datasets.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">データセットがありません</h3>
              <p className="text-muted-foreground mb-4 text-center">
                ファインチューニングを開始するために最初のデータセットをアップロードしてください
              </p>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                データセットをアップロード
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}