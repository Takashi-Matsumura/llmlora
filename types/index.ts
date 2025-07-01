export interface Dataset {
  id: number
  name: string
  description?: string
  type: 'instruction' | 'chat' | 'completion'
  size: number
  created_at: string
  updated_at: string
}

export interface OllamaModel {
  name: string
  size: number
  digest: string
  modified_at: string
}

export interface LoRAConfig {
  r: number
  alpha: number
  dropout: number
  target_modules: string[]
}

export interface TrainingConfig {
  learning_rate: number
  num_epochs: number
  batch_size: number
  max_length: number
  gradient_accumulation_steps: number
  warmup_ratio: number
  weight_decay: number
  logging_steps: number
  save_steps: number
}

export interface TrainingJob {
  id: number
  name: string
  model_name: string
  dataset_id: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  lora_config: LoRAConfig
  training_config: TrainingConfig
  progress: number
  current_epoch: number
  total_epochs: number
  loss?: number
  created_at: string
  started_at?: string
  completed_at?: string
  error_message?: string
  
  // Detailed progress tracking
  current_stage?: string
  stage_progress?: number
  detailed_status?: string
  estimated_time_remaining?: number
}

export interface TrainingMetrics {
  step: number
  epoch: number
  loss: number
  learning_rate: number
  timestamp: string
}

export interface TrainingProgress {
  job_id: number
  status: string
  progress: number
  current_epoch: number
  total_epochs: number
  current_step: number
  total_steps: number
  loss?: number
  metrics: TrainingMetrics[]
}