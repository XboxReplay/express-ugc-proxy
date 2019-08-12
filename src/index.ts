import * as express from 'express';
import Middleware from './middleware';

import {
    MiddlewareOptions,
    XBLAuthorizationGenerationMethod,
    XBLAuthorization
} from '..';

export const handle = (
    authorization: XBLAuthorization | XBLAuthorizationGenerationMethod,
    options: MiddlewareOptions
) => (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => new Middleware(req, res, next, options).handle(authorization);
