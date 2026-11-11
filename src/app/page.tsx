'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), { ssr: false })
const MapEditor = dynamic(() => import('@/components/MapEditor'), { ssr: false })

export default function Home() {
  const [canvasId, setCanvasId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userColor, setUserColor] = useState<string>('')
  const [mode, setMode] = useState<'canvas' | 'map'>('canvas')

  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).slice(2, 11)}`)
    setUserName(`User ${Math.floor(Math.random() * 1000)}`)
    setUserColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
  }, [])

  if (!canvasId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Collaborative Editor</h1>
          <p className="text-gray-600 mb-4">Choose editor type and enter a canvas ID</p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Editor Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('canvas')}
                className={`flex-1 px-4 py-2 rounded ${mode === 'canvas' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Canvas
              </button>
              <button
                onClick={() => setMode('map')}
                className={`flex-1 px-4 py-2 rounded ${mode === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Map
              </button>
            </div>
          </div>

          <input
            type="text"
            value={canvasId}
            onChange={(e) => setCanvasId(e.target.value)}
            placeholder="Enter canvas ID..."
            className="w-full px-4 py-2 border rounded-lg mb-4"
            autoFocus
          />
          <button
            onClick={() => setCanvasId(canvasId || 'default-canvas')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Join Canvas
          </button>
        </div>
      </div>
    )
  }

  return mode === 'canvas' ? (
    <CanvasEditor
      canvasId={canvasId}
      userId={userId}
      userName={userName}
      userColor={userColor}
    />
  ) : (
    <MapEditor
      canvasId={canvasId}
      userId={userId}
      userName={userName}
      userColor={userColor}
    />
  )
}
