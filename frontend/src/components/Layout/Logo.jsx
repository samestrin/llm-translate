import React from 'react';
import { Link } from 'react-router-dom';
import LogoMark from './LogoMark';

// The mark and the name, as in the family's `app-title`; it links home.
const Logo = () => (
  <Link to="/" aria-label="LLM Translate home" className="app-title">
    <LogoMark />
    <span>LLM Translate</span>
  </Link>
);

export default Logo;
