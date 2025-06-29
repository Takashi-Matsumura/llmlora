import { create } from 'zustand'
import { Dataset, OllamaModel, TrainingJob, TrainingProgress } from '@/types'

interface AppState {
  // Datasets
  datasets: Dataset[]
  setDatasets: (datasets: Dataset[]) => void
  addDataset: (dataset: Dataset) => void
  removeDataset: (id: number) => void

  // Models
  models: OllamaModel[]
  setModels: (models: OllamaModel[]) => void
  selectedModel: string | null
  setSelectedModel: (model: string | null) => void

  // Training jobs
  trainingJobs: TrainingJob[]
  setTrainingJobs: (jobs: TrainingJob[]) => void
  addTrainingJob: (job: TrainingJob) => void
  updateTrainingJob: (id: number, updates: Partial<TrainingJob>) => void

  // Training progress
  trainingProgress: { [jobId: number]: TrainingProgress }
  setTrainingProgress: (jobId: number, progress: TrainingProgress) => void

  // UI state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  // Datasets
  datasets: [],
  setDatasets: (datasets) => set({ datasets }),
  addDataset: (dataset) => set((state) => ({ datasets: [...state.datasets, dataset] })),
  removeDataset: (id) => set((state) => ({ 
    datasets: state.datasets.filter(d => d.id !== id) 
  })),

  // Models
  models: [],
  setModels: (models) => set({ models }),
  selectedModel: null,
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Training jobs
  trainingJobs: [],
  setTrainingJobs: (trainingJobs) => set({ trainingJobs }),
  addTrainingJob: (job) => set((state) => ({ 
    trainingJobs: [...state.trainingJobs, job] 
  })),
  updateTrainingJob: (id, updates) => set((state) => ({
    trainingJobs: state.trainingJobs.map(job => 
      job.id === id ? { ...job, ...updates } : job
    )
  })),

  // Training progress
  trainingProgress: {},
  setTrainingProgress: (jobId, progress) => set((state) => ({
    trainingProgress: { ...state.trainingProgress, [jobId]: progress }
  })),

  // UI state
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  error: null,
  setError: (error) => set({ error }),
}))