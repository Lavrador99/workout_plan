import { Component, type ReactNode } from "react";
import PageHeader from "./PageHeader";

/** While a page reads its data: shows the shape of what is coming, not a blank screen. */
export function PageLoading({ title, back }: { title: ReactNode; back?: string[] }) {
  return (
    <>
      <PageHeader title={title} back={back} />
      <div className="page" role="status" aria-label="A carregar">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-16 animate-pulse bg-card2" />
        ))}
      </div>
    </>
  );
}

/** A page that broke must not take the app down: the data is safe on the device. */
export class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page" role="alert">
        <div className="card p-4 flex flex-col gap-2 items-start">
          <h1 className="font-bold">Esta página não abriu</h1>
          <p className="text-sm text-muted">Os teus dados continuam guardados neste aparelho.</p>
          <button type="button" className="btn-accent" onClick={() => location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
