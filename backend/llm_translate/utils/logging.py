"""
Logging utility module for llm-translate.
"""
import logging
import os
import sys
from typing import Optional


def setup_logger(name: str = "llm_translate", level: Optional[int] = None) -> logging.Logger:
    """
    Set up and configure a logger.
    
    Args:
        name (str, optional): Logger name. Defaults to "llm_translate".
        level (int, optional): Logging level. Defaults to INFO or value from LOG_LEVEL env var.
        
    Returns:
        logging.Logger: Configured logger instance.
    """
    # Get log level from environment or use INFO as default
    if level is None:
        level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create console handler if logger doesn't have handlers yet
    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(console_handler)
    
    return logger