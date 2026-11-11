import { getSupabase } from './supabase'

export interface ChangeHistoryEntry {
  id: string
  canvas_id: string
  object_id: string
  user_id: string
  user_name: string
  user_color: string
  action: 'create' | 'update' | 'delete'
  object_type: string
  changes: any
  timestamp: string
}

export class ChangeHistoryTracker {
  private canvasId: string
  private userId: string
  private userName: string
  private userColor: string

  constructor(canvasId: string, userId: string, userName: string, userColor: string) {
    this.canvasId = canvasId
    this.userId = userId
    this.userName = userName
    this.userColor = userColor
  }

  // Log a change to the database
  async logChange(
    objectId: string,
    action: 'create' | 'update' | 'delete',
    objectType: string,
    changes?: any
  ): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('change_history')
        .insert({
          canvas_id: this.canvasId,
          object_id: objectId,
          user_id: this.userId,
          user_name: this.userName,
          user_color: this.userColor,
          action,
          object_type: objectType,
          changes: changes || {}
        })

      if (error) {
        console.error('Error logging change:', error)
      }
    } catch (error) {
      console.error('Error logging change:', error)
    }
  }

  // Get change history for a canvas
  async getHistory(limit: number = 50): Promise<ChangeHistoryEntry[]> {
    try {
      const { data, error } = await getSupabase()
        .from('change_history')
        .select('*')
        .eq('canvas_id', this.canvasId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching change history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching change history:', error)
      return []
    }
  }

  // Get change history for a specific object
  async getObjectHistory(objectId: string): Promise<ChangeHistoryEntry[]> {
    try {
      const { data, error } = await getSupabase()
        .from('change_history')
        .select('*')
        .eq('canvas_id', this.canvasId)
        .eq('object_id', objectId)
        .order('timestamp', { ascending: false })

      if (error) {
        console.error('Error fetching object history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching object history:', error)
      return []
    }
  }
}
