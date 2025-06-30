'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Trash2, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

interface ChatSessionListProps {
  sessions: ChatSession[]
  selectedSession: ChatSession | null
  onSelectSession: (session: ChatSession) => void
  onDeleteSession: (sessionId: number) => void
  onCreateSession: () => void
}

export function ChatSessionList({
  sessions,
  selectedSession,
  onSelectSession,
  onDeleteSession,
  onCreateSession
}: ChatSessionListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteClick = (session: ChatSession) => {
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          チャットセッション
        </CardTitle>
        <div className="pt-3 pb-3 border-b">
          <Button
            size="sm"
            onClick={onCreateSession}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-3 w-3 mr-1" />
            新規セッション
          </Button>
        </div>
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
                    className="h-6 w-6 p-0 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(session)
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>セッションを削除</AlertDialogTitle>
            <AlertDialogDescription>
              チャットセッション「{sessionToDelete?.name}」を削除しますか？
              <br />
              この操作は元に戻せません。すべてのメッセージも削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}