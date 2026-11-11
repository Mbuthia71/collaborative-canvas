import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

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
}

export class CanvasCRDT {
  private doc: Y.Doc
  private provider: WebsocketProvider | null = null
  private objects: Y.Map<CanvasObject>
  private canvasId: string

  constructor(canvasId: string, websocketUrl?: string) {
    this.canvasId = canvasId
    this.doc = new Y.Doc()
    this.objects = this.doc.getMap(`canvas_${canvasId}_objects`)

    // Initialize WebSocket provider if URL provided
    if (websocketUrl) {
      this.provider = new WebsocketProvider(
        websocketUrl,
        `canvas_${canvasId}`,
        this.doc
      )
    }
  }

  // Get all objects
  getObjects(): CanvasObject[] {
    return Array.from(this.objects.values())
  }

  // Add a new object
  addObject(object: CanvasObject): void {
    const id = object.id || `obj_${Date.now()}`
    this.objects.set(id, { ...object, id })
  }

  // Update an existing object
  updateObject(id: string, updates: Partial<CanvasObject>): void {
    const existing = this.objects.get(id)
    if (existing) {
      this.objects.set(id, { ...existing, ...updates })
    }
  }

  // Delete an object
  deleteObject(id: string): void {
    this.objects.delete(id)
  }

  // Subscribe to object changes
  onObjectChange(callback: (objects: CanvasObject[]) => void): () => void {
    const handler = () => {
      callback(this.getObjects())
    }
    
    this.objects.observe(handler)
    
    // Return unsubscribe function
    return () => {
      this.objects.unobserve(handler)
    }
  }

  // Clear all objects
  clear(): void {
    this.objects.clear()
  }

  // Destroy the CRDT instance
  destroy(): void {
    if (this.provider) {
      this.provider.destroy()
    }
    this.doc.destroy()
  }

  // Get the Yjs document (for advanced use cases)
  getDoc(): Y.Doc {
    return this.doc
  }
}
