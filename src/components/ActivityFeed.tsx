'use client'

import React, { useEffect, useState } from 'react'
import { ChangeHistoryTracker, ChangeHistoryEntry } from '@/lib/changeHistory'

interface ActivityFeedProps {
  canvasId: string
  userId: string
  userName: string
  userColor: string
}

export default function ActivityFeed({ canvasId, userId, userName, userColor }: ActivityFeedProps) {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const trackerRef = React.useRef<ChangeHistoryTracker | null>(null)

  useEffect(() => {
    trackerRef.current = new ChangeHistoryTracker(canvasId, userId, userName, userColor)
    loadHistory()

    // Refresh history every 10 seconds
    const interval = setInterval(loadHistory, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [canvasId, userId, userName, userColor])

  const loadHistory = async () => {
    if (trackerRef.current) {
      const entries = await trackerRef.current.getHistory(50)
      setHistory(entries)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getActionText = (action: string, objectType: string) => {
    const actionMap: Record<string, string> = {
      create: 'added',
      update: 'modified',
      delete: 'removed'
    }
    return `${actionMap[action] || action} ${objectType}`
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 flex items-center gap-2"
      >
        <span>📜 Activity</span>
        <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">{history.length}</span>
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-lg shadow-xl w-80 max-h-96 overflow-hidden">
          <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold">Change History</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto max-h-80 p-4">
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No changes yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 border-l-2"
                    style={{ borderLeftColor: entry.user_color }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: entry.user_color }}
                    >
                      {entry.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">{entry.user_name}</span>{' '}
                        {getActionText(entry.action, entry.object_type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
