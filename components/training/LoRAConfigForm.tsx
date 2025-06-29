'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Settings, Info } from 'lucide-react'
import { LoRAConfig } from '@/types'

interface LoRAConfigFormProps {
  config: LoRAConfig
  onChange: (config: LoRAConfig) => void
}

export function LoRAConfigForm({ config, onChange }: LoRAConfigFormProps) {
  const updateConfig = (updates: Partial<LoRAConfig>) => {
    onChange({ ...config, ...updates })
  }

  const handleTargetModulesChange = (value: string) => {
    const modules = value.split(',').map(m => m.trim()).filter(m => m.length > 0)
    updateConfig({ target_modules: modules })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>LoRA設定</CardTitle>
        </div>
        <CardDescription>
          効率的なファインチューニングのためのLoRA（Low-Rank Adaptation）パラメータを設定
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rank (r) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="lora-rank">ランク (r)</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="lora-rank"
              min={1}
              max={512}
              step={1}
              value={[config.r]}
              onValueChange={(value) => updateConfig({ r: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>現在: {config.r}</span>
              <span>512</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            低いランク = パラメータ少、高速訓練、表現力低。高いランク = パラメータ多、性能向上。
          </p>
        </div>

        {/* Alpha */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="lora-alpha">アルファ</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="lora-alpha"
              min={1}
              max={1024}
              step={1}
              value={[config.alpha]}
              onValueChange={(value) => updateConfig({ alpha: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>現在: {config.alpha}</span>
              <span>1024</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            LoRA重みのスケーリング係数。最適な性能のためには通常ランクの2倍に設定。
          </p>
        </div>

        {/* Dropout */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="lora-dropout">ドロップアウト</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Slider
              id="lora-dropout"
              min={0}
              max={1}
              step={0.01}
              value={[config.dropout]}
              onValueChange={(value) => updateConfig({ dropout: value[0] })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0.0</span>
              <span>現在: {config.dropout.toFixed(2)}</span>
              <span>1.0</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            LoRA層のドロップアウト確率。過学習の防止に役立ちます。
          </p>
        </div>

        {/* Target Modules */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="target-modules">対象モジュール</Label>
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            id="target-modules"
            value={config.target_modules.join(', ')}
            onChange={(e) => handleTargetModulesChange(e.target.value)}
            placeholder="q_proj, v_proj, k_proj, o_proj"
          />
          <p className="text-xs text-muted-foreground">
            LoRAを適用するモジュールのカンマ区切りリスト。一般的な選択: q_proj, v_proj, k_proj, o_proj, gate_proj, up_proj, down_proj
          </p>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label>クイックプリセット</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateConfig({ r: 4, alpha: 8, dropout: 0.1, target_modules: ['q_proj', 'v_proj'] })}
              className="p-2 text-sm border rounded hover:bg-accent"
            >
              保守的 (r=4)
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ r: 8, alpha: 16, dropout: 0.1, target_modules: ['q_proj', 'v_proj'] })}
              className="p-2 text-sm border rounded hover:bg-accent"
            >
              バランス (r=8)
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ r: 16, alpha: 32, dropout: 0.1, target_modules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'] })}
              className="p-2 text-sm border rounded hover:bg-accent"
            >
              性能重視 (r=16)
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ r: 32, alpha: 64, dropout: 0.05, target_modules: ['q_proj', 'v_proj', 'k_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'] })}
              className="p-2 text-sm border rounded hover:bg-accent"
            >
              最大 (r=32)
            </button>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">設定サマリー</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>ランク: {config.r}</div>
            <div>アルファ: {config.alpha}</div>
            <div>ドロップアウト: {config.dropout.toFixed(2)}</div>
            <div>モジュール: {config.target_modules.length}</div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            推定訓練可能パラメータ: 約{Math.round((config.r * 2 * config.target_modules.length * 4096) / 1000)}K
          </div>
        </div>
      </CardContent>
    </Card>
  )
}