// MapComponent.jsx
import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = 'https://imm-a8ub.onrender.com';

const MapComponent = ({ zones, validationData, zonesVisible }) => {
  return (
    <MapContainer center={[44.4268, 26.1025]} zoom={13} style={{ height: "600px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {zonesVisible && zones.map((zone, index) => (
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
  );
};

export default MapComponent;
