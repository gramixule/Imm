import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './UpdateDataPage.css'; // Import the CSS file

const API_URL = 'https://imm-a8ub.onrender.com'; 

const UpdateDataPage = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileContent, setFileContent] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    readExcelFile(selectedFile);
  };

  const readExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      setFileContent(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    axios.post(`${API_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((response) => {
      setSuccess('File uploaded successfully.');
      setError('');
    })
    .catch((error) => {
      setError('There was an error uploading the file.');
      setSuccess('');
    });
  };

  return (
    <div className="update-data-page">
      <div className="left-section">
        <h2>Uploaded File Content</h2>
        {fileContent.length > 0 ? (
          <table>
            <thead>
              <tr>
                {Object.keys(fileContent[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fileContent.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No file content to display.</p>
        )}
      </div>
      <div className="right-section">
        <h2>Update Data Page</h2>
        <p>This is where you can update your data.</p>
        <input type="file" accept=".xlsx" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload File</button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </div>
    </div>
  );
};

export default UpdateDataPage;
