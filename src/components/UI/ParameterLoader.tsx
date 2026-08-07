interface ParameterLoaderProps {
  isVisible: boolean;
}

export function ParameterLoader({ isVisible }: ParameterLoaderProps) {
  if (!isVisible) return null;

  return (
    <div
      className="parameter-loader-overlay"
      role="status"
      aria-label="Analyzing satellite data"
      aria-live="polite"
    >
      <div className="loader" aria-hidden="true">
        <div className="intern" />
        <div className="external-shadow">
          <div className="central" />
        </div>
      </div>
      <span className="sr-only">Analyzing satellite data</span>
    </div>
  );
}
