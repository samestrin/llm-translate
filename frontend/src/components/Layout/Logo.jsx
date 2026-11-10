import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';

const Logo = () => (
  <Link
    to="/"
    aria-label="LLM Translate home"
    className="inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight text-ink"
  >
    <Globe size={26} className="text-brand" aria-hidden="true" />
    <span className="max-sm:sr-only">LLM Translate</span>
  </Link>
);

export default Logo;
