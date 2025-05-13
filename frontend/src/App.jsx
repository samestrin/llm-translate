import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TooltipProvider } from './components/UI/Tooltip';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Settings from './pages/Settings';
import History from './pages/History';
import About from './pages/About';
import NotFound from './pages/NotFound';

function App() {
  console.log('App component rendering');
  
  return (
    <div>
      <ThemeProvider>
        <SettingsProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />                  
                  <Route path="/history" element={<History />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </BrowserRouter>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </SettingsProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
