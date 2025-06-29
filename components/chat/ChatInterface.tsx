'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'

interface ChatSession {
  id: number
  name: string
  job_id: number
  model_path: string
  settings: any
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatInterfaceProps {
  session: ChatSession
}

export function ChatInterface({ session }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [customTemperature, setCustomTemperature] = useState(0.7)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [session.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoadingMessages(true)
      const response = await fetch(`http://localhost:8000/api/chat/sessions/${session.id}/messages`)
      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || isLoading) {
      return
    }

    const messageText = newMessage.trim()
    setNewMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/chat/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          message: messageText,
          temperature: customTemperature,
          max_tokens: session.settings?.max_tokens || 512,
        }),
      })

      if (response.ok) {
        // Reload messages to get both user and assistant messages
        await loadMessages()
      } else {
        console.error('Failed to send message')
        // Re-enable the input with the message
        setNewMessage(messageText)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageText)
    } finally {
      setIsLoading(false)
    }
  }

  const formatModelName = (modelPath: string) => {
    const parts = modelPath.split('/')
    return parts[parts.length - 2] || 'Unknown Model'
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {session.name}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          モデル: {formatModelName(session.model_path)}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              チャットを開始してください
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bot className="h-4 w-4" />
              <div className="flex items-center gap-1">
                <span>生成中</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="border-t p-4 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={!newMessage.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="temperature" className="text-muted-foreground">Temperature:</label>
              <input
                id="temperature"
                type="range"
                min="0.1"
                max="1.5"
                step="0.1"
                value={customTemperature}
                onChange={(e) => setCustomTemperature(Number(e.target.value))}
                className="w-16 h-1"
              />
              <span className="text-muted-foreground w-8">{customTemperature}</span>
            </div>
            <div className="text-muted-foreground">
              最大トークン: {session.settings?.max_tokens || 512}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}