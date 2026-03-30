import React from 'react';
import GlobalLayout from './components/layout/GlobalLayout';

function App() {
  return (
    <GlobalLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-6xl font-headline mb-8 tracking-tighter">
          LiteCMS <span className="text-primary italic">Live</span>
        </h1>
        <p className="text-on-surface-variant text-xl max-w-2xl leading-relaxed">
          The public-facing frontend is now initialized and ready to render components from the Visual Builder.
        </p>
      </div>
    </GlobalLayout>
  );
}

export default App;
