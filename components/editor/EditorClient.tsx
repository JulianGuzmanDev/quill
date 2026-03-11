'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Document {
  id: string
  title: string
  content: string
}

interface Props {
  document: Document
}

export default function EditorClient({ document }: Props) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(document.content)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [activeTab, setActiveTab] = useState<'transform' | 'generate'>('transform')
  const [generatePrompt, setGeneratePrompt] = useState('')
  const saveTitleTimeout = useRef<NodeJS.Timeout | null>(null)
  const saveContentTimeout = useRef<NodeJS.Timeout | null>(null)

  const saveContent = useCallback(async () => {
    setSaveStatus('saving')
    const { error: saveError } = await supabase
      .from('documents')
      .update({ content })
      .eq('id', document.id)
    if (!saveError) {
      setSaveStatus('saved')
    }
  }, [content, document.id])

  const saveTitle = useCallback(async () => {
    await supabase
      .from('documents')
      .update({ title })
      .eq('id', document.id)
  }, [title, document.id])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  // Debounced save content
  useEffect(() => {
    if (content !== document.content) {
      // Setting state to track unsaved changes is intentional here
      setSaveStatus('unsaved')
      if (saveContentTimeout.current) clearTimeout(saveContentTimeout.current)
      saveContentTimeout.current = setTimeout(() => {
        saveContent()
      }, 1000)

      return () => {
        if (saveContentTimeout.current) clearTimeout(saveContentTimeout.current)
      }
    }
  }, [content, document.content, saveContent])

  // Debounced save title
  useEffect(() => {
    if (title !== document.title) {
      if (saveTitleTimeout.current) clearTimeout(saveTitleTimeout.current)
      saveTitleTimeout.current = setTimeout(() => {
        saveTitle()
      }, 1000)

      return () => {
        if (saveTitleTimeout.current) clearTimeout(saveTitleTimeout.current)
      }
    }
  }, [title, document.title, saveTitle])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const handleAITransform = async (action: string) => {
    const textToTransform = selectedText || content
    if (!textToTransform) return
    
    setAiLoading(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text: textToTransform })
      })
      const data = await res.json()
      if (res.ok && data.result) {
        setAiResult(data.result)
      } else {
        setAiResult('Error: ' + (data.error || 'Failed to process'))
      }
    } catch (err) {
      setAiResult('Error: Network request failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!generatePrompt) return
    
    setAiLoading(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', prompt: generatePrompt })
      })
      const data = await res.json()
      if (res.ok && data.result) {
        setAiResult(data.result)
      } else {
        setAiResult('Error: ' + (data.error || 'Failed to process'))
      }
    } catch (err) {
      setAiResult('Error: Network request failed')
    } finally {
      setAiLoading(false)
    }
  }

  const insertAIResult = () => {
    if (aiResult && !aiResult.startsWith('Error:')) {
      setContent(selectedText ? content.replace(selectedText, aiResult) : content + '\n\n' + aiResult)
      setAiResult('')
    }
  }

  const getSaveStatusColor = () => {
    if (saveStatus === 'saved') return 'text-green-400'
    if (saveStatus === 'saving') return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Navbar */}
      <div className="border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ←
          </button>
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              autoFocus
              className="bg-transparent text-xl font-semibold outline-none border-b border-purple-500 px-2"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-semibold cursor-pointer hover:text-gray-300"
            >
              {title || 'Untitled'}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${getSaveStatusColor()}`}>
            {saveStatus === 'saved' && 'Guardado'}
            {saveStatus === 'saving' && 'Guardando...'}
            {saveStatus === 'unsaved' && 'Cambios sin guardar'}
          </span>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-md hover:from-purple-600 hover:to-blue-600"
          >
            AI
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-8 overflow-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={(e) => setSelectedText(e.currentTarget.value.substring(e.currentTarget.selectionStart, e.currentTarget.selectionEnd))}
            placeholder="Empezá a escribir, o apretá Cmd+K para pedirle a la IA..."
            className="w-full bg-[#0f0f0f] text-white text-lg leading-relaxed outline-none resize-none"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 p-6 overflow-auto flex flex-col">
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => setActiveTab('transform')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                  activeTab === 'transform' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Transformar
              </button>
              <button 
                onClick={() => setActiveTab('generate')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                  activeTab === 'generate' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Generar
              </button>
            </div>

            {activeTab === 'transform' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">Seleccioná texto en el editor para transformarlo</p>
                <button 
                  onClick={() => handleAITransform('summarize')} 
                  disabled={aiLoading || !content}
                  className="w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  {aiLoading ? 'Procesando...' : 'Resumir'}
                </button>
                <button 
                  onClick={() => handleAITransform('formal')} 
                  disabled={aiLoading || !content}
                  className="w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  Hacer más formal
                </button>
                <button 
                  onClick={() => handleAITransform('casual')} 
                  disabled={aiLoading || !content}
                  className="w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  Hacer más casual
                </button>
                <button 
                  onClick={() => handleAITransform('shorter')} 
                  disabled={aiLoading || !content}
                  className="w-full px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-sm"
                >
                  Acortar
                </button>
              </div>
            )}

            {activeTab === 'generate' && (
              <div className="space-y-3 flex-1 flex flex-col">
                <p className="text-sm text-gray-400 mb-2">Describí qué querés generar</p>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="ej: Escribí un email profesional agradeciendo a un cliente..."
                  className="flex-1 w-full px-3 py-2 rounded bg-gray-700 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <button 
                  onClick={handleAIGenerate} 
                  disabled={aiLoading || !generatePrompt}
                  className="w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                >
                  {aiLoading ? 'Generando...' : 'Generar'}
                </button>
              </div>
            )}

            {aiResult && (
              <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Resultado</p>
                  <div className="bg-gray-900 rounded p-3 text-sm text-gray-300 max-h-48 overflow-auto">
                    {aiResult}
                  </div>
                </div>
                {!aiResult.startsWith('Error:') && (
                  <button 
                    onClick={insertAIResult}
                    className="w-full px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-sm font-medium"
                  >
                    Insertar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
