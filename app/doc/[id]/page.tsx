import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import EditorClient from '@/components/editor/EditorClient'

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!document) {
    redirect('/dashboard')
  }

  return <EditorClient document={document} />
}