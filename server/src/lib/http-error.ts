export type FieldErrors = Record<string, string>;

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: FieldErrors,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', fields?: FieldErrors) =>
  new HttpError(400, code, message, fields);
export const unauthorized = (message = 'Please log in to continue') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do this') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Record') => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (message: string, code = 'CONFLICT', fields?: FieldErrors) =>
  new HttpError(409, code, message, fields);
export const unprocessable = (message: string, fields?: FieldErrors, code = 'VALIDATION_ERROR') =>
  new HttpError(422, code, message, fields);
