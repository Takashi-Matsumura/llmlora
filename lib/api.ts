const API_BASE_URL = ''

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Determine timeout based on endpoint type
  const isTrainingRequest = endpoint.includes('/training/jobs')
  const isProgressRequest = endpoint.includes('/progress')
  const timeoutDuration = isProgressRequest ? 60000 : isTrainingRequest ? 180000 : 30000 // 1min for progress, 3min for training, 30s for others
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add timeout functionality
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)
  config.signal = controller.signal

  try {
    const response = await fetch(url, config)
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof ApiError) {
      throw error
    }
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, 'ネットワーク接続エラー: バックエンドサーバに接続できません')
    }
    
    if (error.name === 'AbortError') {
      throw new ApiError(0, 'リクエストがタイムアウトしました')
    }
    
    throw new ApiError(0, `ネットワークエラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Dataset API
export const datasetsApi = {
  list: () => apiRequest<any[]>('/api/datasets/'),
  
  get: (id: number) => apiRequest<any>(`/api/datasets/${id}/`),
  
  create: (dataset: any) => apiRequest<any>('/api/datasets/', {
    method: 'POST',
    body: JSON.stringify(dataset),
  }),
  
  upload: (file: File, name?: string, description?: string, type?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name) formData.append('name', name)
    if (description) formData.append('description', description)
    if (type) formData.append('dataset_type', type)
    
    return apiRequest<any>('/api/datasets/upload/', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    })
  },
  
  delete: (id: number) => apiRequest<void>(`/api/datasets/${id}/`, {
    method: 'DELETE',
  }),
  
  getData: (id: number, limit = 100, offset = 0) => 
    apiRequest<any>(`/api/datasets/${id}/data/?limit=${limit}&offset=${offset}`),
}

// Models API
export const modelsApi = {
  list: () => apiRequest<{ models: any[] }>('/api/models/'),
  
  pull: (modelName: string) => apiRequest<any>(`/api/models/pull/${modelName}/`, {
    method: 'POST',
  }),
  
  check: (modelName: string) => apiRequest<{ exists: boolean }>(`/api/models/check/${modelName}/`),
  
  health: () => apiRequest<{ status: string }>('/api/models/health/'),
}

// Training API
export const trainingApi = {
  createJob: (job: any) => apiRequest<any>('/api/training/jobs/', {
    method: 'POST',
    body: JSON.stringify(job),
  }),
  
  listJobs: () => apiRequest<any[]>('/api/training/jobs/'),
  
  getJob: (id: number) => apiRequest<any>(`/api/training/jobs/${id}/`),
  
  getProgress: (id: number) => apiRequest<any>(`/api/training/jobs/${id}/progress/`),
  
  cancelJob: (id: number) => apiRequest<any>(`/api/training/jobs/${id}/cancel/`, {
    method: 'POST',
  }),
  
  deleteJob: (id: number) => apiRequest<void>(`/api/training/jobs/${id}/`, {
    method: 'DELETE',
  }),
}

export { ApiError }