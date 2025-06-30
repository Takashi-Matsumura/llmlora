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
  job_id?: number
  model_name?: string
  model_path?: string
  settings: any
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id?: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  generation_time?: number // in milliseconds
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
  const messageInputRef = useRef<HTMLInputElement>(null)

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
    const sendTime = new Date()
    setNewMessage('')
    setIsLoading(true)

    // Immediately add user message to UI
    const userMessage: ChatMessage = {
      session_id: session.id,
      role: 'user',
      content: messageText,
      timestamp: sendTime.toISOString()
    }
    setMessages(prev => [...prev, userMessage])

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
        const responseData = await response.json()
        const receiveTime = new Date()
        const generationTime = receiveTime.getTime() - sendTime.getTime()
        
        // Add assistant message to UI
        const assistantMessage: ChatMessage = {
          id: responseData.message_id,
          session_id: session.id,
          role: 'assistant',
          content: responseData.response,
          timestamp: receiveTime.toISOString(),
          generation_time: generationTime
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Focus back to message input after successful send with delay
        setTimeout(() => {
          messageInputRef.current?.focus()
        }, 100)
      } else {
        console.error('Failed to send message')
        // Remove the user message from UI since the request failed
        setMessages(prev => prev.slice(0, -1))
        // Re-enable the input with the message
        setNewMessage(messageText)
        setTimeout(() => {
          messageInputRef.current?.focus()
        }, 100)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove the user message from UI since the request failed
      setMessages(prev => prev.slice(0, -1))
      setNewMessage(messageText)
      setTimeout(() => {
        messageInputRef.current?.focus()
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  const getDisplayModelName = () => {
    if (session.model_name) {
      return session.model_name
    }
    if (session.model_path) {
      const parts = session.model_path.split('/')
      return parts[parts.length - 2] || 'Unknown Model'
    }
    return 'Unknown Model'
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {session.name}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          モデル: {getDisplayModelName()}
          {session.model_name && <span className="ml-2 text-green-600">🤖 Ollama</span>}
          {session.job_id && <span className="ml-2 text-blue-600">🎯 ファインチューニング済み</span>}
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
            messages.map((message, index) => (
              <MessageBubble key={message.id || `temp-${index}`} message={message} />
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
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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