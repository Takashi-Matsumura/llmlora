import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const response = await fetch(`${BACKEND_URL}/api/datasets/upload/`, {
      method: 'POST',
      body: formData, // Forward the FormData directly
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to upload dataset:', error)
    return NextResponse.json(
      { error: 'Failed to upload dataset' }, 
      { status: 500 }
    )
  }
}