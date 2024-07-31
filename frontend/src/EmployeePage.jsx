import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CustomTableComponent from './CustomTableComponent';
import Modal from './Modal';
import './EmployeePage.css';  // Ensure this path is correct

const API_URL = 'http://localhost:5000';

const EmployeePage = () => {
  const [rowData, setRowData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [streetNumber, setStreetNumber] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [section, setSection] = useState(1); // State for section navigation

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = () => {
    axios.get(`${API_URL}/api/employee_data`, { withCredentials: true })
      .then(response => {
        console.log("Employee data fetched:", response.data);
        setRowData(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the employee data!', error);
      });
  };

  const handleYes = (row) => {
    setSelectedRow({ ...row, questions: row.questions || [] });
    setStreetNumber(row.streetNumber || '');
    setAdditionalDetails(row.additionalDetails || '');
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updatedRow = {
      ...selectedRow,
      streetNumber,
      additionalDetails,
      questions: selectedRow.questions.map(q => ({ ...q, answer: q.answer || '' }))
    };

    axios.post(`${API_URL}/api/send_to_validation`, updatedRow, { withCredentials: true })
      .then(response => {
        if (response.data.status === 'success') {
          fetchEmployeeData();
          handleCloseModal();
        } else {
          console.error('Error sending to validation:', response.data.error);
        }
      })
      .catch(error => {
        console.error('There was an error sending to validation!', error);
      });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRow(null);
    setStreetNumber('');
    setAdditionalDetails('');
    setSection(1); // Reset to Section 1 when modal closes
  };

  const handleWhatsAppClick = (phoneNumber) => {
    window.open(`https://wa.me/${phoneNumber}`, '_blank');
  };

  const handleCallClick = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleMailClick = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const handleInputChange = (index, value) => {
    const updatedQuestions = selectedRow.questions.map((q, i) => {
      if (i === index) {
        return { ...q, answer: value };
      }
      return q;
    });
    setSelectedRow({ ...selectedRow, questions: updatedQuestions });
  };

  return (
    <div className="employee-page">
      <CustomTableComponent data={rowData} onYes={handleYes} isEmployeePage={true} />
      <Modal show={showModal} onClose={handleCloseModal}>
        {selectedRow && (
          <div className="details-section">
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
                <form onSubmit={handleSave}>
                  <label>
                    Street Number:
                    <input
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                    />
                  </label>
                  <label>
                    Additional Details:
                    <textarea
                      value={additionalDetails}
                      onChange={(e) => setAdditionalDetails(e.target.value)}
                    />
                  </label>
                  <button type="submit">Send</button>
                </form>
              </div>
            </div>
            <div className="details-right">
              <h3>Additional Information</h3>
              {selectedRow.questions && selectedRow.questions.length > 0 ? (
                section === 1 ? (
                  selectedRow.questions.slice(0, 5).map((q, index) => (
                    <div key={index}>
                      <label>{q.question}</label>
                      <input type="text" value={q.answer || ''} onChange={(e) => handleInputChange(index, e.target.value)} />
                    </div>
                  ))
                ) : (
                  selectedRow.questions.slice(5).map((q, index) => (
                    <div key={index}>
                      <label>{q.question}</label>
                      <input type="text" value={q.answer || ''} onChange={(e) => handleInputChange(index + 5, e.target.value)} />
                    </div>
                  ))
                )
              ) : (
                <p>No additional information provided.</p>
              )}
              <div className="contact-buttons">
                <button onClick={() => handleWhatsAppClick(selectedRow['Phone Number'])} className="btn-whatsapp">WhatsApp</button>
                <button onClick={() => handleCallClick(selectedRow['Phone Number'])} className="btn-call">Call</button>
                <button onClick={() => handleMailClick(selectedRow['Email'])} className="btn-mail">Mail</button>
              </div>
            </div>
          </div>
        )}
        <div className="section-buttons">
          <button onClick={() => setSection(1)} disabled={section === 1}>Section 1</button>
          <button onClick={() => setSection(2)} disabled={section === 2}>Section 2</button>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeePage;