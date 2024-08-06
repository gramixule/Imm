import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './DetailsPage.css';
import MapComponent from './MapComponent';

const API_URL = 'https://imm-a8ub.onrender.com';

const DetailsPage = () => {
  const location = useLocation();
  const { rowData } = location.state || {};

  const [cut, setCut] = useState(0.2);
  const [pot, setPot] = useState(15);
  const [squareMeters, setSquareMeters] = useState(rowData?.['Square Meters']);
  const [price, setPrice] = useState(rowData?.Price);
  const [zones, setZones] = useState([]);
  const [validationData, setValidationData] = useState([]);
  const [zonesVisible, setZonesVisible] = useState(true);
  const [showMarkdown, setShowMarkdown] = useState(true);

  useEffect(() => {
    setSquareMeters(rowData?.['Square Meters']);
    setPrice(rowData?.Price);

    const fetchZones = async () => {
      try {
        const response = await axios.get(`${API_URL}/zone_mapping`);
        if (Array.isArray(response.data)) {
          setZones(response.data);
        } else {
          console.error('Error fetching zones: Data is not an array');
        }
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };

    const fetchValidationData = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/validation_data`, { withCredentials: true });
        if (Array.isArray(response.data)) {
          setValidationData(response.data);
        } else {
          console.error('Error fetching validation data: Data is not an array');
        }
      } catch (error) {
        console.error('Error fetching validation data:', error);
      }
    };

    fetchZones();
    fetchValidationData();
  }, [rowData]);

  const calculateMetrics = () => {
    const totalLand = squareMeters;
    const landOccupation = (pot / 100) * totalLand;
    const usageCoefficient = cut * totalLand;
    const unoccupiedLand = totalLand - landOccupation;
    const pricePerSquareMeter = price / totalLand;
    const constructionCostPerSquareMeter = 1000;
    const totalConstructionCost = constructionCostPerSquareMeter * usageCoefficient;
    const totalInvestmentCost = totalConstructionCost + price;
    const sellingPricePerSquareMeter = (totalInvestmentCost * 1.3) / usageCoefficient;
    const marketSellingPricePerSquareMeter = 2800;
    const profitDifference = marketSellingPricePerSquareMeter - sellingPricePerSquareMeter;

    return {
      totalLand,
      landOccupation,
      usageCoefficient,
      unoccupiedLand,
      pricePerSquareMeter,
      constructionCostPerSquareMeter,
      totalConstructionCost,
      totalInvestmentCost,
      sellingPricePerSquareMeter,
      marketSellingPricePerSquareMeter,
      profitDifference,
    };
  };

  const metrics = calculateMetrics();

  const handleSendToEmployee = () => {
    const updatedRow = {
      ...rowData,
      questions: rowData?.questions || [],
      cut,
      pot,
      squareMeters,
      price
    };

    axios.post(`${API_URL}/api/send_to_employee`, updatedRow, { withCredentials: true })
      .then(response => {
        if (response.data.status === 'success') {
          console.log("Sent to employee successfully");
        } else {
          console.error('Error sending to employee:', response.data.error);
        }
      })
      .catch(error => {
        console.error('There was an error sending to employee:', error);
      });
  };

  const toggleZonesVisibility = () => {
    setZonesVisible(!zonesVisible);
  };

  const toggleDescriptionView = () => {
    setShowMarkdown(!showMarkdown);
  };

  if (!rowData) {
    return <div>No data available.</div>;
  }

  return (
    <div className="details-page">
      <div className="sections-container">
        <div className="section full-details">
          <h3>FULL DETAILS ANUNT</h3>
          <p><strong>Zone:</strong> {rowData.Zone}</p>
          <p><strong>Price:</strong> {rowData.Price}</p>
          <p><strong>Phone Number:</strong> {rowData['Phone Number']}</p>
          <div>
            <strong>Description:</strong>
            <button onClick={toggleDescriptionView} className="btn-toggle-description">
              {showMarkdown ? 'Show Original' : 'Show Markdown'}
            </button>
            <div>
              {showMarkdown ? (
                <ReactMarkdown>{rowData.markdown_description || rowData.Description}</ReactMarkdown>
              ) : (
                <p>{rowData.Description}</p>
              )}
            </div>
          </div>
          <h3>Additional Details</h3>
          <p><strong>Street Number:</strong> {rowData.streetNumber}</p>
          <p><strong>Additional Details:</strong> {rowData.additionalDetails}</p>
        </div>
        <div className="section calculator-and-results">
          <h3>CALCULATOR INV</h3>
          <form>
            <label>
              <span>CUT</span>
              <input type="number" name="cut" value={cut} onChange={(e) => setCut(parseFloat(e.target.value))} />
            </label>
            <label>
              <span>POT</span>
              <input type="number" name="pot" value={pot} onChange={(e) => setPot(parseFloat(e.target.value))} />
            </label>
            <label>
              <span>Square Meters</span>
              <input type="number" name="squareMeters" value={squareMeters} onChange={(e) => setSquareMeters(parseFloat(e.target.value))} />
            </label>
            <label>
              <span>Price</span>
              <input type="number" name="price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
            </label>
          </form>
          <h3>CALCULATION RESULTS</h3>
          <p><strong>Total Land:</strong> {metrics.totalLand} mp</p>
          <p><strong>Land Occupation (POT):</strong> {metrics.landOccupation} mp</p>
          <p><strong>Usage Coefficient (CUT):</strong> {metrics.usageCoefficient} mp</p>
          <p><strong>Unoccupied Land:</strong> {metrics.unoccupiedLand} mp</p>
          <p><strong>Price per Square Meter:</strong> {metrics.pricePerSquareMeter} euro/mp</p>
          <p><strong>Construction Cost per Square Meter:</strong> {metrics.constructionCostPerSquareMeter} euro/mp</p>
          <p><strong>Total Construction Cost:</strong> {metrics.totalConstructionCost} euro</p>
          <p><strong>Total Investment Cost:</strong> {metrics.totalInvestmentCost} euro</p>
          <p><strong>Selling Price per Square Meter:</strong> {metrics.sellingPricePerSquareMeter} euro/mp</p>
          <p><strong>Market Selling Price per Square Meter:</strong> {metrics.marketSellingPricePerSquareMeter} euro/mp</p>
          <p><strong>Profit Difference:</strong> {metrics.profitDifference} euro/mp</p>
        </div>
        <div className="section chat-log">
          <h3>CHAT LOG COM</h3>
          {/* Content for Chat Log Com */}
        </div>
        <div className="section input-text">
          <h3>INPUT TEXT</h3>
          {/* Content for Input Text */}
        </div>
        <div className="section map">
          <h3>HARTA</h3>
          <button onClick={toggleZonesVisibility}>
            {zonesVisible ? 'Hide Zones' : 'Show Zones'}
          </button>
          <MapComponent zones={zones} validationData={validationData} zonesVisible={zonesVisible} />
        </div>
        <div className="section of-docs">
          <h3>OF DOCS</h3>
          {/* Content for OF DOCS */}
        </div>
        <div className="section export">
          <h3>EXPORT</h3>
          <button onClick={handleSendToEmployee} className="btn-send-to-employee">Send to Employee</button>
        </div>
      </div>
    </div>
  );
};

export default DetailsPage;
