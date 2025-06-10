import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import LoginModal from './LoginModal'
import SignUpModal from './SignUpModal'
import ForgotPasswordModal from './ForgotPasswordModal'
import ChangeEmailModal from './ChangeEmailModal'
import ChangePasswordModal from './ChangePasswordModal'

/**
 * Enum representing the different modal types available in the application.
 */
export enum ModalType {
    None = 'None',
    Login = 'Login',
    SignUp = 'SignUp',
    ResetPassword = 'ResetPassword',
    ChangeEmail = 'ChangeEmail',
    ChangePassword = 'ChangePassword',
}

/**
 * The context type for modal state and modal control functions.
 */
type ModalContextType = {
    modal: ModalType;
    openModal: (modalType: ModalType) => void;
    closeModal: () => void;
};

/**
 * React Context for managing modal state.
 */
const ModalContext = createContext<ModalContextType | undefined>(undefined);

/**
 * ModalProvider component that wraps its children with modal state/context.
 * @param children - The child components that will have access to the modal context.
 */
export function ModalProvider({ children }: { children: ReactNode }) {
    const [modal, setModal] = useState<ModalType>(ModalType.None);
    /**
     * Opens a modal of the specified type.
     * @param modalType - The type of modal to open.
     */
    const openModal = (modalType: ModalType) => setModal(modalType);
    /**
     * Closes any open modal.
     */
    const closeModal = () => setModal(ModalType.None);

    return (
        <ModalContext.Provider value={{ modal, openModal, closeModal }}>
            {children}
        </ModalContext.Provider>
    );
}

/**
 * Custom hook to access the modal context.
 * @throws Error if used outside of a ModalProvider.
 * @returns The modal context value.
 */
export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}

/**
 * Main component that renders the currently active modal.
 * @returns {React.ReactElement} The modal component corresponding to the current modal state, or null if none is open.
 */
export function Modals(): React.ReactElement {
    const { modal } = useModal();

    /**
     * Renders the modal component based on the current modal type.
     */
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

export default Modals;