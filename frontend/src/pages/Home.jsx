import React, { useEffect } from 'react';
import TranslationInterface from '../components/Translation/TranslationInterface';
import useTranslation from '../hooks/useTranslation';

const Home = () => {
  const translationProps = useTranslation(); // Use the hook here
  const { loadFromHistory, translationInitiated } = translationProps;

  // Check if there's a selected history item to load
  useEffect(() => {
    console.log('Home useEffect for history check');
    const selectedHistoryItem = sessionStorage.getItem('selectedHistoryItem');
    
    if (selectedHistoryItem) {
      try {
        const historyItem = JSON.parse(selectedHistoryItem);
        console.log('Loading history item from session storage:', historyItem);
        loadFromHistory(historyItem);
        // Clear the session storage after loading
        sessionStorage.removeItem('selectedHistoryItem');
      } catch (error) {
        console.error('Error loading history item:', error);
      }
    }
  }, [loadFromHistory]); // loadFromHistory is stable

  // This console log helps confirm how many times Home (and thus useTranslation) renders
  console.log('Home component rendering. Translation initiated:', translationInitiated?.current);

  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold mb-6 text-center">LLM Translate</h1>
      <p className="text-center text-secondary-600 dark:text-secondary-400 mb-8">
        Translate text between languages using advanced AI models
      </p>
      
      {/* Pass all props from useTranslation to TranslationInterface */}
      <TranslationInterface {...translationProps} />
    </div>
  );
};

export default Home;