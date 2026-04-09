import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';

/**
 * Props for the YesNoModal component.
 */
export interface YesNoModalProps {
    message: string;
    onYes: () => void;
    onNo: () => void;
    open: boolean;
}

/**
 * Renders a modal dialog with a message and Yes/No buttons.
 * @param props - The props for the YesNoModal component.
 *   - message: The message to display in the modal.
 *   - onYes: Callback when the user clicks "Yes".
 *   - onNo: Callback when the user clicks "No".
 *   - open: Whether the modal is open.
 */
export function YesNoModal({ message, onYes, onNo, open }: YesNoModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (open) setIsOpen(true);
        else setIsOpen(false);
    }, [open]);

    const handleYes = () => {
        setIsOpen(false);
        onYes();
    };

    const handleNo = () => {
        setIsOpen(false);
        onNo();
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={() => setIsOpen(false)}>
            <div>
                <div>{message}</div>
                <button onClick={handleYes}>Yes</button>
                <button onClick={handleNo}>No</button>
            </div>
        </Modal>
    );
}

export default YesNoModal;
