import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, Settings, History, Home, Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'History', href: '/history', icon: History }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white transition-colors duration-200">
      {/* Header with gradient background */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 text-white shadow-lg relative">
        {/* Decorative dots overlay pattern */}
        <div className="absolute inset-0 bg-dot-pattern bg-dot-sm opacity-10"></div>
        
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between">
            {/* Logo and Title with animation */}
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-white animate-pulse-slow" />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-primary-100">
                LLM Translate
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-white/20 backdrop-blur-sm shadow-soft'
                      : 'hover:bg-white/10 hover:scale-105'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
              
              {/* Theme Toggle with animation */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 focus:outline-none transition-all duration-200"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-200" />
                ) : (
                  <Moon className="h-5 w-5 text-primary-100" />
                )}
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleTheme}
                className="p-2 mr-2 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none transition-all duration-200"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5 text-yellow-200" />
                ) : (
                  <Moon className="h-5 w-5 text-primary-100" />
                )}
              </button>
              
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md bg-white/10 hover:bg-white/20 focus:outline-none transition-all duration-200"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label="Open main menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu with animation */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden animate-fade-in">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content with improved spacing */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      {/* Footer with gradient */}
      <footer className="bg-gradient-to-r from-secondary-100 to-secondary-200 dark:from-secondary-800 dark:to-secondary-900 py-6 shadow-inner">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-secondary-600 dark:text-secondary-400">
          <p className="mb-2 md:mb-0">© {new Date().getFullYear()} LLM Translate. All rights reserved.</p>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;