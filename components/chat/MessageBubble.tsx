'use client'

import { User, Bot } from 'lucide-react'

interface ChatMessage {
  id?: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  generation_time?: number // in milliseconds
}

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatGenerationTime = (generationTime: number) => {
    if (generationTime < 1000) {
      return `${generationTime}ms`
    } else {
      return `${(generationTime / 1000).toFixed(1)}s`
    }
  }

  const formatMessageContent = (content: string) => {
    // Escape HTML first to prevent XSS
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
    
    // Convert **text** to <strong>text</strong> (bold)
    const boldFormatted = escaped.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    
    // Convert *text* to <em>text</em> (italic) - but avoid already processed bold text
    let italicFormatted = boldFormatted
    // Simple approach: replace single * that are not part of ** pairs
    const parts = italicFormatted.split(/(\*\*[^*]+?\*\*)/g)
    italicFormatted = parts.map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return part // Keep bold parts unchanged
      }
      return part.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    }).join('')
    
    // Convert line breaks to <br>
    const lineBreaksFormatted = italicFormatted.replace(/\n/g, '<br>')
    
    return lineBreaksFormatted
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
          <div 
            className="whitespace-pre-wrap break-words text-sm leading-relaxed [&>strong]:font-bold [&>em]:italic [&>strong]:text-inherit [&>em]:text-inherit"
            dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
          />
        </div>
        
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {formatTime(message.timestamp)}
          {message.generation_time && !isUser && (
            <span className="ml-2 text-blue-600">
              生成時間: {formatGenerationTime(message.generation_time)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}