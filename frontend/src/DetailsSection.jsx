import React from 'react';
import './Modal.css';

const DetailsSection = ({ row, additionalDetails }) => {
  return (
    <div className="details-section">
      <div className="details-left">
        <div className="details-upper">
          <h3>Row Details</h3>
          <p><strong>Zone:</strong> {row.Zone}</p>
          <p><strong>Price:</strong> {row.Price}</p>
          <p><strong>Phone Number:</strong> {row['Phone Number']}</p>
          <p><strong>Description:</strong> {row.Description}</p>
        </div>
        <div className="details-lower">
          <h3>Additional Details</h3>
          <p><strong>Street Number:</strong> {additionalDetails?.streetNumber}</p>
          <p><strong>Additional Details:</strong> {additionalDetails?.additionalDetails}</p>
        </div>
      </div>
      <div className="details-right">
        <h3>Additional Information</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Maecenas sit amet lacinia libero. Suspendisse potenti.</p>
        <p>Morbi vehicula, est eget cursus vestibulum, nulla ipsum varius urna, at tincidunt nisl metus nec erat. Nullam quis odio sit amet libero bibendum ultricies sit amet quis ex. Donec vehicula enim sit amet ipsum fermentum, non consequat tortor tristique. Integer a tincidunt lorem, eget pharetra elit.</p>
      </div>
    </div>
  );
};

export default DetailsSection;
