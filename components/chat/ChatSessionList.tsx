'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Trash2 } from 'lucide-react'

interface ChatSession {
  id: number
  name: string
  job_id: number
  model_path: string
  settings: any
  created_at: string
  updated_at: string
}

interface ChatSessionListProps {
  sessions: ChatSession[]
  selectedSession: ChatSession | null
  onSelectSession: (session: ChatSession) => void
  onDeleteSession: (sessionId: number) => void
}

export function ChatSessionList({
  sessions,
  selectedSession,
  onSelectSession,
  onDeleteSession
}: ChatSessionListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          チャットセッション
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              セッションがありません
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-accent transition-colors ${
                  selectedSession?.id === session.id ? 'bg-accent' : ''
                }`}
                onClick={() => onSelectSession(session)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {session.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}