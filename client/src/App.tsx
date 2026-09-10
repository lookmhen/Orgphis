import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Targets } from './pages/Targets';
import { TemplateLibrary } from './pages/TemplateLibrary';
import { SmtpProfiles } from './pages/SmtpProfiles';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/templates" element={<TemplateLibrary />} />
          <Route path="/smtp" element={<SmtpProfiles />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
