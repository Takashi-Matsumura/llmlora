'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Settings, Play, Brain, Server, Activity } from 'lucide-react'
import { DatasetManager } from '@/components/datasets/DatasetManager'
import { TrainingManager } from '@/components/training/TrainingManager'
import { ChatManager } from '@/components/chat/ChatManager'

type Tab = 'overview' | 'datasets' | 'training' | 'ollama'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs = [
    { id: 'overview' as Tab, label: 'ダッシュボード', icon: Activity },
    { id: 'datasets' as Tab, label: 'データセット作成', icon: Database },
    { id: 'training' as Tab, label: 'LLMトレーニング', icon: Brain },
    { id: 'ollama' as Tab, label: 'チャットシミュレーション', icon: Server },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'datasets':
        return <DatasetManager />
      case 'training':
        return <TrainingManager />
      case 'ollama':
        return <ChatManager />
      default:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">LLM LoRA ファインチューニングApp</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                LoRA（Low-Rank Adaptation）を使用したファインチューニング学習
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <CardTitle>データセット作成</CardTitle>
                  </div>
                  <CardDescription>
                    JSON または CSV 形式でファインチューニング用のデータセットを作成・管理
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveTab('datasets')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
                  >
                    データセットを作成
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    <CardTitle>LLMトレーニング</CardTitle>
                  </div>
                  <CardDescription>
                    ローカルLLMでLoRAファインチューニングジョブを作成・実行
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveTab('training')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
                  >
                    トレーニングを開始
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    <CardTitle>チャットシミュレーション</CardTitle>
                  </div>
                  <CardDescription>
                    ファインチューニング済みモデルとオリジナルモデルでチャットシミュレーション
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setActiveTab('ollama')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors"
                  >
                    シミュレーションを開始
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>主要機能</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      LoRAファインチューニングプラットフォーム
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      データセット作成・管理機能
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      リアルタイムトレーニング進捗監視
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      チャットシミュレーション機能
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                      Ollama統合でローカルLLMサポート
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>使用手順</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                      <span>データセット作成でファインチューニング用データをアップロード</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                      <span>LLMトレーニングでLoRAパラメータを設定しトレーニングを実行</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                      <span>リアルタイムでトレーニング進捗を監視・管理</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">4</span>
                      <span>チャットシミュレーションでファインチューニング済みモデルをテスト</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex gap-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  )
}