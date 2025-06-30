'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Cog, Info } from 'lucide-react'
import { TrainingConfig } from '@/types'

interface TrainingConfigFormProps {
  config: TrainingConfig
  onChange: (config: TrainingConfig) => void
}

export function TrainingConfigForm({ config, onChange }: TrainingConfigFormProps) {
  const updateConfig = (updates: Partial<TrainingConfig>) => {
    onChange({ ...config, ...updates })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cog className="h-5 w-5" />
          <CardTitle>トレーニング設定</CardTitle>
        </div>
        <CardDescription>
          最適な性能のためのトレーニングハイパーパラメータを設定
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Rate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="learning-rate">学習率</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="learning-rate"
            type="number"
            step="0.00001"
            min="0.00001"
            max="0.01"
            value={config.learning_rate}
            onChange={(e) => updateConfig({ learning_rate: parseFloat(e.target.value) || 0.0002 })}
          />
          <p className="text-xs text-muted-foreground">
            パラメータ更新のステップサイズ。一般的な範囲: 1e-5 から 1e-3。2e-4から開始。
          </p>
        </div>

        {/* Number of Epochs */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="num-epochs">エポック数</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="num-epochs"
              min={1}
              max={100}
              step={1}
              value={[config.num_epochs]}
              onValueChange={(value) => updateConfig({ num_epochs: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>現在: {config.num_epochs}</span>
              <span>100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            トレーニングデータセットを完全に通す回数。
          </p>
        </div>

        {/* Batch Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="batch-size">バッチサイズ</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="batch-size"
              min={1}
              max={128}
              step={1}
              value={[config.batch_size]}
              onValueChange={(value) => updateConfig({ batch_size: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>現在: {config.batch_size}</span>
              <span>128</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            モデルパラメータを更新する前に処理するサンプル数。高い値 = より安定した勾配、より多くのメモリ。
          </p>
        </div>

        {/* Max Length */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="max-length">最大シーケンス長</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="max-length"
              min={64}
              max={4096}
              step={64}
              value={[config.max_length]}
              onValueChange={(value) => updateConfig({ max_length: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>64</span>
              <span>現在: {config.max_length}</span>
              <span>4096</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            入力シーケンスの最大トークン数。長い = より多くの文脈、より多くのメモリ。
          </p>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="font-semibold">詳細設定</h4>
          
          {/* Gradient Accumulation Steps */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="grad-accum">勾配蓄積ステップ数</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <Slider
              id="grad-accum"
              min={1}
              max={32}
              step={1}
              value={[config.gradient_accumulation_steps]}
              onValueChange={(value) => updateConfig({ gradient_accumulation_steps: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>現在: {config.gradient_accumulation_steps}</span>
              <span>32</span>
            </div>
            <p className="text-xs text-muted-foreground">
              複数のミニバッチにわたって勾配を蓄積。実効バッチサイズ = バッチサイズ × 勾配蓄積ステップ数。
            </p>
          </div>

          {/* Warmup Ratio */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="warmup-ratio">ウォームアップ比率</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <Slider
              id="warmup-ratio"
              min={0}
              max={1}
              step={0.01}
              value={[config.warmup_ratio]}
              onValueChange={(value) => updateConfig({ warmup_ratio: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0.0</span>
              <span>現在: {config.warmup_ratio.toFixed(2)}</span>
              <span>1.0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              学習率を0から目標値までウォームアップするトレーニングステップの割合。
            </p>
          </div>

          {/* Weight Decay */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="weight-decay">重み減衰</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <Slider
              id="weight-decay"
              min={0}
              max={1}
              step={0.001}
              value={[config.weight_decay]}
              onValueChange={(value) => updateConfig({ weight_decay: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0.0</span>
              <span>現在: {config.weight_decay.toFixed(3)}</span>
              <span>1.0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              L2正則化係数。過学習の防止に役立ちます。
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label>クイックプリセット</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateConfig({
                learning_rate: 5e-5,
                num_epochs: 1,
                batch_size: 2,
                max_length: 512,
                gradient_accumulation_steps: 4,
                warmup_ratio: 0.1,
                weight_decay: 0.01
              })}
              className="p-2 text-sm border rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              高速テスト
            </button>
            <button
              type="button"
              onClick={() => updateConfig({
                learning_rate: 2e-4,
                num_epochs: 3,
                batch_size: 4,
                max_length: 512,
                gradient_accumulation_steps: 2,
                warmup_ratio: 0.1,
                weight_decay: 0.01
              })}
              className="p-2 text-sm border rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              バランス
            </button>
            <button
              type="button"
              onClick={() => updateConfig({
                learning_rate: 1e-4,
                num_epochs: 5,
                batch_size: 8,
                max_length: 1024,
                gradient_accumulation_steps: 1,
                warmup_ratio: 0.15,
                weight_decay: 0.05
              })}
              className="p-2 text-sm border rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              高品質
            </button>
            <button
              type="button"
              onClick={() => updateConfig({
                learning_rate: 5e-5,
                num_epochs: 10,
                batch_size: 1,
                max_length: 2048,
                gradient_accumulation_steps: 8,
                warmup_ratio: 0.2,
                weight_decay: 0.1
              })}
              className="p-2 text-sm border rounded hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              最高品質
            </button>
          </div>
        </div>

        {/* Training Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">トレーニングサマリー</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>学習率: {config.learning_rate}</div>
            <div>エポック: {config.num_epochs}</div>
            <div>バッチサイズ: {config.batch_size}</div>
            <div>最大長: {config.max_length}</div>
            <div>実効バッチ: {config.batch_size * config.gradient_accumulation_steps}</div>
            <div>ウォームアップ: {(config.warmup_ratio * 100).toFixed(1)}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}