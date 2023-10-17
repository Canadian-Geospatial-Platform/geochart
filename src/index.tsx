import App from './app';

export * from './chart-types';
export * from './chart-validator';
export * from './chart';

// Search for a special root in case we are loading the geochart standalone
const root = document.getElementById('root2aca7b6b288c') as HTMLElement;
if (root) {
  // Fetch the cgpv module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { react, createRoot } = cgpv;
  const container = createRoot(root);

  // Render
  container.render(
    <react.StrictMode>
      <App />
    </react.StrictMode>
  );
}
