'use client'

import React, { useEffect, useState } from 'react'
import { RealtimeSync, type UserPresence } from '@/lib/realtime'

interface UserPresenceProps {
  canvasId: string
  userId: string
  userName: string
  userColor: string
}

export default function UserPresenceIndicator({ canvasId, userId, userName, userColor }: UserPresenceProps) {
  const [users, setUsers] = useState<UserPresence[]>([])
  const realtimeRef = React.useRef<RealtimeSync | null>(null)

  useEffect(() => {
    realtimeRef.current = new RealtimeSync(canvasId, userId, userName, userColor)
    
    // Connect to realtime
    realtimeRef.current.connect()
    
    // Load initial users
    loadUsers()

    // Listen for presence updates
    const handlePresenceUpdate = (event: CustomEvent) => {
      loadUsers()
    }

    window.addEventListener('presence-update', handlePresenceUpdate as EventListener)

    // Refresh users every 5 seconds
    const interval = setInterval(loadUsers, 5000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('presence-update', handlePresenceUpdate as EventListener)
      realtimeRef.current?.disconnect()
    }
  }, [canvasId, userId, userName, userColor])

  const loadUsers = async () => {
    if (realtimeRef.current) {
      const currentUsers = await realtimeRef.current.getCurrentUsers()
      setUsers(currentUsers)
    }
  }

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Active now'
    if (diffMins < 5) return 'Active'
    return `${diffMins}m ago`
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-gray-700">
            Online ({users.length})
          </span>
        </div>

        {users.length === 0 ? (
          <p className="text-xs text-gray-500">No other users</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: user.user_color }}
                >
                  {user.user_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 truncate">{user.user_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatLastSeen(user.last_seen)}
                  </p>
                </div>
                {user.user_id === userId && (
                  <span className="text-xs text-gray-400">(you)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
