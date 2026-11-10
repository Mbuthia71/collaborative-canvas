'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva'
import Konva from 'konva'
import { CanvasObject, CanvasCRDT } from '@/lib/yjs'
import { RealtimeSync } from '@/lib/realtime'

interface CanvasEditorProps {
  canvasId: string
  userId: string
  userName: string
  userColor: string
}

export default function CanvasEditor({ canvasId, userId, userName, userColor }: CanvasEditorProps) {
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'rect' | 'circle' | 'text'>('select')
  
  const crdtRef = useRef<CanvasCRDT | null>(null)
  const realtimeRef = useRef<RealtimeSync | null>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)

  // Initialize CRDT and Realtime
  useEffect(() => {
    crdtRef.current = new CanvasCRDT(canvasId)
    realtimeRef.current = new RealtimeSync(canvasId, userId, userName, userColor)

    // Load initial objects
    setObjects(crdtRef.current.getObjects())

    // Subscribe to CRDT changes
    const unsubscribe = crdtRef.current.onObjectChange((updatedObjects) => {
      setObjects(updatedObjects)
    })

    // Connect to realtime
    realtimeRef.current.connect()

    // Listen for presence updates
    const handlePresenceUpdate = (event: CustomEvent) => {
      console.log('Presence update:', event.detail)
    }
    window.addEventListener('presence-update', handlePresenceUpdate as EventListener)

    return () => {
      unsubscribe()
      realtimeRef.current?.disconnect()
      crdtRef.current?.destroy()
      window.removeEventListener('presence-update', handlePresenceUpdate as EventListener)
    }
  }, [canvasId, userId, userName, userColor])

  // Handle stage click for adding objects
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') return

    const stage = e.target.getStage()
    if (!stage) return

    const pointerPos = stage.getPointerPosition()
    if (!pointerPos) return

    const newObject: CanvasObject = {
      id: `obj_${Date.now()}`,
      type: tool,
      x: pointerPos.x,
      y: pointerPos.y,
      width: 100,
      height: 100,
      fill: '#000000',
      stroke: '#000',
      strokeWidth: 2,
      rotation: 0,
      zIndex: objects.length,
      text: tool === 'text' ? 'Double click to edit' : undefined,
      fontSize: 24
    }

    crdtRef.current?.addObject(newObject)
    setTool('select')
  }

  // Handle object selection
  const handleObjectClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    e.evt.stopPropagation()
    setSelectedId(id)
  }

  // Handle object drag
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const { x, y } = e.target.position()
    crdtRef.current?.updateObject(id, { x, y })
  }

  // Handle object transform
  const handleTransformEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    
    node.scaleX(1)
    node.scaleY(1)

    crdtRef.current?.updateObject(id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY)
    })
  }

  // Handle mouse move for cursor tracking
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pointerPos = stage.getPointerPosition()
    if (pointerPos) {
      realtimeRef.current?.updatePresence(pointerPos.x, pointerPos.y)
    }
  }

  // Delete selected object
  const handleDelete = () => {
    if (selectedId) {
      crdtRef.current?.deleteObject(selectedId)
      setSelectedId(null)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

  // Attach transformer to selected node
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      if (stage) {
        const selectedNode = stage.findOne(`#${selectedId}`)
        if (selectedNode && selectedNode.className !== 'Transformer') {
          transformerRef.current.nodes([selectedNode])
        }
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedId])

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex gap-4 items-center">
        <button
          onClick={() => setTool('select')}
          className={`px-4 py-2 rounded ${tool === 'select' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Select
        </button>
        <button
          onClick={() => setTool('rect')}
          className={`px-4 py-2 rounded ${tool === 'rect' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Rectangle
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`px-4 py-2 rounded ${tool === 'circle' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Circle
        </button>
        <button
          onClick={() => setTool('text')}
          className={`px-4 py-2 rounded ${tool === 'text' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Text
        </button>
        {selectedId && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded bg-red-500 ml-auto"
          >
            Delete
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight - 64}
          onClick={handleStageClick}
          onMouseMove={handleMouseMove}
          onTap={handleStageClick as any}
        >
          <Layer>
            {objects.map((obj) => (
              <React.Fragment key={obj.id}>
                {obj.type === 'rect' && (
                  <Rect
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width || 100}
                    height={obj.height || 100}
                    fill={obj.fill}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    rotation={obj.rotation}
                    draggable={tool === 'select'}
                    onClick={(e) => handleObjectClick(e, obj.id)}
                    onDragEnd={(e) => handleDragEnd(e as any, obj.id)}
                    onTransformEnd={(e) => handleTransformEnd(e as any, obj.id)}
                  />
                )}
                {obj.type === 'circle' && (
                  <Circle
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    radius={(obj.width || 100) / 2}
                    fill={obj.fill}
                    stroke={obj.stroke}
                    strokeWidth={obj.strokeWidth}
                    rotation={obj.rotation}
                    draggable={tool === 'select'}
                    onClick={(e) => handleObjectClick(e, obj.id)}
                    onDragEnd={(e) => handleDragEnd(e as any, obj.id)}
                    onTransformEnd={(e) => handleTransformEnd(e as any, obj.id)}
                  />
                )}
                {obj.type === 'text' && (
                  <Text
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    text={obj.text}
                    fontSize={obj.fontSize || 24}
                    fill={obj.fill}
                    draggable={tool === 'select'}
                    onClick={(e) => handleObjectClick(e, obj.id)}
                    onDragEnd={(e) => handleDragEnd(e as any, obj.id)}
                  />
                )}
              </React.Fragment>
            ))}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox
                  }
                  return newBox
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
