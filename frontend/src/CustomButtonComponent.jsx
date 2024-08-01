// CustomButtonComponent.jsx
import React from 'react';
import './CustomButtonComponent.css';

const CustomButtonComponent = ({ row, onDelete, onYes, isEmployeePage }) => {
  const handleYesClick = () => {
    onYes(row);
  };

  const handleDeleteClick = () => {
    onDelete(row.ID);
  };

  return (
    <div>
      <button className="btn-yes" onClick={handleYesClick}>Yes</button>
      {!isEmployeePage && (
        <button className="btn-no" onClick={handleDeleteClick}>Delete</button>
      )}
    </div>
  );
};

export default CustomButtonComponent;
