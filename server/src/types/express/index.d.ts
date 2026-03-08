import { IUser } from '../../models/User';
import { File as MulterFile } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      file?: MulterFile;
    }
  }
}

export {};
