import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const UpdateDataPage = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    axios.post('https://your-flask-api-endpoint/api/upload', formData, {
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
    <div>
      <h2>Update Data Page</h2>
      <p>This is where you can update your data.</p>
      <input type="file" accept=".xlsx" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload File</button>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
};

export default UpdateDataPage;
