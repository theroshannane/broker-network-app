import type { NextFunction, Request, Response } from "express";

// Central error-handling middleware. Must be registered last (after all
// routes) with app.use(errorHandler). Express 5 forwards both sync throws
// and rejected async handler promises here automatically.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal server error" });
}
