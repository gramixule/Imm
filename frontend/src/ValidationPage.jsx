import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CustomTableComponent from './CustomTableComponent';
import Modal from './Modal';
import './ValidationPage.css';

const API_URL = 'https://imm-a8ub.onrender.com';

const ValidationPage = () => {
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [section, setSection] = useState(1);
  const [questionResponses, setQuestionResponses] = useState({});
  const [cut, setCut] = useState(0.2);
  const [pot, setPot] = useState(15);
  const [squareMeters, setSquareMeters] = useState(0);
  const [price, setPrice] = useState(0);
  const [zoneInfo, setZoneInfo] = useState(null);  // New state for zone information

  useEffect(() => {
    fetchValidationData();
  }, []);

  useEffect(() => {
    if (selectedRow) {
      setSquareMeters(selectedRow['Square Meters']);
      setPrice(selectedRow.Price);
      fetchZoneInfo(selectedRow.Zone);  // Fetch zone information when a row is selected
    }
  }, [selectedRow]);

  const fetchValidationData = () => {
    axios.get(`${API_URL}/api/validation_data`, { withCredentials: true })
      .then(response => {
        console.log("Validation data fetched:", response.data);
        setData(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the validation data!', error);
      });
  };

  const fetchZoneInfo = (zone) => {
    axios.post(`${API_URL}/api/get_zone_info`, { zone }, { withCredentials: true })
      .then(response => {
        console.log("Zone info fetched:", response.data);
        setZoneInfo(response.data);  // Update state with fetched zone information
        // Update POT and CUT with the values from zone info
        setPot(parseFloat(response.data.pot));
        setCut(parseFloat(response.data.cut.replace(',', '.')));  // Replace comma with dot for proper number parsing
      })
      .catch(error => {
        console.error('There was an error fetching the zone info!', error);
      });
  };

  const handleYes = (row) => {
    setSelectedRow({ ...row });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    axios.post(`${API_URL}/api/delete_validation_row`, { id }, { withCredentials: true })
      .then(response => {
        if (response.data.status === 'success') {
          setData(data.filter(row => row.ID !== id));
        } else {
          console.error('Error deleting row:', response.data.error);
        }
      })
      .catch(error => {
        console.error('There was an error deleting the row!', error);
      });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRow(null);
    setSection(1);
  };

  const handleQuestionResponse = (questionKey, value) => {
    setQuestionResponses(prevState => ({
      ...prevState,
      [questionKey]: value
    }));
  };

  const handleSendToEmployee = () => {
    if (!selectedRow) return;

    const updatedRow = {
      ...selectedRow,
      questions: selectedRow.questions // Use the existing questions
    };

    axios.post(`${API_URL}/api/send_to_employee`, updatedRow, { withCredentials: true })
      .then(response => {
        if (response.data.status === 'success') {
          setData(data.filter(r => r.ID !== updatedRow.ID));
          handleCloseModal();
        } else {
          console.error('Error sending to employee:', response.data.error);
        }
      })
      .catch(error => {
        console.error('There was an error sending to employee!', error);
      });
  };

  const handleOpenMap = () => {
    const address = selectedRow?.streetNumber || '';
    if (!address.trim()) {
      alert('Address is empty');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

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

  return (
    <div className="validation-page">
      <h1>Validation Page</h1>
      <CustomTableComponent
        data={data}
        onDelete={handleDelete}
        onYes={handleYes}
        isEmployeePage={false}
      />
      <Modal show={showModal} onClose={handleCloseModal}>
        {selectedRow && (
          <div className="details-section">
            {section === 1 ? (
              <>
                <div className="details-left">
                  <div className="details-upper">
                    <h3>Row Details</h3>
                    <p><strong>Zone:</strong> {selectedRow.Zone}</p>
                    <p><strong>Price:</strong> {selectedRow.Price}</p>
                    <p><strong>Phone Number:</strong> {selectedRow['Phone Number']}</p>
                    <p><strong>Description:</strong> {selectedRow.Description}</p>
                  </div>
                  <div className="details-lower">
                    <h3>Additional Details</h3>
                    <p><strong>Street Number:</strong> {selectedRow.streetNumber}</p>
                    <p><strong>Additional Details:</strong> {selectedRow.additionalDetails}</p>
                  </div>
                </div>
                <div className="details-right">
                  <h3>Additional Information</h3>
                  <form>
                    {selectedRow.questions.map((q, index) => (
                      <div key={index}>
                        <label>{q.question}</label>
                        <input
                          type="text"
                          value={q.answer || ''}
                          onChange={(e) => handleQuestionResponse(`question-${index}`, e.target.value)}
                        />
                      </div>
                    ))}
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="details-left">
                  <h3>Additional Information</h3>
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
                </div>
                <div className="details-right">
                  <h3>Calculation Results</h3>
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
                  {zoneInfo && (
                    <div className="zone-info">
                      <h3>Zone Information</h3>
                      <p><strong>Zone:</strong> {zoneInfo.zone}</p>
                      <p><strong>POT:</strong> {zoneInfo.pot}</p>
                      <p><strong>CUT:</strong> {zoneInfo.cut}</p>
                      <p><strong>Obiectii:</strong> {zoneInfo.obiectii}</p>
                      <p><strong>Delimitare:</strong> {zoneInfo.delimitare}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <div className="section-buttons">
          <button onClick={() => setSection(1)} disabled={section === 1}>Section 1</button>
          <button onClick={handleOpenMap} className="btn-open-map">Open Map</button>
          <button onClick={() => setSection(2)} disabled={section === 2}>Section 2</button>
          <button onClick={handleSendToEmployee} className="btn-send-to-employee">Send to Employee</button>
        </div>
      </Modal>
    </div>
  );
};

export default ValidationPage;
