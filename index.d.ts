import * as express from 'express';

declare namespace ExpressUGCProxy {
    export type ErrorDetails = {
        statusCode?: number;
        reason?: string;
    };

    export type XBLAuthorization = {
        userHash: string;
        XSTSToken: string;
        userXUID?: string;
        expiresOn?: string;
    };

    export type onRequestError = (
        details: ErrorDetails,
        res: express.Response,
        next: express.NextFunction
    ) => any;

    export type MiddlewareOptions = {
        debug?: boolean;
        onRequestError?: onRequestError;
        redirectOnSuccess?: boolean;
    };

    export type XBLAuthenticateMethod = () => Promise<XBLAuthorization>;
}

export = ExpressUGCProxy;
