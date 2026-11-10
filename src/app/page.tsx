'use client'

import { useState, useEffect } from 'react'
import CanvasEditor from '@/components/CanvasEditor'

export default function Home() {
  const [canvasId, setCanvasId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userColor, setUserColor] = useState<string>('')

  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).slice(2, 11)}`)
    setUserName(`User ${Math.floor(Math.random() * 1000)}`)
    setUserColor('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
  }, [])

  if (!canvasId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Collaborative Canvas</h1>
          <p className="text-gray-600 mb-4">Enter a canvas ID to join or create a canvas</p>
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

  return (
    <CanvasEditor
      canvasId={canvasId}
      userId={userId}
      userName={userName}
      userColor={userColor}
    />
  )
}
