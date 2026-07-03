import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import { SpeculatorPage } from './pages/SpeculatorPage.jsx'
import { EstatePage } from './pages/EstatePage.jsx'
import './index.css'

// The marketing site (Home, Articles, topic pages) is static HTML. The SPA only
// boots on the app routes below, each served by its own pre-rendered shell.
// `/` is the static Home page; if the SPA ever loads there (e.g. a client-side
// navigation), send it to the calculator.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/calculator" element={<App />} />
        <Route path="/speculator"  element={<SpeculatorPage />} />
        <Route path="/estate"      element={<EstatePage />} />
        <Route path="/"            element={<Navigate to="/calculator" replace />} />
        <Route path="*"            element={<Navigate to="/calculator" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
