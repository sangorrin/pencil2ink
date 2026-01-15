import React from 'react';
import './ThankYouScreen.css';

interface ThankYouScreenProps {
  onStartOver: () => void;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({ onStartOver }) => {
  return (
    <div className="thankyou-container">
      <div className="success-checkmark">
        <svg viewBox="0 0 52 52">
          <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
          <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>

      <h1 className="thankyou-title">Thank You!</h1>
      <p className="thankyou-message">
        Your image has been successfully downloaded.
        <br />
        We hope you enjoyed using Pencil2Ink!
      </p>

      <button className="btn-restart" onClick={onStartOver}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Start Over
      </button>

      <div className="thankyou-footer">
        <p>Built with ❤️ for artists and creators</p>
      </div>
    </div>
  );
};
