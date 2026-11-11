import { getSupabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface UserPresence {
  user_id: string
  user_name: string
  user_color: string
  cursor_x: number
  cursor_y: number
  last_seen: string
}

export class RealtimeSync {
  private channel: RealtimeChannel | null = null
  private canvasId: string
  private userId: string
  private userName: string
  private userColor: string
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(canvasId: string, userId: string, userName: string, userColor: string) {
    this.canvasId = canvasId
    this.userId = userId
    this.userName = userName
    this.userColor = userColor
  }

  // Connect to Supabase Realtime
  async connect(): Promise<void> {
    this.channel = getSupabase()
      .channel(`canvas_${this.canvasId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `canvas_id=eq.${this.canvasId}`
        },
        (payload) => {
          this.handlePresenceChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to realtime channel')
          this.updatePresence(0, 0)
          // Start heartbeat to keep user marked as online
          this.heartbeatInterval = setInterval(() => {
            this.updatePresence(0, 0)
          }, 10000) // Update every 10 seconds
        }
      })
  }

  // Handle presence changes from other users
  private handlePresenceChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (newRecord.user_id !== this.userId) {
        // Emit custom event for UI to handle
        window.dispatchEvent(new CustomEvent('presence-update', {
          detail: { type: 'update', data: newRecord }
        }))
      }
    } else if (eventType === 'DELETE') {
      window.dispatchEvent(new CustomEvent('presence-update', {
        detail: { type: 'remove', userId: oldRecord.user_id }
      }))
    }
  }

  // Update current user's presence (cursor position)
  async updatePresence(cursorX: number, cursorY: number): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('user_presence')
        .upsert({
          canvas_id: this.canvasId,
          user_id: this.userId,
          user_name: this.userName,
          user_color: this.userColor,
          cursor_x: cursorX,
          cursor_y: cursorY,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'canvas_id,user_id'
        })

      if (error) {
        console.error('Error updating presence:', error)
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  // Remove user presence on disconnect
  async removePresence(): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('user_presence')
        .delete()
        .eq('canvas_id', this.canvasId)
        .eq('user_id', this.userId)

      if (error) {
        console.error('Error removing presence:', error)
      }
    } catch (error) {
      console.error('Error removing presence:', error)
    }
  }

  // Disconnect from realtime channel
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.removePresence()
  }

  // Get all current users in the canvas
  async getCurrentUsers(): Promise<UserPresence[]> {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString()
    
    const { data, error } = await getSupabase()
      .from('user_presence')
      .select('*')
      .eq('canvas_id', this.canvasId)
      .gt('last_seen', thirtySecondsAgo)

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    return data || []
  }
}
