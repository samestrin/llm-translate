import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-4">404</h1>
      <h2 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">Page Not Found</h2>
      <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;