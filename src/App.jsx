import { useState, useRef, useEffect } from 'react'
import { latLngToCell, cellToLatLng, cellToBoundary, isValidCell } from 'h3-js'
import { MapContainer, TileLayer, ZoomControl, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './leaflet-icons.js'
import './App.css'

function App() {
  const [coordinates, setCoordinates] = useState('')
  const [resolution, setResolution] = useState('7')
  const [h3Id, setH3Id] = useState('')
  const [hexId, setHexId] = useState('')
  const [centerCoords, setCenterCoords] = useState(null)
  const [error, setError] = useState('')
  const [h3Polygons, setH3Polygons] = useState([])
  const [batchImportText, setBatchImportText] = useState('')
  const [batchImportCoordsText, setBatchImportCoordsText] = useState('')
  const [batchImportResolution, setBatchImportResolution] = useState('7')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('converter')
  const [activeSubTab, setActiveSubTab] = useState('coordinates')
  const [activeBatchSubTab, setActiveBatchSubTab] = useState('h3ids')
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const mapRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const minZoom = Math.floor(windowSize.height / 540) + 1

  const handleConvert = () => {
    try {
      setError('')
      
      if (activeSubTab === 'coordinates') {
        if (!coordinates.trim()) {
          setError('Please enter coordinates')
          return
        }
        
        const coords = coordinates.split(',').map(coord => coord.trim())
        if (coords.length !== 2) {
          setError('Please enter coordinates in format: latitude, longitude')
          return
        }
        
        const lat = parseFloat(coords[0])
        const lng = parseFloat(coords[1])
        const res = parseInt(resolution)
        
        if (isNaN(lat) || isNaN(lng) || isNaN(res)) {
          setError('Please enter valid numbers for latitude, longitude, and resolution')
          return
        }
        
        if (lat < -90 || lat > 90) {
          setError('Latitude must be between -90 and 90 degrees')
          return
        }
        
        if (lng < -180 || lng > 180) {
          setError('Longitude must be between -180 and 180 degrees')
          return
        }
        
        if (res < 0 || res > 15) {
          setError('Resolution must be between 0 and 15')
          return
        }
        
        const h3Index = latLngToCell(lat, lng, res)
        setH3Id(h3Index)
        setHexId(h3Index)
        
        const [centerLat, centerLng] = cellToLatLng(h3Index)
        setCenterCoords({ lat: centerLat, lng: centerLng })
      } else if (activeSubTab === 'h3id') {
        if (!hexId.trim()) {
          setError('Please enter an H3 ID')
          return
        }
        
        if (!isValidCell(hexId)) {
          setError('Please enter a valid H3 ID')
          return
        }
        
        setH3Id(hexId)
        
        const [centerLat, centerLng] = cellToLatLng(hexId)
        setCenterCoords({ lat: centerLat, lng: centerLng })
        
        const res = hexId.length - 1
        setResolution(res.toString())
      }
      
    } catch (err) {
      setError('Error processing input: ' + err.message)
    }
  }

  const handleDrawH3 = () => {
    if (!h3Id) {
      setError('Please convert coordinates to H3 first')
      return
    }
    
    try {
      setError('')
      const boundary = cellToBoundary(h3Id, false)
      setH3Polygons(prev => [...prev, { id: h3Id, boundary }])
    } catch (err) {
      setError('Error drawing H3 hexagon: ' + err.message)
    }
  }

  const handleLocateOnMap = () => {
    if (!h3Id || !mapRef.current) {
      setError('Please convert coordinates to H3 first')
      return
    }
    
    try {
      setError('')
      const map = mapRef.current
      const res = parseInt(resolution)
      const zoomLevel = Math.min(15, Math.max(minZoom, 20 - res))
      map.setView([centerCoords.lat, centerCoords.lng], zoomLevel)
    } catch (err) {
      setError('Error locating on map: ' + err.message)
    }
  }

  const handleClear = () => {
    if (activeSubTab === 'coordinates') {
      setCoordinates('')
      setResolution('7')
    } else if (activeSubTab === 'h3id') {
      setHexId('')
    }
    setH3Id('')
    setCenterCoords(null)
    setError('')
  }

  const handleBatchImport = () => {
    try {
      setImportError('')
      setImportSuccess('')
      
      if (activeBatchSubTab === 'h3ids') {
        if (!batchImportText.trim()) {
          setImportError('Please enter H3 IDs to import')
          return
        }
        
        const h3Ids = batchImportText
          .split(",")
          .map(id => id.trim())
          .filter(id => id.length > 0)
        
        const validH3Ids = []
        const invalidH3Ids = []
        const duplicateH3Ids = []
        
        const existingH3Ids = new Set(h3Polygons.map(polygon => polygon.id))
        
        h3Ids.forEach(id => {
          if (isValidCell(id)) {
            if (existingH3Ids.has(id)) {
              duplicateH3Ids.push(id)
            } else {
              validH3Ids.push(id)
            }
          } else {
            invalidH3Ids.push(id)
          }
        })
        
        if (validH3Ids.length === 0) {
          if (duplicateH3Ids.length > 0 && invalidH3Ids.length === 0) {
            setImportError(`All H3 IDs are already in the list: ${duplicateH3Ids.join(', ')}`)
          } else if (duplicateH3Ids.length > 0 && invalidH3Ids.length > 0) {
            setImportError(`No new valid H3 IDs found. ${duplicateH3Ids.length} duplicate ID(s): ${duplicateH3Ids.join(', ')}. ${invalidH3Ids.length} invalid ID(s): ${invalidH3Ids.join(', ')}`)
          } else {
            setImportError('No new valid H3 IDs found')
          }
          return
        }
        
        const newPolygons = validH3Ids.map(id => {
          const boundary = cellToBoundary(id, false)
          return { id, boundary }
        })
        
        setH3Polygons(prev => [...prev, ...newPolygons])
        
        let successMessage = `Successfully imported ${validH3Ids.length} H3 hexagon(s)`
        let skipMessage = ''
        
        if (duplicateH3Ids.length > 0) {
          skipMessage += `${duplicateH3Ids.length} duplicate ID(s) skipped: ${duplicateH3Ids.join(', ')}`
        }
        
        if (invalidH3Ids.length > 0) {
          if (skipMessage) skipMessage += '. '
          skipMessage += `${invalidH3Ids.length} invalid ID(s) skipped: ${invalidH3Ids.join(', ')}`
        }
        
        if (skipMessage) {
          successMessage += `. ${skipMessage}`
        }
        
        setImportSuccess(successMessage)
        setBatchImportText('')
        
      } else if (activeBatchSubTab === 'coords') {
        if (!batchImportCoordsText.trim()) {
          setImportError('Please enter coordinates to import')
          return
        }
        
        const res = parseInt(batchImportResolution)
        if (isNaN(res) || res < 0 || res > 15) {
          setImportError('Please enter a valid resolution level between 0 and 15')
          return
        }
        
        const coordPairs = batchImportCoordsText
          .split(",")
          .map(coord => coord.trim())
          .filter(coord => coord.length > 0)
        
        if (coordPairs.length % 2 !== 0) {
          setImportError('Coordinates must be in pairs (latitude, longitude)')
          return
        }
        
        const validCoords = []
        const invalidCoords = []
        const duplicateH3Ids = []
        
        const existingH3Ids = new Set(h3Polygons.map(polygon => polygon.id))
        
        for (let i = 0; i < coordPairs.length; i += 2) {
          const lat = parseFloat(coordPairs[i])
          const lng = parseFloat(coordPairs[i + 1])
          
          if (isNaN(lat) || isNaN(lng)) {
            invalidCoords.push(`${coordPairs[i]}, ${coordPairs[i + 1]}`)
            continue
          }
          
          if (lat < -90 || lat > 90) {
            invalidCoords.push(`${coordPairs[i]}, ${coordPairs[i + 1]} (invalid latitude)`)
            continue
          }
          
          if (lng < -180 || lng > 180) {
            invalidCoords.push(`${coordPairs[i]}, ${coordPairs[i + 1]} (invalid longitude)`)
            continue
          }
          
                     try {
             const h3Index = latLngToCell(lat, lng, res)
             if (existingH3Ids.has(h3Index)) {
               duplicateH3Ids.push(h3Index)
             } else {
               validCoords.push({ lat, lng, h3Index })
             }
           } catch {
             invalidCoords.push(`${coordPairs[i]}, ${coordPairs[i + 1]}`)
           }
        }
        
        if (validCoords.length === 0) {
          if (duplicateH3Ids.length > 0 && invalidCoords.length === 0) {
            setImportError(`All coordinates result in H3 IDs already in the list: ${duplicateH3Ids.join(', ')}`)
          } else if (duplicateH3Ids.length > 0 && invalidCoords.length > 0) {
            setImportError(`No new valid coordinates found. ${duplicateH3Ids.length} duplicate H3 ID(s): ${duplicateH3Ids.join(', ')}. ${invalidCoords.length} invalid coordinate pair(s): ${invalidCoords.join(', ')}`)
          } else {
            setImportError('No new valid coordinates found')
          }
          return
        }
        
        const newPolygons = validCoords.map(({ h3Index }) => {
          const boundary = cellToBoundary(h3Index, false)
          return { id: h3Index, boundary }
        })
        
        setH3Polygons(prev => [...prev, ...newPolygons])
        
        let successMessage = `Successfully imported ${validCoords.length} coordinate pair(s) as H3 hexagon(s)`
        let skipMessage = ''
        
        if (duplicateH3Ids.length > 0) {
          skipMessage += `${duplicateH3Ids.length} duplicate H3 ID(s) skipped: ${duplicateH3Ids.join(', ')}`
        }
        
        if (invalidCoords.length > 0) {
          if (skipMessage) skipMessage += '. '
          skipMessage += `${invalidCoords.length} invalid coordinate pair(s) skipped: ${invalidCoords.join(', ')}`
        }
        
        if (skipMessage) {
          successMessage += `. ${skipMessage}`
        }
        
        setImportSuccess(successMessage)
        setBatchImportCoordsText('')
      }
      
    } catch (err) {
      setImportError('Error importing: ' + err.message)
    }
  }

  const handleCopyToClipboard = () => {
    try {
      if (h3Polygons.length === 0) {
        setError('No H3 hexagons to copy')
        return
      }
      
      const h3Ids = h3Polygons.map(polygon => polygon.id).join(',')
      navigator.clipboard.writeText(h3Ids).then(() => {
        setImportSuccess('H3 IDs copied to clipboard!')
        setTimeout(() => setImportSuccess(''), 3000)
      }).catch(() => {
        setError('Failed to copy to clipboard')
      })
    } catch (err) {
      setError('Error copying H3 IDs: ' + err.message)
    }
  }

  return (
    <div className="app-container">
      <div className="map-background">
        <MapContainer
          ref={mapRef}
          center={[0, -60]}
          zoom={minZoom}
          minZoom={minZoom}
          maxZoom={20}
          style={{ height: '100vh', width: '100vw' }}
          zoomControl={false}
          maxBounds={[[-90, -Infinity], [90, Infinity]]}
          maxBoundsViscosity={1.0}
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {h3Polygons.map((polygon, index) => (
            <Polygon
              key={`${polygon.id}-${index}`}
              positions={polygon.boundary}
              pathOptions={{
                color: '#ff4444',
                weight: 2,
                fillColor: '#ff4444',
                fillOpacity: 0.2
              }}
            />
          ))}
        </MapContainer>
      </div>

      <div className="floating-form">
        <h1>H3 Tool</h1>
        <p className="description">
          Get Uber H3 info and draw on map from coordinates or H3 IDs
        </p>
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'converter' ? 'active' : ''}`}
            onClick={() => setActiveTab('converter')}
          >
            Search
          </button>
          <button 
            className={`tab-button ${activeTab === 'batch-import' ? 'active' : ''}`}
            onClick={() => setActiveTab('batch-import')}
          >
            Batch Import
          </button>
        </div>

        {activeTab === 'converter' && (
          <div className="sub-section">
            <h3>Search</h3>
            <div className="sub-tab-navigation">
              <button 
                className={`sub-tab-button ${activeSubTab === 'coordinates' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('coordinates')}
              >
                Coordinates
              </button>
              <button 
                className={`sub-tab-button ${activeSubTab === 'h3id' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('h3id')}
              >
                H3 ID
              </button>
            </div>

            <div className="input-section">
              {activeSubTab === 'coordinates' && (
                <>
                  <div className="input-group">
                      <label htmlFor="coordinates">Coordinates (Latitude, Longitude):</label>
                      <input
                        id="coordinates"
                        type="text"
                        placeholder="e.g., 37.7749, -122.4194"
                        value={coordinates}
                        onChange={(e) => setCoordinates(e.target.value)}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label htmlFor="resolution">Resolution Level (0-15):</label>
                      <input
                        id="resolution"
                        type="number"
                        min="0"
                        max="15"
                        placeholder="e.g., 9"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                      />
                    </div>
                </>
              )}
              {activeSubTab === 'h3id' && (
                <>
                  <div className="input-group">
                    <label htmlFor="hexId">H3 Hex ID:</label>
                    <input
                      id="hexId"
                      type="text"
                      placeholder="e.g., 8928308280fffff"
                      value={hexId}
                      onChange={(e) => setHexId(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="button-group">
                <button onClick={handleConvert} className="convert-btn">
                  Get H3 info
                </button>
                <button onClick={handleClear} className="clear-btn">
                  Clear
                </button>
              </div>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="result-section">
              <h3>H3 Info</h3>
              <div className="input-group">
                <label htmlFor="h3-id">ID</label>
                <input
                  id="h3-id"
                  type="text"
                  value={h3Id || ''}
                  readOnly
                />
              </div>
              <div className="input-group">
                <label htmlFor="center-coords">Center Coordinates (Lat, Lng)</label>
                <input
                  id="center-coords"
                  type="text"
                  value={centerCoords ? `${centerCoords.lat.toFixed(6)},${centerCoords.lng.toFixed(6)}` : ''}
                  readOnly
                />
              </div>
              <div className="button-group">
                <button 
                  onClick={handleDrawH3} 
                  className="draw-btn"
                  type="button"
                  disabled={!h3Id}
                >
                  Draw on Map
                </button>
                <button 
                  onClick={handleLocateOnMap} 
                  className="locate-btn"
                  type="button"
                  disabled={!h3Id}
                >
                  Locate on Map
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'batch-import' && (
          <div className="sub-section">
            <h3>Batch Import</h3>
            <div className="sub-tab-navigation">
              <button 
                className={`sub-tab-button ${activeBatchSubTab === 'coords' ? 'active' : ''}`}
                onClick={() => setActiveBatchSubTab('coords')}
              >
                Coordinates
              </button>
              <button 
                className={`sub-tab-button ${activeBatchSubTab === 'h3ids' ? 'active' : ''}`}
                onClick={() => setActiveBatchSubTab('h3ids')}
              >
                H3 IDs
              </button>
            </div>

            {activeBatchSubTab === 'h3ids' && (
              <>
                <div className="input-section">
                  <div className="input-group">
                    <label htmlFor="batch-import-text">H3 IDs (comma separated):</label>
                    <textarea
                      id="batch-import-text"
                      rows="5"
                      placeholder="Enter H3 IDs to import, separated by commas&#10;e.g.: 8928308280fffff, 8928308281fffff, 8928308282fffff"
                      value={batchImportText}
                      onChange={(e) => setBatchImportText(e.target.value)}
                    />
                  </div>
                  <div className="button-group">
                    <button onClick={handleBatchImport} className="import-btn">
                      Import H3 IDs
                    </button>
                  </div>
                  {importError && (
                    <div className="error-message">{importError}</div>
                  )}
                  {importSuccess && (
                    <div className="success-message">{importSuccess}</div>
                  )}
                </div>
              </>
            )}

            {activeBatchSubTab === 'coords' && (
              <>
                <div className="input-section">
                  <div className="input-group">
                    <label htmlFor="batch-import-coords-text">Coordinates (comma separated, Lat, Lng):</label>
                    <textarea
                      id="batch-import-coords-text"
                      rows="5"
                      placeholder="Enter coordinates to import, separated by commas&#10;e.g.: 37.7749,-122.4194, 40.7128,-74.0060, 51.5074,-0.1278"
                      value={batchImportCoordsText}
                      onChange={(e) => setBatchImportCoordsText(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="batch-import-resolution">Resolution Level (0-15):</label>
                    <input
                      id="batch-import-resolution"
                      type="number"
                      min="0"
                      max="15"
                      placeholder="e.g., 9"
                      value={batchImportResolution}
                      onChange={(e) => setBatchImportResolution(e.target.value)}
                    />
                  </div>
                  <div className="button-group">
                    <button onClick={handleBatchImport} className="import-btn">
                      Import Coordinates
                    </button>
                  </div>
                  {importError && (
                    <div className="error-message">{importError}</div>
                  )}
                  {importSuccess && (
                    <div className="success-message">{importSuccess}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="drawn-hexagons-section">
          <h3>Drawn H3 Hexagons ({h3Polygons.length})</h3>
          <div className="hexagon-list">
            {h3Polygons.map((polygon, index) => (
              <div key={`${polygon.id}-${index}`} className="hexagon-item">
                {polygon.id}
                <button 
                  onClick={() => setH3Polygons(prev => prev.filter((_, i) => i !== index))}
                  className="remove-hexagon-btn"
                  title="Remove this hexagon"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="button-group">
            <button onClick={handleCopyToClipboard} className="convert-btn">
              Copy to Clipboard
            </button>
            <button 
              onClick={() => setH3Polygons([])}
              className="clear-btn"
            >
              Clear All Hexagons
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
