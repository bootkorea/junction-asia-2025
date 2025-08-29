import React, { useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

/* === Motion === */
const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -52%) scale(.98); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;
const slideUp = keyframes`
  from { transform: translate(-50%, 16px); opacity: 0; }
  to   { transform: translate(-50%, 0);   opacity: 1; }
`;

/* === Backdrop === */
const Backdrop = styled.div`
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 100;
`;

/* 색상 토큰 */
const primary = '#BD0927'; // 강렬한 레드
const surface = '#1b1f2a';
const surface2 = '#232834';
const text = 'rgba(238, 244, 255, 0.95)';
const subtext = 'rgba(208, 216, 234, 0.75)';
const border = 'rgba(255,255,255,0.08)';

/* === Card === */
const ModalContent = styled.div`
  position: fixed; left: 50%;
  width: min(90vw, 440px);
  color: ${text};
  background: linear-gradient(180deg, ${surface2}, ${surface});
  border: 1px solid ${border};
  border-radius: 14px;
  padding: 24px 20px 20px;
  z-index: 101;

  box-shadow: 0 12px 32px rgba(0,0,0,.55);

  /* desktop: centered */
  top: 50%; transform: translate(-50%, -50%);
  animation: ${fadeIn} .22s ease-out;

  /* mobile: bottom sheet */
  @media (max-width: 480px) {
    bottom: env(safe-area-inset-bottom, 16px);
    top: auto; transform: translate(-50%, 0);
    width: calc(100vw - 24px);
    border-radius: 18px;
    animation: ${slideUp} .22s ease-out;
  }
`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
`;

const Title = styled.h3`
  margin: 0;
  font-weight: 700;
  font-size: 1.1rem;
  color: ${primary};
`;

const CloseIconBtn = styled.button`
  appearance: none;
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid ${border};
  background: rgba(255,255,255,.04);
  color: ${text};
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
  &:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.15); }
`;

const Message = styled.p`
  margin: 0 2px 20px;
  font-size: .95rem; line-height: 1.6;
  color: ${subtext};
`;

const Footer = styled.div`
  display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
`;

const buttonBase = css`
  appearance: none; border-radius: 10px;
  padding: 12px 16px; min-width: 110px;
  font-weight: 600; font-size: .95rem;
  border: 1px solid ${border};
  cursor: pointer;
  transition: background .18s ease, border-color .18s ease;
`;

const Button = styled.button`
  ${buttonBase}
  ${({variant}) =>
    variant === 'primary'
      ? css`
          background: ${primary};
          border: none;
          color: #fff;
          &:hover { background: #a10720; }
        `
      : css`
          background: rgba(255,255,255,.04);
          color: ${text};
          &:hover { background: rgba(255,255,255,.08); }
        `}
`;

const XIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* === Component === */
export default function AlertModal({ isOpen, onClose, title, message, confirmText = '확인' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus({ preventScroll: true });
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Backdrop onClick={onClose}>
      <ModalContent ref={ref} onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{title}</Title>
          <CloseIconBtn onClick={onClose}><XIcon /></CloseIconBtn>
        </Header>

        <Message>{message}</Message>

        <Footer>
          <Button variant="primary" onClick={onClose}>{confirmText}</Button>
        </Footer>
      </ModalContent>
    </Backdrop>
  );
}
