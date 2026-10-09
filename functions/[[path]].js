// The only file under functions/: every routed path (/auth/*, /admin, /admin/*) goes to server/app.js.
import { handle } from '../server/app.js';

export const onRequest = ctx => handle(ctx.request, ctx.env, p => ctx.waitUntil(p));
