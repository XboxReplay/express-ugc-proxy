import * as express from 'express';
import Middleware from './middleware';
import { MiddlewareOptions, XBLAuthenticateMethod } from '..';

export const handle = (
    authenticate: XBLAuthenticateMethod,
    options: MiddlewareOptions
) => (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) =>
    new Middleware(req, res, next, options)
        .handle(authenticate)
        .catch(err => next(err));
