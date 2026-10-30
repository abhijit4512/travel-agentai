import { Component, ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: "" };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
  componentDidCatch(error: unknown) { console.error("UI error:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container page" role="alert">
        <h1>Something went wrong</h1>
        <p className="muted">The page hit an unexpected error. Your saved trips are safe.</p>
        {import.meta.env.DEV && <pre className="notice error" style={{ whiteSpace: "pre-wrap" }}>{this.state.message}</pre>}
        <p className="row"><button className="btn primary" onClick={() => window.location.reload()}>Reload the page</button><a className="btn" href="/">Go home</a></p>
      </div>
    );
  }
}