import React from "react";
import ReactDOM from "react-dom/client"; // Import createRoot
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import { DataProvider } from "./DataContext"; // Import DataProvider
import "./index.css"; // Ensure you have the necessary styles

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement); // Use createRoot
root.render(
  <React.StrictMode>
    <Router>
      <DataProvider>
        <App />
      </DataProvider>
    </Router>
  </React.StrictMode>
);
