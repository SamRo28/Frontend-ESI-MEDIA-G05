import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// The Angular SSR engine will call the default export with a BootstrapContext.
// Make sure we accept that context and forward it to `bootstrapApplication` so
// server-only providers and rendering context are available (fixes NG0401).
export default function bootstrap(context: unknown) {
	return bootstrapApplication(App, config, context as any);
}
