import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EngineRenderer from './components/EngineRenderer';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta principal del sitio web que ven los usuarios */}
        <Route path="/" element={<EngineRenderer />} />
      </Routes>
    </Router>
  );
}

export default App;
