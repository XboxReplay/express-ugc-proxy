import * as express from 'express';

declare namespace ExpressUGCProxy {
    export type XBLAuthorization = {
        userHash: string;
        XSTSToken: string;
    };

    export type XBLAuthorizationGenerationMethod = () => Promise<
        XBLAuthorization
    >;

    export type ErrorDetails = {
        statusCode: number;
        reason: string;
    };

    export type MiddlewareOptions = {
        displayErrorReason?: boolean;
        onRequestError?: (
            details: ErrorDetails,
            res: express.Response,
            next: express.NextFunction
        ) => void;
    };
}

export = ExpressUGCProxy;
