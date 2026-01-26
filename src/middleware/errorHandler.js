import createHttpError from 'http-errors';

export const errorHandler = (err, req, res, next) => {
  let status = 500;
  let message = 'Server error';

  if (createHttpError.isHttpError(err)) {
    status = err.status;
    message = err.message || 'Http Error';
  } else if (err instanceof Error) {
    message = err.message;
  }

  res.status(status).json({ message });
};
