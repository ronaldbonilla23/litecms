import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EngineRenderer from './components/EngineRenderer';

import SinglePost from './components/SinglePost';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta para posts específicos del blog */}
        <Route path="/blog/:slug" element={<SinglePost />} />
        {/* Ruta principal del sitio web que ven los usuarios */}
        <Route path="*" element={<EngineRenderer />} />
      </Routes>
    </Router>
  );
}

export default App;
