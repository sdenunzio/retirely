import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { SpeculatorPage } from './pages/SpeculatorPage.jsx'
import { EstatePage } from './pages/EstatePage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<App />} />
        <Route path="/speculator" element={<SpeculatorPage />} />
        <Route path="/estate" element={<EstatePage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
