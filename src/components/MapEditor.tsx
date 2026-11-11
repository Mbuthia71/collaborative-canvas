'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Circle, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CanvasObject, CanvasSync } from '@/lib/canvasSync'
import { ChangeHistoryTracker } from '@/lib/changeHistory'
import ActivityFeed from './ActivityFeed'
import UserPresenceIndicator from './UserPresence'

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapEditorProps {
  canvasId: string
  userId: string
  userName: string
  userColor: string
}

interface GeoObject extends CanvasObject {
  lat?: number
  lng?: number
  radius?: number
  positions?: [number, number][]
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapEditor({ canvasId, userId, userName, userColor }: MapEditorProps) {
  const [objects, setObjects] = useState<GeoObject[]>([])
  const [tool, setTool] = useState<'select' | 'marker' | 'polygon' | 'circle'>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([])
  
  const syncRef = useRef<CanvasSync | null>(null)
  const changeHistoryRef = useRef<ChangeHistoryTracker | null>(null)

  useEffect(() => {
    syncRef.current = new CanvasSync(canvasId)
    changeHistoryRef.current = new ChangeHistoryTracker(canvasId, userId, userName, userColor)
    
    // Connect to Supabase Realtime
    syncRef.current.connect()

    const unsubscribe = syncRef.current.onObjectChange((updatedObjects) => {
      setObjects(updatedObjects as GeoObject[])
    })

    return () => {
      unsubscribe()
      syncRef.current?.destroy()
    }
  }, [canvasId, userId, userName, userColor])

  const handleMapClick = (lat: number, lng: number) => {
    if (tool === 'marker') {
      const newObject: GeoObject = {
        id: `marker_${Date.now()}`,
        type: 'marker',
        lat,
        lng,
        x: 0,
        y: 0,
        fill: userColor,
        zIndex: objects.length
      }
      syncRef.current?.addObject(newObject, userId, userColor)
      changeHistoryRef.current?.logChange(newObject.id, 'create', 'marker', newObject)
      setTool('select')
    } else if (tool === 'polygon') {
      setPolygonPoints([...polygonPoints, [lat, lng]])
    } else if (tool === 'circle') {
      const newObject: GeoObject = {
        id: `circle_${Date.now()}`,
        type: 'circle',
        lat,
        lng,
        radius: 1000,
        x: 0,
        y: 0,
        fill: userColor,
        zIndex: objects.length
      }
      syncRef.current?.addObject(newObject, userId, userColor)
      changeHistoryRef.current?.logChange(newObject.id, 'create', 'circle', newObject)
      setTool('select')
    }
  }

  const finishPolygon = () => {
    if (polygonPoints.length >= 3) {
      const newObject: GeoObject = {
        id: `polygon_${Date.now()}`,
        type: 'polygon',
        positions: polygonPoints,
        x: 0,
        y: 0,
        fill: userColor,
        zIndex: objects.length
      }
      syncRef.current?.addObject(newObject, userId, userColor)
      changeHistoryRef.current?.logChange(newObject.id, 'create', 'polygon', newObject)
    }
    setPolygonPoints([])
    setTool('select')
  }

  const deleteObject = (id: string) => {
    const obj = objects.find(o => o.id === id)
    syncRef.current?.deleteObject(id)
    if (obj) {
      changeHistoryRef.current?.logChange(id, 'delete', obj.type, obj)
    }
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Presence Indicator */}
      <UserPresenceIndicator
        canvasId={canvasId}
        userId={userId}
        userName={userName}
        userColor={userColor}
      />

      {/* Activity Feed */}
      <ActivityFeed
        canvasId={canvasId}
        userId={userId}
        userName={userName}
        userColor={userColor}
      />

      {/* Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex gap-4 items-center">
        <button
          onClick={() => { setTool('select'); setPolygonPoints([]) }}
          className={`px-4 py-2 rounded ${tool === 'select' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Select
        </button>
        <button
          onClick={() => setTool('marker')}
          className={`px-4 py-2 rounded ${tool === 'marker' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Marker
        </button>
        <button
          onClick={() => { setTool('polygon'); setPolygonPoints([]) }}
          className={`px-4 py-2 rounded ${tool === 'polygon' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Polygon
        </button>
        <button
          onClick={() => setTool('circle')}
          className={`px-4 py-2 rounded ${tool === 'circle' ? 'bg-blue-500' : 'bg-gray-600'}`}
        >
          Circle
        </button>
        {tool === 'polygon' && polygonPoints.length >= 3 && (
          <button
            onClick={finishPolygon}
            className="px-4 py-2 rounded bg-green-500"
          >
            Finish Polygon ({polygonPoints.length} points)
          </button>
        )}
        {selectedId && (
          <button
            onClick={() => deleteObject(selectedId)}
            className="px-4 py-2 rounded bg-red-500 ml-auto"
          >
            Delete
          </button>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={[-1.2921, 36.8219]} // Nairobi coordinates
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onMapClick={handleMapClick} />
          
          {/* Render existing objects */}
          {objects.map((obj) => (
            <React.Fragment key={obj.id}>
              {obj.type === 'marker' && obj.lat && obj.lng && (
                <Marker
                  position={[obj.lat, obj.lng]}
                  eventHandlers={{
                    click: () => setSelectedId(obj.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Marker</strong><br />
                      Lat: {obj.lat.toFixed(4)}<br />
                      Lng: {obj.lng.toFixed(4)}
                      {obj.createdBy && (
                        <>
                          <br />
                          <span style={{ color: obj.createdByColor }}>
                            Created by: {obj.createdBy}
                          </span>
                          <br />
                          <span className="text-xs text-gray-500">
                            {obj.createdAt ? new Date(obj.createdAt).toLocaleString() : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              {obj.type === 'circle' && obj.lat && obj.lng && obj.radius && (
                <Circle
                  center={[obj.lat, obj.lng]}
                  radius={obj.radius}
                  fillColor={obj.fill}
                  color={obj.fill}
                  eventHandlers={{
                    click: () => setSelectedId(obj.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Circle</strong><br />
                      Center: {obj.lat.toFixed(4)}, {obj.lng.toFixed(4)}<br />
                      Radius: {obj.radius}m
                      {obj.createdBy && (
                        <>
                          <br />
                          <span style={{ color: obj.createdByColor }}>
                            Created by: {obj.createdBy}
                          </span>
                          <br />
                          <span className="text-xs text-gray-500">
                            {obj.createdAt ? new Date(obj.createdAt).toLocaleString() : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Circle>
              )}
              {obj.type === 'polygon' && obj.positions && (
                <Polygon
                  positions={obj.positions}
                  fillColor={obj.fill}
                  color={obj.fill}
                  eventHandlers={{
                    click: () => setSelectedId(obj.id)
                  }}
                >
                  <Popup>
                    <div>
                      <strong>Polygon</strong><br />
                      Points: {obj.positions.length}
                      {obj.createdBy && (
                        <>
                          <br />
                          <span style={{ color: obj.createdByColor }}>
                            Created by: {obj.createdBy}
                          </span>
                          <br />
                          <span className="text-xs text-gray-500">
                            {obj.createdAt ? new Date(obj.createdAt).toLocaleString() : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              )}
            </React.Fragment>
          ))}

          {/* Render polygon in progress */}
          {polygonPoints.length > 0 && (
            <Polygon
              positions={polygonPoints}
              fillColor={userColor}
              color={userColor}
              fillOpacity={0.5}
            />
          )}
        </MapContainer>
      </div>

      {/* Coordinate display */}
      <div className="bg-gray-900 text-white p-2 text-sm">
        <span className="font-semibold">Instructions:</span> Select a tool and click on the map. For polygons, click multiple points then "Finish Polygon".
      </div>
    </div>
  )
}
