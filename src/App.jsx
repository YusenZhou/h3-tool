import { useState } from 'react'
import { latLngToCell, cellToLatLng } from 'h3-js'
import './App.css'

function App() {
  const [coordinates, setCoordinates] = useState('')
  const [resolution, setResolution] = useState('7')
  const [h3Id, setH3Id] = useState('')
  const [centerCoords, setCenterCoords] = useState(null)
  const [error, setError] = useState('')

  const handleConvert = () => {
    handleClear()
    try {
      setError('')
      
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
      
      const [centerLat, centerLng] = cellToLatLng(h3Index)
      setCenterCoords({ lat: centerLat, lng: centerLng })
      
    } catch (err) {
      setError('Error converting coordinates: ' + err.message)
    }
  }

  const handleClear = () => {
    setCoordinates('')
    setResolution('7')
    setH3Id('')
    setCenterCoords(null)
    setError('')
  }

  return (
    <div className="app-container">
      <h1>H3 Coordinate Converter</h1>
      <p className="description">
        Convert latitude, longitude, and resolution level to Uber H3 ID
      </p>
      
      <div className="input-section">
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
        
        <div className="button-group">
          <button onClick={handleConvert} className="convert-btn">
            Convert to H3
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
      
      {h3Id && (
        <div className="result-section">
          <h3>H3 Result</h3>
          <div className="center-coords">
            <h4>ID</h4>
            <div className="coords-display">
              {h3Id}
            </div>
          </div>
          <div className="center-coords">
            <h4>Center Coordinates (Lat, Lng)</h4>
            <div className="coords-display">
              {centerCoords.lat.toFixed(6)},{centerCoords.lng.toFixed(6)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
