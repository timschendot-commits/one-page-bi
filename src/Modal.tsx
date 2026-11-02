import { useRef, useEffect, type ReactNode } from "react";
import { useLanguage, LanguageButton } from "./language";
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="modalhead">
        <h2>{title}</h2>
        <LanguageButton />
        <button aria-label={t("Close")} onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
