'use client'

import { User, Bot } from 'lucide-react'

interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-lg px-4 py-2 shadow-sm ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-8' 
            : 'bg-background border text-foreground mr-8'
        }`}>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}