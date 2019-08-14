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

    export type OnRequestError = (
        details: ErrorDetails,
        res: express.Response,
        next: express.NextFunction
    ) => any;

    export type FileTypesMapping = {
        gameclips?: string;
        screenshots?: string;
    };

    export type CacheGetter = (
        key: string,
        cb: (err: any, reply: any) => any
    ) => any;

    export type CacheSetter = (
        key: string,
        payload: string,
        cb: (err: any, reply: any) => any
    ) => any;

    export type MiddlewareOptions = {
        debug?: boolean;
        onRequestError?: OnRequestError;
        redirectOnFetch?: boolean;
        fileTypesMapping?: FileTypesMapping;
        cache?: {
            getter: CacheGetter;
            setter: CacheSetter;
        };
    };

    export type XBLAuthenticateMethod = () => Promise<XBLAuthorization>;
}

export = ExpressUGCProxy;
