'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ChevronLeft, ChevronRight, FileText, Database, X } from 'lucide-react'
import { datasetsApi } from '@/lib/api'
import { Dataset } from '@/types'

interface DatasetDetailModalProps {
  dataset: Dataset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DatasetExample {
  instruction?: string
  input?: string
  question?: string
  output?: string
  answer?: string
  response?: string
}

export function DatasetDetailModal({ dataset, open, onOpenChange }: DatasetDetailModalProps) {
  const [examples, setExamples] = useState<DatasetExample[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalExamples, setTotalExamples] = useState(0)
  const examplesPerPage = 5

  useEffect(() => {
    if (dataset && open) {
      loadDatasetData()
    }
  }, [dataset, open, currentPage])

  const loadDatasetData = async () => {
    if (!dataset) return

    try {
      setLoading(true)
      const offset = currentPage * examplesPerPage
      const response = await datasetsApi.getData(dataset.id, examplesPerPage, offset)
      setExamples(response.data || [])
      setTotalExamples(response.total || dataset.size)
    } catch (error) {
      console.error('Failed to load dataset data:', error)
      setExamples([])
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    const maxPage = Math.ceil(totalExamples / examplesPerPage) - 1
    if (currentPage < maxPage) {
      setCurrentPage(currentPage + 1)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'instruction': return <FileText className="h-4 w-4" />
      case 'chat': return <Database className="h-4 w-4" />
      case 'completion': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatExample = (example: DatasetExample) => {
    // Handle different field names
    const instruction = example.instruction || example.input || example.question || ''
    const output = example.output || example.answer || example.response || ''
    
    return { instruction, output }
  }

  const totalPages = Math.ceil(totalExamples / examplesPerPage)
  const startIndex = currentPage * examplesPerPage + 1
  const endIndex = Math.min((currentPage + 1) * examplesPerPage, totalExamples)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white shadow-xl border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {dataset && getTypeIcon(dataset.type)}
              <CardTitle>{dataset?.name || 'データセット詳細'}</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {dataset?.description && (
            <CardDescription>{dataset.description}</CardDescription>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground px-6 pb-2">
            <Badge variant="secondary">{dataset?.type}</Badge>
            <span>総件数: {totalExamples}</span>
            <span>作成日: {dataset?.created_at ? new Date(dataset.created_at).toLocaleDateString('ja-JP') : '-'}</span>
          </div>
        </CardHeader>
        <CardContent>

        <div className="space-y-4">
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {startIndex} - {endIndex} / {totalExamples} 件
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  前へ
                </Button>
                <span className="text-sm">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                >
                  次へ
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Examples List */}
          <div className="h-[400px] w-full border rounded-lg p-4 overflow-y-auto bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">読み込み中...</span>
              </div>
            ) : examples.length > 0 ? (
              <div className="space-y-4">
                {examples.map((example, index) => {
                  const { instruction, output } = formatExample(example)
                  const globalIndex = currentPage * examplesPerPage + index + 1
                  
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-2 bg-white shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <span>例 {globalIndex}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-semibold text-blue-600">指示/質問:</label>
                          <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            {instruction || '(空)'}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-green-600">出力/回答:</label>
                          <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm">
                            {output || '(空)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                データが見つかりません
              </div>
            )}
          </div>

          {/* Bottom Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </Button>
              <span className="text-sm px-4">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}