import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const badRequest = (m: string, code?: string) => new AppError(400, m, code)
export const unauthorized = (m = 'You need to sign in to do that.') => new AppError(401, m)
export const forbidden = (m = 'You do not have access to that.') => new AppError(403, m)
export const notFound = (m = 'Not found.') => new AppError(404, m)
export const conflict = (m: string, code?: string) => new AppError(409, m, code)

/** Wraps an async handler so a rejected promise reaches the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }
