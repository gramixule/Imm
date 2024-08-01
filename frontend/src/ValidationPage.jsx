import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CustomTableComponent from './CustomTableComponent';
import { useNavigate } from 'react-router-dom';
import './ValidationPage.css';
import ReactMarkdown from 'react-markdown';

const API_URL = 'https://imm-a8ub.onrender.com';

const ValidationPage = () => {
  const [data, setData] = useState([]);
  const [markdownDescriptions, setMarkdownDescriptions] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchValidationData();
  }, []);

  const fetchValidationData = () => {
    axios.get(`${API_URL}/api/get_json_data?type=validation_terenuri`, { withCredentials: true })
      .then(response => {
        setData(response.data);
        response.data.forEach(row => {
          if (row.Type === 'Teren intravilan') {
            fetchMarkdownDescription(row.Description, row.ID);
          }
        });
      })
      .catch(error => {
        console.error('There was an error fetching the validation data!', error);
      });
  };

  const fetchMarkdownDescription = (description, id) => {
    axios.post(`${API_URL}/api/markdown_description`, { description }, { withCredentials: true })
      .then(response => {
        setMarkdownDescriptions(prev => ({ ...prev, [id]: response.data.markdown }));
      })
      .catch(error => {
        console.error('There was an error fetching the markdown description!', error);
      });
  };

  const handleYes = (row) => {
    navigate('/details', { state: { selectedRow: row } });
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

  return (
    <div className="validation-page">
      <h1>Validation Page</h1>
      <CustomTableComponent
        data={data}
        onDelete={handleDelete}
        onYes={handleYes}
        isEmployeePage={false}
        showShortDescription={true}
        renderDescription={(row) => (
          <ReactMarkdown>{markdownDescriptions[row.ID] || row.Description}</ReactMarkdown>
        )}
      />
    </div>
  );
};

export default ValidationPage;
