import multer from 'multer';
import createHttpError from 'http-errors';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(createHttpError(400, 'Only images allowed'));
      return;
    }
    cb(null, true);
  },
});
