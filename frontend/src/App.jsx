import React, { useState } from "react";
import axios from "axios";
import { Route, Routes, Link, useNavigate } from "react-router-dom";
import AdminPage from "./AdminPage";
import EmployeePage from "./EmployeePage";
import LoginForm from "./LoginForm";
import ValidationPage from "./ValidationPage";
import "./App.css"; // Ensure you have the necessary styles

const API_URL = 'https://imm-a8ub.onrender.com';

const App = () => {
  const [role, setRole] = useState(null);
  const [rowData, setRowData] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (message, role) => {
    setRole(role);
    console.log("Logged in as:", role);
    fetchData(); // Fetch data after login
    navigate("/"); // Navigate to home after login
  };

  const fetchData = () => {
    axios.get(`${API_URL}/api/convert`, { withCredentials: true })
      .then(response => {
        console.log("Data fetched:", response.data);
        if (Array.isArray(response.data)) {
          setRowData(response.data);
        } else {
          console.error('Data is not an array:', response.data);
          setRowData([]);
        }
      })
      .catch(error => {
        console.error('There was an error fetching the data!', error);
        setError('There was an error fetching the data!');
      });
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-left">
          <h1>ORICE</h1>
          {role === "admin" && (
            <Link to="/validation" className="button">Validation</Link>
          )}
        </div>
        <div className="navbar-right">
          {role && (
            <button
              className="button"
              onClick={() => {
                axios.post(`${API_URL}/api/logout`, {}, { withCredentials: true })
                  .then(() => {
                    setRole(null);
                    setRowData([]);
                    console.log("Logged out");
                    navigate("/"); // Navigate to home after logout
                  })
                  .catch(err => console.error('Logout error:', err));
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/validation" element={<ValidationPage />} />
        <Route path="/" element={
          role ? (
            role === "admin" ? (
              <AdminPage rowData={rowData} />
            ) : (
              <EmployeePage />
            )
          ) : (
            <LoginForm onLogin={handleLogin} />
          )
        } />
      </Routes>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default App;
