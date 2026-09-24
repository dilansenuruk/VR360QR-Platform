// Vercel entry point: turns our Express app into a serverless function.
// Every request to /api/* (see vercel.json) is routed here; Vercel invokes
// the exported Express app directly as a request handler.
import app from '../server/app.ts';

export default app;
