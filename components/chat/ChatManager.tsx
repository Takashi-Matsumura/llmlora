'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Plus } from 'lucide-react'
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
  job_id?: number
  model_name?: string
  model_path?: string
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

  const handleCreateSession = async (sessionData: { name: string; job_id?: number; model_name?: string; settings?: any }) => {
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
        const errorText = await response.text()
        console.error('Failed to create session:', response.status, errorText)
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
      } else {
        console.error('Failed to delete session:', response.status, response.statusText)
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

  // Always show the interface - Ollama models are available even without training jobs

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">チャットシミュレーション</h2>
        <p className="text-muted-foreground">ファインチューニング済みモデルとオリジナルモデルでチャット</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ChatSessionList
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
            onDeleteSession={handleDeleteSession}
            onCreateSession={() => setShowNewSessionDialog(true)}
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