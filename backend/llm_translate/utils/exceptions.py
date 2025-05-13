"""
Custom exceptions for the llm-translate application.
"""
from enum import Enum
from typing import Optional


class ErrorType(Enum):
    """Enum for categorizing error types."""
    AUTHENTICATION = "authentication_error"
    RATE_LIMIT = "rate_limit_error"
    INVALID_REQUEST = "invalid_request_error"
    SERVICE_UNAVAILABLE = "service_unavailable_error"
    MODEL_ERROR = "model_error"
    NETWORK_ERROR = "network_error"
    DEPENDENCY_ERROR = "dependency_error"
    CONFIGURATION_ERROR = "configuration_error"
    # Add the missing error types
    API_ERROR = "api_error"
    CONNECTION = "connection_error"
    TIMEOUT = "timeout_error"
    BAD_REQUEST = "bad_request_error"
    UNKNOWN = "unknown_error"


class TranslationError(Exception):
    """
    Custom exception for translation errors.
    
    Attributes:
        message (str): Error message.
        error_type (ErrorType): Type of error.
        status_code (int): HTTP status code to return.
        original_exception (Exception, optional): Original exception that was caught.
    """
    
    def __init__(
        self, 
        message: str, 
        error_type: ErrorType = ErrorType.UNKNOWN, 
        status_code: int = 500,
        original_exception: Optional[Exception] = None
    ):
        """
        Initialize the TranslationError.
        
        Args:
            message (str): Error message.
            error_type (ErrorType, optional): Type of error. Defaults to ErrorType.UNKNOWN.
            status_code (int, optional): HTTP status code. Defaults to 500.
            original_exception (Exception, optional): Original exception. Defaults to None.
        """
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.original_exception = original_exception
        super().__init__(self.message)
    
    def to_dict(self):
        """
        Convert the exception to a dictionary for JSON response.
        
        Returns:
            dict: Dictionary representation of the error.
        """
        return {
            "error": {
                "type": self.error_type.value,
                "message": self.message,
                "details": str(self.original_exception) if self.original_exception else None
            }
        }