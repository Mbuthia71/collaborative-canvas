import { getSupabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// Types for canvas objects
export interface CanvasObject {
  id: string
  type: 'rect' | 'circle' | 'text' | 'image' | 'marker' | 'polygon'
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
  fontSize?: number
  zIndex?: number
  // Geospatial properties
  lat?: number
  lng?: number
  radius?: number
  positions?: [number, number][]
  // User attribution
  createdBy?: string
  createdByColor?: string
  createdAt?: string
  updatedAt?: string
}

export class CanvasSync {
  private channel: RealtimeChannel | null = null
  private canvasId: string
  private objects: Map<string, CanvasObject> = new Map()
  private changeCallbacks: Set<(objects: CanvasObject[]) => void> = new Set()
  private isSubscribed: boolean = false

  constructor(canvasId: string) {
    this.canvasId = canvasId
  }

  // Get all objects
  getObjects(): CanvasObject[] {
    return Array.from(this.objects.values())
  }

  // Add a new object
  async addObject(object: CanvasObject, userId?: string, userColor?: string): Promise<void> {
    const id = object.id || `obj_${Date.now()}`
    const now = new Date().toISOString()
    
    const { error } = await getSupabase()
      .from('canvas_objects')
      .insert({
        id,
        canvas_id: this.canvasId,
        object_type: object.type,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
        fill: object.fill,
        stroke: object.stroke,
        stroke_width: object.strokeWidth,
        text: object.text,
        font_size: object.fontSize,
        z_index: object.zIndex,
        lat: object.lat,
        lng: object.lng,
        radius: object.radius,
        positions: object.positions ? JSON.stringify(object.positions) : null,
        created_by: userId,
        created_by_color: userColor,
        created_at: now,
        updated_at: now
      })

    if (error) {
      console.error('Error adding object:', error)
    }
  }

  // Update an existing object
  async updateObject(id: string, updates: Partial<CanvasObject>, userId?: string, userColor?: string): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Map TypeScript field names to database column names
    if (updates.type !== undefined) updateData.object_type = updates.type
    if (updates.x !== undefined) updateData.x = updates.x
    if (updates.y !== undefined) updateData.y = updates.y
    if (updates.width !== undefined) updateData.width = updates.width
    if (updates.height !== undefined) updateData.height = updates.height
    if (updates.rotation !== undefined) updateData.rotation = updates.rotation
    if (updates.fill !== undefined) updateData.fill = updates.fill
    if (updates.stroke !== undefined) updateData.stroke = updates.stroke
    if (updates.strokeWidth !== undefined) updateData.stroke_width = updates.strokeWidth
    if (updates.text !== undefined) updateData.text = updates.text
    if (updates.fontSize !== undefined) updateData.font_size = updates.fontSize
    if (updates.zIndex !== undefined) updateData.z_index = updates.zIndex
    if (updates.lat !== undefined) updateData.lat = updates.lat
    if (updates.lng !== undefined) updateData.lng = updates.lng
    if (updates.radius !== undefined) updateData.radius = updates.radius
    if (updates.positions !== undefined) updateData.positions = JSON.stringify(updates.positions)

    const { error } = await getSupabase()
      .from('canvas_objects')
      .update(updateData)
      .eq('id', id)
      .eq('canvas_id', this.canvasId)

    if (error) {
      console.error('Error updating object:', error)
    }
  }

  // Delete an object
  async deleteObject(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('canvas_objects')
      .delete()
      .eq('id', id)
      .eq('canvas_id', this.canvasId)

    if (error) {
      console.error('Error deleting object:', error)
    }
  }

  // Subscribe to object changes
  onObjectChange(callback: (objects: CanvasObject[]) => void): () => void {
    this.changeCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.changeCallbacks.delete(callback)
    }
  }

  // Notify all callbacks of changes
  private notifyChange(): void {
    const objects = this.getObjects()
    this.changeCallbacks.forEach(callback => callback(objects))
  }

  // Load initial objects from database
  async loadObjects(): Promise<void> {
    const { data, error } = await getSupabase()
      .from('canvas_objects')
      .select('*')
      .eq('canvas_id', this.canvasId)
      .order('z_index', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error loading objects:', error)
      return
    }

    // Convert database format to CanvasObject format
    this.objects.clear()
    data.forEach((row: any) => {
      this.objects.set(row.id, this.dbToCanvasObject(row))
    })

    this.notifyChange()
  }

  // Convert database row to CanvasObject
  private dbToCanvasObject(row: any): CanvasObject {
    return {
      id: row.id,
      type: row.object_type,
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      rotation: row.rotation,
      fill: row.fill,
      stroke: row.stroke,
      strokeWidth: row.stroke_width,
      text: row.text,
      fontSize: row.font_size,
      zIndex: row.z_index,
      lat: row.lat,
      lng: row.lng,
      radius: row.radius,
      positions: row.positions ? JSON.parse(row.positions) : undefined,
      createdBy: row.created_by,
      createdByColor: row.created_by_color,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // Connect to Supabase Realtime
  async connect(): Promise<void> {
    // Load initial objects
    await this.loadObjects()

    // Set up realtime subscription
    this.channel = getSupabase()
      .channel(`canvas_objects_${this.canvasId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${this.canvasId}`
        },
        (payload) => {
          this.handleRealtimeChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to canvas objects realtime channel')
          this.isSubscribed = true
        }
      })
  }

  // Handle realtime changes from Supabase
  private handleRealtimeChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'INSERT') {
      this.objects.set(newRecord.id, this.dbToCanvasObject(newRecord))
    } else if (eventType === 'UPDATE') {
      this.objects.set(newRecord.id, this.dbToCanvasObject(newRecord))
    } else if (eventType === 'DELETE') {
      this.objects.delete(oldRecord.id)
    }

    this.notifyChange()
  }

  // Clear all objects
  async clear(): Promise<void> {
    const { error } = await getSupabase()
      .from('canvas_objects')
      .delete()
      .eq('canvas_id', this.canvasId)

    if (error) {
      console.error('Error clearing objects:', error)
    }

    this.objects.clear()
    this.notifyChange()
  }

  // Destroy the sync instance
  destroy(): void {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.changeCallbacks.clear()
    this.objects.clear()
    this.isSubscribed = false
  }
}
