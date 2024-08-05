import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './MappingPage.css';

const API_URL = 'https://imm-a8ub.onrender.com';

const MappingPage = () => {
  const [zones, setZones] = useState([]);
  const [validationData, setValidationData] = useState([]);
  const [selectedPOT, setSelectedPOT] = useState('');
  const [selectedCUT, setSelectedCUT] = useState('');
  const [file, setFile] = useState(null);
  const [pdfZones, setPdfZones] = useState([]);
  const [zonesVisible, setZonesVisible] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await axios.get(`${API_URL}/zone_mapping`);
        setZones(Array.isArray(response.data) ? response.data : []);
        console.log('Zones:', response.data); // Log fetched zones
      } catch (error) {
        console.error('Error fetching zones:', error);
        setZones([]);
      }
    };

    const fetchValidationData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/validation_data`, { withCredentials: true });
        setValidationData(Array.isArray(response.data) ? response.data : []);
        console.log('Validation Data:', response.data); // Log fetched validation data
      } catch (error) {
        console.error('Error fetching validation data:', error);
        setValidationData([]);
      }
    };

    fetchZones();
    fetchValidationData();
  }, []);

  const handlePOTChange = (event) => {
    setSelectedPOT(event.target.value);
  };

  const handleCUTChange = (event) => {
    setSelectedCUT(event.target.value);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      axios.post(`${API_URL}/api/extract_zones_from_pdf`, formData, { withCredentials: true })
        .then(response => {
          setPdfZones(Array.isArray(response.data.zones) ? response.data.zones : []);
          console.log('PDF Zones:', response.data.zones); // Log zones extracted from PDF
        })
        .catch(error => {
          console.error('Error uploading file:', error);
        });
    }
  };

  const filteredZones = zones.filter(zone => {
    return (
      (!selectedPOT || zone.pot === selectedPOT) &&
      (!selectedCUT || zone.cut === selectedCUT)
    );
  });

  return (
    <div className="mapping-page">
      <div className="navbar">
        <h1>Mapping Page</h1>
        <div className="navbar-buttons">
          <Link to="/validation" className="btn btn-validation">Validation</Link>
        </div>
      </div>
      <div className="content">
        <h2>Mapping Content</h2>
        <div className="filters">
          <label>
            POT:
            <select value={selectedPOT} onChange={handlePOTChange}>
              <option value="">All</option>
              <option value="80%">80%</option>
              <option value="65%">65%</option>
              <option value="50%">50%</option>
              <option value="40%">40%</option>
              <option value="25%">25%</option>
            </select>
          </label>
          <label>
            CUT:
            <select value={selectedCUT} onChange={handleCUTChange}>
              <option value="">All</option>
              <option value="6">6</option>
              <option value="3.5">3.5</option>
              <option value="3.25">3.25</option>
              <option value="3">3</option>
              <option value="2.5">2.5</option>
              <option value="2">2</option>
              <option value="1.8">1.8</option>
              <option value="0.8">0.8</option>
            </select>
          </label>
        </div>
        <div>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
        </div>
        <button onClick={() => setZonesVisible(!zonesVisible)}>
          {zonesVisible ? 'Hide Zones' : 'Show Zones'}
        </button>
        <MapContainer center={[44.4268, 26.1025]} zoom={13} style={{ height: "600px", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {zonesVisible && filteredZones.map((zone, index) => (
            <Polygon key={index} positions={zone.delimitare}>
              <Popup>
                <b>{zone.zone}</b><br />
                POT: {zone.pot}<br />
                CUT: {zone.cut}<br />
                Obiectii: {zone.obiectii} <br />
                {zone.pdf && <a href={`${API_URL}/uploads/${zone.pdf}`} target="_blank" rel="noopener noreferrer">View PDF</a>}
              </Popup>
            </Polygon>
          ))}
          {zonesVisible && pdfZones.map((zone, index) => (
            <Polygon key={index} positions={zone.coordinates}>
              <Popup>
                <b>{zone.zone}</b>
              </Popup>
            </Polygon>
          ))}
          {validationData.map((property, index) => {
            if (property.latitude && property.longitude) {
              return (
                <Marker key={index} position={[property.latitude, property.longitude]}>
                  <Popup>
                    <b>{property.Zone}</b><br />
                    Address: {property.short_description}<br />
                    Price: {property.Price} EUR<br />
                    Type: {property.Type}<br />
                    Square Meters: {property['Square Meters']}<br />
                    Proprietor: {property.Proprietor}<br />
                    Phone: {property['Phone Number']}<br />
                  </Popup>
                </Marker>
              );
            } else {
              return null;
            }
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MappingPage;
