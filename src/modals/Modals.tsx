import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import LoginModal from './LoginModal'
import SignUpModal from './SignUpModal'
import ForgotPasswordModal from './ForgotPasswordModal'
import ChangeEmailModal from './ChangeEmailModal'
import ChangePasswordModal from './ChangePasswordModal'

export enum ModalType {
    None = 'None',
    Login = 'Login',
    SignUp = 'SignUp',
    ResetPassword = 'ResetPassword',
    ChangeEmail = 'ChangeEmail',
    ChangePassword = 'ChangePassword',
}

type ModalContextType = {
    modal: ModalType;
    openModal: (modalType: ModalType) => void;
    closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [modal, setModal] = useState<ModalType>(ModalType.None);
    const openModal = (modalType: ModalType) => setModal(modalType);
    const closeModal = () => setModal(ModalType.None);

    return (
        <ModalContext.Provider value={{ modal, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};



export default function Modals() {
    const { modal } = useModal();

    const renderModal = () => {
        switch (modal) {
            case ModalType.Login:
                return <LoginModal />;
            case ModalType.SignUp:
                return <SignUpModal />;
            case ModalType.ResetPassword:
                return <ForgotPasswordModal />;
            case ModalType.ChangeEmail:
                return <ChangeEmailModal />;
            case ModalType.ChangePassword:
                return <ChangePasswordModal />;
            default:
                return null;
        }
    };

    return <>{renderModal()}</>;

}