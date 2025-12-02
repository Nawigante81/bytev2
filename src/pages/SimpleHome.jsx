import React from 'react';

const SimpleHome = () => {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1 style={{ color: '#00ffff', fontSize: '48px', marginBottom: '20px' }}>
        ByteClinic
      </h1>
      <p style={{ fontSize: '24px', color: '#00ff88', marginBottom: '30px' }}>
        Serwis, który ogarnia temat.
      </p>
      <div style={{ 
        backgroundColor: 'rgba(0,255,255,0.1)', 
        padding: '30px', 
        borderRadius: '10px',
        border: '2px solid #00ffff'
      }}>
        <h2 style={{ color: 'white', marginBottom: '15px' }}>Strona działa!</h2>
        <p style={{ color: '#ccc' }}>
          Aplikacja została załadowana poprawnie. Wszystkie komponenty działają.
        </p>
      </div>
    </div>
  );
};

export default SimpleHome;
