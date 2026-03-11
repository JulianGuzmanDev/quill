import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

async function getUserAndValidateOwnership(
  supabase: any,
  documentId: string
) {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, error: { error: 'Unauthorized', status: 401 } }
  }

  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('user_id')
    .eq('id', documentId)
    .single()

  if (fetchError || !document) {
    return { user, error: { error: 'Document not found', status: 404 } }
  }

  if (document.user_id !== user.id) {
    return { user, error: { error: 'Forbidden', status: 403 } }
  }

  return { user, error: null }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { user, error } = await getUserAndValidateOwnership(supabase, id)

  if (error) {
    return NextResponse.json(
      { error: error.error },
      { status: error.status }
    )
  }

  const { data, error: fetchError } = await supabase
    .from('documents')
    .select()
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { user, error } = await getUserAndValidateOwnership(supabase, id)

  if (error) {
    return NextResponse.json(
      { error: error.error },
      { status: error.status }
    )
  }

  // Validate request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, content } = body

  if (title === undefined && content === undefined) {
    return NextResponse.json(
      { error: 'At least one field (title or content) is required' },
      { status: 400 }
    )
  }

  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (content !== undefined) updateData.content = content

  const { data, error: updateError } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 200 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { user, error } = await getUserAndValidateOwnership(supabase, id)

  if (error) {
    return NextResponse.json(
      { error: error.error },
      { status: error.status }
    )
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }

  return NextResponse.json(null, { status: 204 })
}
