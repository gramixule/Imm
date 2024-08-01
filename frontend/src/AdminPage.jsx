// AdminPage.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CustomTableComponent from './CustomTableComponent';
import Modal from './Modal';
import './AdminPage.css';
import ReactMarkdown from 'react-markdown';

const API_URL = 'https://imm-a8ub.onrender.com';

const AdminPage = ({ rowData = [] }) => {
  const [data, setData] = useState(rowData);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [section, setSection] = useState(1);
  const [customQuestion, setCustomQuestion] = useState('');
  const [responseType, setResponseType] = useState('text');
  const [customQuestions, setCustomQuestions] = useState([]);
  const [possibleResponses, setPossibleResponses] = useState(['']);
  const [cut, setCut] = useState(0.2);
  const [pot, setPot] = useState(15);
  const [squareMeters, setSquareMeters] = useState(0);
  const [price, setPrice] = useState(0);
  const [questionResponses, setQuestionResponses] = useState({
    vecinDirect: false,
    indiviziune: false,
    certificatUrbanism: false,
    cadastru: false,
    schiteProprietate: false
  });
  const [filterType, setFilterType] = useState('All');
  const [zoneSearch, setZoneSearch] = useState('');
  const [sortNewest, setSortNewest] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (selectedRow) {
      setSquareMeters(selectedRow['Square Meters']);
      setPrice(selectedRow.Price);
    }
  }, [selectedRow]);

  useEffect(() => {
    if (rowData.length === 0) {
      fetchAdminData();
    } else {
      setData(rowData.map(item => ({
        ...item,
        pricePerSquareMeter: calculatePricePerSquareMeter(item.Price, item['Square Meters']),
        short_description: item.short_description || item.Description
      })));
    }
  }, [rowData]);

  const fetchAdminData = (type = 'all') => {
    axios.get(`${API_URL}/api/get_json_data?type=${type}`, { withCredentials: true })
      .then(response => {
        const dataWithPricePerSquareMeter = response.data.map(item => ({
          ...item,
          pricePerSquareMeter: calculatePricePerSquareMeter(item.Price, item['Square Meters']),
          short_description: item.short_description || item.Description
        }));
        setData(dataWithPricePerSquareMeter);
      })
      .catch(error => {
        console.error('There was an error fetching the admin data!', error);
      });
  };

  const calculatePricePerSquareMeter = (price, squareMeters) => {
    return squareMeters ? (price / squareMeters).toFixed(2) : 0;
  };

  const handleDelete = (id) => {
    axios.post(`${API_URL}/api/delete_row`, { id }, { withCredentials: true })
      .then(() => {
        setData(data.filter(row => row.ID !== id));
      })
      .catch(error => {
        console.error('There was an error deleting the row!', error);
      });
  };

  const handleYes = (row) => {
    navigate('/details', { state: { rowData: row } });
  };

  const handleSendToEmployee = () => {
    if (!selectedRow) return;

    const updatedRow = {
      ...selectedRow,
      questions: customQuestions.filter(q => q.checked)
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

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRow(null);
    setSection(1);
  };

  const addCustomQuestion = () => {
    setCustomQuestions([...customQuestions, { question: customQuestion, type: responseType, responses: possibleResponses, checked: false }]);
    setCustomQuestion('');
    setResponseType('text');
    setPossibleResponses(['']);
  };

  const handleResponseChange = (index, value) => {
    const newResponses = [...possibleResponses];
    newResponses[index] = value;
    setPossibleResponses(newResponses);
  };

  const addResponseField = () => {
    setPossibleResponses([...possibleResponses, '']);
  };

  const toggleQuestionCheck = (index) => {
    const updatedQuestions = customQuestions.map((q, i) => {
      if (i === index) {
        return { ...q, checked: !q.checked };
      }
      return q;
    });
    setCustomQuestions(updatedQuestions);
  };

  const toggleQuestionResponse = (key) => {
    setQuestionResponses(prevState => ({
      ...prevState,
      [key]: !prevState[key]
    }));
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

  const handleFilterChange = (event) => {
    setFilterType(event.target.value);
    fetchAdminData(event.target.value.replace(' ', '_').toLowerCase());
  };

  const handleZoneSearchChange = (event) => {
    setZoneSearch(event.target.value);
  };

  const handleSortNewest = () => {
    setSortNewest(prevState => !prevState);
  };

  const extractDays = (daysString) => {
    const match = daysString.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const sortedData = sortNewest
    ? [...data].sort((a, b) => extractDays(a['Days Since Posted']) - extractDays(b['Days Since Posted']))
    : [...data].sort((a, b) => extractDays(b['Days Since Posted']) - extractDays(a['Days Since Posted']));

  const filteredData = sortedData.filter(item => {
    const matchesType = filterType === 'All' || item.Type === filterType;
    const matchesZone = item.Zone.toLowerCase().includes(zoneSearch.toLowerCase());
    return matchesType && matchesZone;
  });

  const generateMarkdownIfNeeded = async (row) => {
    if (!row.markdown_description) {
      try {
        const response = await axios.post(`${API_URL}/api/markdown_description`, { description: row.Description }, { withCredentials: true });
        if (response && response.data && response.data.markdown) {
          row.markdown_description = response.data.markdown;
          // Optionally update the JSON data on the server
          await axios.post(`${API_URL}/api/update_row`, { row }, { withCredentials: true });
        }
      } catch (error) {
        console.error('There was an error generating the markdown description!', error);
      }
    }
  };

  useEffect(() => {
    filteredData.forEach(generateMarkdownIfNeeded);
  }, [filteredData]);

  const openMaps = () => {
    let address = selectedRow.Description.match(/Adresa postala:\s*([^<]+)/i);
    if (address) {
      address = address[1].trim();
    } else {
      address = selectedRow.Zone;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  return (
    <div className="admin-page">
      <div className="navbar">
        <h1>Admin Page</h1>
        <div className="navbar-buttons">
          <button className="btn-validation">Validation</button>
          <button className="btn-mapping">Mapping</button>
        </div>
        <div className="filter-section">
          <label htmlFor="filterType">Filter by Type: </label>
          <select id="filterType" value={filterType} onChange={handleFilterChange}>
            <option value="All">All</option>
            <option value="Teren intravilan">Teren intravilan</option>
            <option value="Spațiu comercial">Spațiu comercial</option>
            <option value="Casă single">Casă single</option>
          </select>
          <label htmlFor="zoneSearch">Select Zone: </label>
          <input
            type="text"
            id="zoneSearch"
            value={zoneSearch}
            onChange={handleZoneSearchChange}
            placeholder="Enter zone name"
          />
          <button onClick={handleSortNewest}>
            {sortNewest ? 'Show Oldest' : 'Show Newest'}
          </button>
        </div>
      </div>
      <CustomTableComponent
        data={filteredData}
        onDelete={handleDelete}
        onYes={handleYes}
        isEmployeePage={false}
        showShortDescription={filterType === 'Teren intravilan'}
        renderDescription={(row) => (
          <ReactMarkdown>{row.markdown_description || row.Description}</ReactMarkdown>
        )}
      />
      {showModal && selectedRow && (
        <Modal show={showModal} onClose={handleCloseModal}>
          <div className="details-section">
            {section === 1 ? (
              <>
                <div className="details-left">
                  <div className="details-upper">
                    <h3>Row Details</h3>
                    <p><strong>Zone:</strong> {selectedRow.Zone}</p>
                    <p><strong>Price:</strong> {selectedRow.Price}</p>
                    <p><strong>Phone Number:</strong> {selectedRow['Phone Number']}</p>
                    <p><strong>Description:</strong> <div dangerouslySetInnerHTML={{ __html: selectedRow.Description }} /></p>
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
                </div>
              </>
            ) : (
              <>
                <div className="details-left">
                  <h3>Custom Questions</h3>
                  {customQuestions.map((q, index) => (
                    <div className="custom-question" key={index}>
                      <button
                        type="button"
                        onClick={() => toggleQuestionCheck(index)}
                        className={q.checked ? 'btn-yes' : 'btn-no'}
                      >
                        {q.checked ? 'Selected' : 'Select'}
                      </button>
                      <label>{q.question}</label>
                    </div>
                  ))}
                  <form>
                    <label>
                      <span>Custom Question</span>
                      <input type="text" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
                    </label>
                    <label>
                      <span>Type of Response</span>
                      <select value={responseType} onChange={(e) => setResponseType(e.target.value)}>
                        <option value="text">Text</option>
                        <option value="multipleChoice">Multiple Choice</option>
                      </select>
                    </label>
                    {responseType === 'multipleChoice' && (
                      <>
                        {possibleResponses.map((response, index) => (
                          <input
                            key={index}
                            type="text"
                            value={response}
                            onChange={(e) => handleResponseChange(index, e.target.value)}
                          />
                        ))}
                        <button type="button" onClick={addResponseField}>Add Response</button>
                      </>
                    )}
                    <button type="button" onClick={addCustomQuestion}>Add Question</button>
                  </form>
                </div>
              </>
            )}
          </div>
          <div className="section-buttons">
            <button onClick={() => setSection(1)} disabled={section === 1}>Section 1</button>
            <button onClick={() => setSection(2)} disabled={section === 2}>Section 2</button>
            <button onClick={openMaps} className="btn-maps">Maps</button>
            <button onClick={handleSendToEmployee} className="btn-send-to-employee">Send to Employee</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPage;
