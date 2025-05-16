import React from 'react';

const TTSInfo = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">How TTS Models Handle Foreign Languages</h1>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Universal Phonetic Representations</h2>
        <p className="mb-4">
          TTS models typically operate by converting text into intermediate phonetic representations (like the International Phonetic Alphabet or similar systems) before generating audio. These phonetic systems capture sounds that exist across languages, which gives the model a foundation for pronouncing unfamiliar languages.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Cross-lingual Training Data</h2>
        <p className="mb-4">
          Modern neural TTS models are often trained on multilingual datasets containing speech samples from many languages. This exposure allows them to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Learn phonetic patterns that exist across language boundaries</li>
          <li>Recognize how different character combinations map to sounds in various languages</li>
          <li>Build internal representations of language-specific pronunciation rules</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Grapheme-to-Phoneme Conversion</h2>
        <p className="mb-4">
          When a TTS model encounters text in a language it wasn't explicitly designed for, it attempts to map the written characters (graphemes) to the closest equivalent sounds (phonemes) in its known repertoire. This is why a primarily English TTS system might reasonably pronounce Spanish or Italian words - the Latin alphabet and many sounds are shared.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Why It's "Nearly" Correct</h2>
        <p className="mb-4">
          When you notice a TTS system producing "nearly correct" pronunciations for languages it wasn't specifically optimized for, you're observing:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Sound approximation</strong>: The model is mapping unfamiliar sounds to the closest sounds it knows</li>
          <li><strong>Accent transfer</strong>: The base language's prosody and phonetic tendencies "leak" into the foreign pronunciation</li>
          <li><strong>Rule generalization</strong>: The model applies pronunciation patterns it learned from its primary languages</li>
        </ol>
        <p className="mt-4">
          This is why a primarily English TTS system might handle Spanish reasonably well (shared alphabet, many similar sounds) but struggle more with Mandarin Chinese or Arabic (different writing systems, more unique phonemes).
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Limitations</h2>
        <p className="mb-4">
          Despite this impressive capability, TTS models do have limitations with foreign languages:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>They might miss language-specific tones (crucial in languages like Mandarin)</li>
          <li>They often apply incorrect stress patterns</li>
          <li>They struggle with phonemes that don't exist in their primary training languages</li>
          <li>They may mispronounce language-specific letter combinations</li>
        </ul>

      </div>
    </div>
  );
};

export default TTSInfo;