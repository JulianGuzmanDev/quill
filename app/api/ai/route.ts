import { NextResponse } from 'next/server'
import groq from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const { action, text, prompt } = await request.json()

    if (!action || (!text && !prompt)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let userMessage = ''

    switch (action) {
      case 'summarize':
        userMessage = `Summarize the following text concisely:\n\n${text}`
        break
      case 'formal':
        userMessage = `Rewrite the following text in a formal tone:\n\n${text}`
        break
      case 'casual':
        userMessage = `Rewrite the following text in a casual, friendly tone:\n\n${text}`
        break
      case 'shorter':
        userMessage = `Make the following text shorter while keeping the main ideas:\n\n${text}`
        break
      case 'generate':
        userMessage = `Generate content based on this description:\n\n${prompt}`
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful writing assistant. Be concise and direct.'
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 1024
    })

    const result = completion.choices[0].message.content || ''

    return NextResponse.json({ result }, { status: 200 })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 })
  }
}