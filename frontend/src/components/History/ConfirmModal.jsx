import React from 'react';
import Modal from '../UI/Modal';

const ConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clear Translation History"
      description="Are you sure you want to clear your entire translation history? This action cannot be undone."
      primaryButtonText="Clear History"
      primaryButtonAction={onConfirm}
      primaryButtonProps={{ color: 'error' }}
      secondaryButtonText="Cancel"
    />
  );
};

export default ConfirmModal;