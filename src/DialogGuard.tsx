import { Component, type ReactNode } from "react";
import { Modal } from "./Modal";
import { translator, type Language } from "./i18n";

// Keep the materials and archive state mounted if a single dialog fails to render.
function DialogContents({ render }: { render: () => ReactNode }) {
  return render();
}
export class DialogGuard extends Component<
  { render: () => ReactNode; close: () => void; language: Language },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed)
      return <DialogContents render={this.props.render} />;
    const t = translator(this.props.language);
    return (
      <Modal title={t("Report workbench")} onClose={this.props.close}>
        <p role="alert">
          {t(
            "This panel could not be displayed. Your files are still on the grid.",
          )}
        </p>
        <button onClick={this.props.close}>{t("Back to workbench")}</button>
      </Modal>
    );
  }
}
