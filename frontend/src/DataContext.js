import React, { createContext, useState } from 'react';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [validationData, setValidationData] = useState([]);

  return (
    <DataContext.Provider value={{ validationData, setValidationData }}>
      {children}
    </DataContext.Provider>
  );
};
