import React from 'react';

const SectionTitle = ({ children, subtitle }) => {
  return (
    <div className="text-center mb-12">
      <h2 className="font-mono text-3xl md:text-4xl font-bold uppercase">
        <span className="text-primary">&lt;</span>{children}<span className="text-primary">&gt;</span>
      </h2>
      {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default SectionTitle;