import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { QuestionManagementPage } from './pages/QuestionManagementPage';
import { PlayerPage } from './pages/PlayerPage';
import { PresentationScreen } from './components/presentation/PresentationScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Player join / game route */}
        <Route path="/join" element={<PlayerPage />} />
        {/* Admin dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Question Management dedicated page */}
        <Route path="/admin/questions" element={<QuestionManagementPage />} />
        {/* Projector / presentation screen */}
        <Route path="/present" element={<PresentationScreen />} />
        {/* Default: redirect to join */}
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
