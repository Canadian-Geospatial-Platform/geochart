import App from './app';
import { SchemaValidator } from './chart-schema-validator';

// Export the types from the package
export * from './chart-types';
export * from './chart-parsing';
export * from './chart-schema-validator';
export * from './chart';

// Search for a special root in case we are loading the geochart standalone
const root = document.getElementById('root2aca7b6b288c') as HTMLElement;
if (root) {
  // Can't type the window object to a 'TypeWindow', because we don't have access to the cgpv library when this line runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Fetch the cgpv module
  const { cgpv } = w;
  const { react, createRoot } = cgpv;
  const container = createRoot(root);

  // Create the schema validator object
  const schemaValidator = new SchemaValidator();

  // Render
  container.render(
    <react.StrictMode>
      <App schemaValidator={schemaValidator} />
    </react.StrictMode>
  );
}
