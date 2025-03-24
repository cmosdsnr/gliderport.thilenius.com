import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';

const YesNoModal = ({ message, onYes, onNo, open }: any) => {
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
};

export default YesNoModal;
