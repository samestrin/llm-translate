import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ToastProvider from './components/UI/ToastProvider';
import Layout from './components/Layout'; // This will use the index.js file
import Home from './pages/Home';
//import Settings from './pages/Settings';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import About from './pages/About';
import History from './pages/History';
import TTSInfo from './pages/TTSInfo';
import LLMInfo from './pages/LLMInfo';
import NotFound from './pages/NotFound';

function App({ children }) {
  console.log('App component rendering');
  
  return (
    <ThemeProvider>
      {children} {/* This will render the ThemeWrapper */}
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />                  
                <Route path="/history" element={<History />} />                
                <Route path="/terms" element={<Terms />} />                
                <Route path="/privacy" element={<Privacy />} />   
                <Route path="/about" element={<About />} />
                <Route path="/tts-info" element={<TTSInfo />} />
                <Route path="/llm-info" element={<LLMInfo />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
