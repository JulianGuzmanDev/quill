'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Document {
  id: string
  title: string
  content: string
  updated_at: string
}

interface Props {
  documents: Document[]
}

export default function DashboardClient({ documents }: Props) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleNewDocument = async () => {
    const res = await fetch('/api/documents', { method: 'POST' })
    if (res.ok) {
      const doc = await res.json()
      router.push(`/doc/${doc.id}`)
    }
  }

  const formatRelativeTime = (date: string) => {
    const now = new Date()
    const updated = new Date(date)
    const diff = now.getTime() - updated.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Ahora mismo'
    if (minutes < 60) return `Hace ${minutes} minutos`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours} horas`
    const days = Math.floor(hours / 24)
    return `Hace ${days} días`
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <nav className="flex items-center justify-between p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold bg-linear-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">Quill</h1>
        <button onClick={handleLogout} className="text-gray-400 hover:text-white">Salir</button>
      </nav>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Tus Documentos</h2>
          <button onClick={handleNewDocument} className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-md hover:from-purple-600 hover:to-blue-600">Nuevo documento</button>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No tenés documentos todavía</p>
            <button onClick={handleNewDocument} className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-md hover:from-purple-600 hover:to-blue-600">Creá tu primer documento</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div key={doc.id} onClick={() => router.push(`/doc/${doc.id}`)} className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors">
                <h3 className="font-semibold mb-2">{doc.title || 'Untitled'}</h3>
                <p className="text-gray-400 text-sm mb-2">{doc.content.slice(0, 100)}...</p>
                <p className="text-gray-500 text-xs">{formatRelativeTime(doc.updated_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}