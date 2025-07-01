import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000'

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat/completed-jobs/`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch completed jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch completed jobs' }, 
      { status: 500 }
    )
  }
}