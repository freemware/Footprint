import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * If a part of the page fails to draw, show what happened instead of a blank screen.
 * The message holds no export data, only the error text, so it is safe to share.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-16 max-w-[640px] rounded-2xl border border-critical/50 bg-critical/10 p-6 text-ink">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-5 text-critical" aria-hidden /> Something on this page didn’t load.
        </p>
        <p className="mt-2 text-ink-2">Your data hasn’t gone anywhere. Try going back, or share this message so it can be fixed:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-3 text-[12px] whitespace-pre-wrap text-ink-2">{`${error.name}: ${error.message}`}</pre>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset?.();
          }}
          className="mt-4 inline-flex h-10 items-center rounded-xl border border-line-strong px-4 font-medium hover:bg-surface-2"
        >
          Go back
        </button>
      </div>
    );
  }
}
