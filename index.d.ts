import * as express from 'express';

declare namespace ExpressUGCProxy {
    export function handle(
        authenticate: XBLAuthenticateMethod,
        options?: MiddlewareOptions
    ): any;

    export type ErrorDetails = {
        statusCode?: number;
        reason?: string;
    };

    export type XBLAuthorization = {
        userHash: string;
        XSTSToken: string;
        [key: string]: any;
    };

    export type onRequestError = (
        details: ErrorDetails,
        res: express.Response,
        next: express.NextFunction
    ) => any;

    export type MiddlewareOptions = {
        debug?: boolean;
        onRequestError?: onRequestError;
        redirectOnFetch?: boolean;
    };

    export type XBLAuthenticateMethod = () => Promise<XBLAuthorization>;
}

export = ExpressUGCProxy;
