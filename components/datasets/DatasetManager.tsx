'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, Eye, FileText, Database } from 'lucide-react'
import { useStore } from '@/stores/useStore'
import { datasetsApi } from '@/lib/api'
import { DatasetDetailModal } from './DatasetDetailModal'

export function DatasetManager() {
  const { datasets, setDatasets, addDataset, removeDataset, setError, setIsLoading } = useStore()
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadType, setUploadType] = useState<'instruction' | 'chat' | 'completion'>('instruction')
  const [selectedDatasetForView, setSelectedDatasetForView] = useState<any>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [jsonData, setJsonData] = useState(`[
  {
    "instruction": "沖縄一高い山は？",
    "output": "於茂登岳（おもとだけ）です。沖縄県石垣市にある標高526mの山です。"
  },
  {
    "instruction": "富士山の高さは？",
    "output": "富士山の高さは3,776メートルです。日本で最も高い山として知られています。"
  },
  {
    "instruction": "日本の首都は？",
    "output": "日本の首都は東京です。人口約1,400万人の世界最大級の都市圏を形成しています。"
  },
  {
    "instruction": "桜が咲く季節は？",
    "output": "桜は春に咲きます。一般的に3月下旬から5月上旬にかけて、地域によって開花時期が異なります。"
  },
  {
    "instruction": "寿司の代表的なネタは？",
    "output": "寿司の代表的なネタには、マグロ、サーモン、エビ、イカ、ウニ、いくらなどがあります。"
  },
  {
    "instruction": "日本の通貨は？",
    "output": "日本の通貨は円（えん、JPY）です。硬貨は1円、5円、10円、50円、100円、500円があります。"
  },
  {
    "instruction": "温泉の効能は？",
    "output": "温泉には疲労回復、血行促進、筋肉痛の緩和、ストレス解消などの効能があります。"
  },
  {
    "instruction": "新幹線の最高速度は？",
    "output": "東海道新幹線の最高速度は320km/hです。のぞみ号が最も速く運行しています。"
  },
  {
    "instruction": "日本の四季の特徴は？",
    "output": "日本には春（桜）、夏（暑さと湿度）、秋（紅葉）、冬（雪）という明確な四季があります。"
  },
  {
    "instruction": "お茶の種類は？",
    "output": "日本茶には緑茶、抹茶、ほうじ茶、玄米茶、麦茶などがあります。"
  },
  {
    "instruction": "相撲の階級は？",
    "output": "相撲の階級は横綱、大関、関脇、小結、前頭などがあり、横綱が最高位です。"
  },
  {
    "instruction": "日本の面積は？",
    "output": "日本の面積は約37.8万平方キロメートルで、世界第62位の大きさです。"
  },
  {
    "instruction": "畳の単位は？",
    "output": "畳の単位は「帖」または「畳」で数えます。6畳間、8畳間などと表現します。"
  },
  {
    "instruction": "富士五湖とは？",
    "output": "富士五湖は山中湖、河口湖、西湖、精進湖、本栖湖の5つの湖です。"
  },
  {
    "instruction": "日本酒の種類は？",
    "output": "日本酒には純米酒、本醸造酒、吟醸酒、大吟醸酒などの種類があります。"
  },
  {
    "instruction": "歌舞伎の特徴は？",
    "output": "歌舞伎は日本の伝統芸能で、華やかな化粧と衣装、独特の演技が特徴です。"
  },
  {
    "instruction": "日本の人口は？",
    "output": "日本の人口は約1億2,500万人です。少子高齢化が進んでいます。"
  },
  {
    "instruction": "忍者の発祥地は？",
    "output": "忍者の発祥地は伊賀（三重県）と甲賀（滋賀県）が有名です。"
  },
  {
    "instruction": "日本の国花は？",
    "output": "日本の国花は桜と菊です。桜は春の象徴、菊は皇室の紋章として使われています。"
  },
  {
    "instruction": "地震の震度階級は？",
    "output": "地震の震度は0から7まであり、震度7が最大です。震度5弱以上で強い揺れとなります。"
  },
  {
    "instruction": "おでんの具材は？",
    "output": "おでんの代表的な具材には大根、卵、こんにゃく、ちくわ、はんぺんなどがあります。"
  }
]`)

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

  const handleJsonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jsonData.trim()) return

    try {
      setIsLoading(true)
      // Parse JSON to validate format
      JSON.parse(jsonData)
      
      // Create a blob from JSON data
      const timestamp = new Date().toLocaleDateString('ja-JP').replace(/\//g, '')
      const datasetName = `JSONデータ${timestamp}`
      const fileName = `json_data_${timestamp}.json`
      
      const blob = new Blob([jsonData], { type: 'application/json' })
      const file = new File([blob], fileName, { type: 'application/json' })
      
      const dataset = await datasetsApi.upload(
        file,
        datasetName,
        'JSON形式で手動入力されたデータセット',
        'instruction'
      )
      addDataset(dataset)
      setShowUpload(false)
      setJsonData(`[
  {
    "instruction": "沖縄一高い山は？",
    "output": "於茂登岳（おもとだけ）です。沖縄県石垣市にある標高526mの山です。"
  },
  {
    "instruction": "富士山の高さは？",
    "output": "富士山の高さは3,776メートルです。日本で最も高い山として知られています。"
  },
  {
    "instruction": "日本の首都は？",
    "output": "日本の首都は東京です。人口約1,400万人の世界最大級の都市圏を形成しています。"
  },
  {
    "instruction": "桜が咲く季節は？",
    "output": "桜は春に咲きます。一般的に3月下旬から5月上旬にかけて、地域によって開花時期が異なります。"
  },
  {
    "instruction": "寿司の代表的なネタは？",
    "output": "寿司の代表的なネタには、マグロ、サーモン、エビ、イカ、ウニ、いくらなどがあります。"
  },
  {
    "instruction": "日本の通貨は？",
    "output": "日本の通貨は円（えん、JPY）です。硬貨は1円、5円、10円、50円、100円、500円があります。"
  },
  {
    "instruction": "温泉の効能は？",
    "output": "温泉には疲労回復、血行促進、筋肉痛の緩和、ストレス解消などの効能があります。"
  },
  {
    "instruction": "新幹線の最高速度は？",
    "output": "東海道新幹線の最高速度は320km/hです。のぞみ号が最も速く運行しています。"
  },
  {
    "instruction": "日本の四季の特徴は？",
    "output": "日本には春（桜）、夏（暑さと湿度）、秋（紅葉）、冬（雪）という明確な四季があります。"
  },
  {
    "instruction": "お茶の種類は？",
    "output": "日本茶には緑茶、抹茶、ほうじ茶、玄米茶、麦茶などがあります。"
  },
  {
    "instruction": "相撲の階級は？",
    "output": "相撲の階級は横綱、大関、関脇、小結、前頭などがあり、横綱が最高位です。"
  },
  {
    "instruction": "日本の面積は？",
    "output": "日本の面積は約37.8万平方キロメートルで、世界第62位の大きさです。"
  },
  {
    "instruction": "畳の単位は？",
    "output": "畳の単位は「帖」または「畳」で数えます。6畳間、8畳間などと表現します。"
  },
  {
    "instruction": "富士五湖とは？",
    "output": "富士五湖は山中湖、河口湖、西湖、精進湖、本栖湖の5つの湖です。"
  },
  {
    "instruction": "日本酒の種類は？",
    "output": "日本酒には純米酒、本醸造酒、吟醸酒、大吟醸酒などの種類があります。"
  },
  {
    "instruction": "歌舞伎の特徴は？",
    "output": "歌舞伎は日本の伝統芸能で、華やかな化粧と衣装、独特の演技が特徴です。"
  },
  {
    "instruction": "日本の人口は？",
    "output": "日本の人口は約1億2,500万人です。少子高齢化が進んでいます。"
  },
  {
    "instruction": "忍者の発祥地は？",
    "output": "忍者の発祥地は伊賀（三重県）と甲賀（滋賀県）が有名です。"
  },
  {
    "instruction": "日本の国花は？",
    "output": "日本の国花は桜と菊です。桜は春の象徴、菊は皇室の紋章として使われています。"
  },
  {
    "instruction": "地震の震度階級は？",
    "output": "地震の震度は0から7まであり、震度7が最大です。震度5弱以上で強い揺れとなります。"
  },
  {
    "instruction": "おでんの具材は？",
    "output": "おでんの代表的な具材には大根、卵、こんにゃく、ちくわ、はんぺんなどがあります。"
  }
]`)
    } catch (error) {
      if (error instanceof SyntaxError) {
        setError('JSON形式が無効です。正しいJSON形式で入力してください。')
      } else {
        setError(error instanceof Error ? error.message : 'JSONデータの登録に失敗しました')
      }
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

  const handleViewDataset = (dataset: any) => {
    setSelectedDatasetForView(dataset)
    setShowDetailModal(true)
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
          <p className="text-muted-foreground">トレーニングデータセットの管理</p>
        </div>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
        >
          <Upload className="h-4 w-4 mr-2" />
          データセットの作成
        </Button>
      </div>

      {showUpload && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel - データセットアップロード */}
          <Card>
            <CardHeader>
              <CardTitle>ファイルのアップロード</CardTitle>
              <CardDescription>
                トレーニングデータを含むJSONまたはCSVファイルをアップロード
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
                    onChange={(e) => setUploadType(e.target.value as 'instruction' | 'chat' | 'completion')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="instruction">指示（とりあえずこれを選択）</option>
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

          {/* Right Panel - JSONデータの登録 */}
          <Card>
            <CardHeader>
              <CardTitle>JSONデータの登録</CardTitle>
              <CardDescription>
                JSON形式でトレーニングデータを直接入力
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJsonSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="jsonData">JSONデータ</Label>
                  <Textarea
                    id="jsonData"
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    placeholder="JSON形式でデータを入力してください..."
                    className="min-h-[300px] font-mono text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    例: [{'"instruction": "質問", "output": "回答"'}]
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
                  >
                    登録
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>
                    キャンセル
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDataset(dataset)
                    }}
                  >
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

      {/* Dataset Detail Modal */}
      <DatasetDetailModal
        dataset={selectedDatasetForView}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />
    </div>
  )
}