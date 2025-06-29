'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus, Bot } from 'lucide-react'
import { ChatSessionList } from './ChatSessionList'
import { ChatInterface } from './ChatInterface'
import { NewSessionDialog } from './NewSessionDialog'

interface TrainingJob {
  id: number
  name: string
  model_name: string
  completed_at: string
  model_path: string
}

interface ChatSession {
  id: number
  name: string
  job_id: number
  model_path: string
  settings: any
  created_at: string
  updated_at: string
}

export function ChatManager() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [completedJobs, setCompletedJobs] = useState<TrainingJob[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
    loadCompletedJobs()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/sessions')
      if (response.ok) {
        const sessionsData = await response.json()
        setSessions(sessionsData)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const loadCompletedJobs = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/completed-jobs')
      if (response.ok) {
        const jobsData = await response.json()
        setCompletedJobs(jobsData)
        console.log('Loaded completed jobs:', jobsData)
      } else {
        console.error('Failed to load completed jobs:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load completed jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (sessionData: { name: string; job_id: number; settings?: any }) => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (response.ok) {
        const newSession = await response.json()
        setSessions([...sessions, newSession])
        setSelectedSession(newSession)
        setShowNewSessionDialog(false)
      } else {
        console.error('Failed to create session')
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null)
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (completedJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>Ollama統合</CardTitle>
          </div>
          <CardDescription>
            ファインチューニング済みモデルとのチャット
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-muted-foreground">
              チャットを開始するには、まず訓練を完了したモデルが必要です。
            </div>
            <div className="text-sm text-muted-foreground">
              「訓練」タブでLoRAファインチューニングを完了してから、こちらに戻ってきてください。
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ollama統合</h2>
          <p className="text-muted-foreground">ファインチューニング済みモデルとチャット</p>
        </div>
        <Button onClick={() => setShowNewSessionDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新しいセッション
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ChatSessionList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>
        
        <div className="lg:col-span-3">
          {selectedSession ? (
            <ChatInterface session={selectedSession} />
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium">チャットセッションを選択</h3>
                    <p className="text-muted-foreground">
                      左側からセッションを選択するか、新しいセッションを作成してください
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showNewSessionDialog && (
        <NewSessionDialog
          isOpen={showNewSessionDialog}
          onClose={() => setShowNewSessionDialog(false)}
          onCreateSession={handleCreateSession}
          completedJobs={completedJobs}
        />
      )}
    </div>
  )
}