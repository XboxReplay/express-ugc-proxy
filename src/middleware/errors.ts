import * as HTTPStatusCodes from './http-status-codes';
import { ErrorDetails } from '../..';

export class ExpressUGCProxyError extends Error {
    static readonly details = {
        statusCode: HTTPStatusCodes.INTERNAL_SERVER_ERROR,
        reason: 'INTERNAL_SERVER_ERROR'
    };

    __XboxReplay__: boolean = true;
    extra: ErrorDetails = { ...ExpressUGCProxyError.details };

    constructor(message: string = '', extra: ErrorDetails = {}) {
        super(message);
        Error.captureStackTrace(this, ExpressUGCProxyError);
        this.name = 'ExpressUGCProxyError';
        this.extra = {
            ...this.extra,
            ...extra
        };
    }
}

export default {
    internal: (
        message = 'Something went wrong...',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) => new ExpressUGCProxyError(message, { statusCode }),
    incorrectParameters: (
        message = 'Incorrect parameters specified',
        statusCode = HTTPStatusCodes.BAD_REQUEST
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'INCORRECT_PARAMETERS'
        }),
    incorrectAuthenticationMethod: (
        message = 'Missing or invalid authentication method',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'MISSING_OR_INVALID_AUTHENTICATION_METHOD'
        }),
    authorizationFetchFailed: (
        message = 'Could not fetch XBL authorization',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'XBL_AUTHORIZATION_FETCH_FAILED'
        }),
    fileFetchFailed: (
        message = 'Could not fetch specified file',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'FILE_FETCH_FAILED'
        }),
    proxyFailed: (
        message = 'Could not create a proxy for the specified file',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'PROXY_FAILED'
        }),
    missingAuthorization: (
        message = 'Missing XBL authorization',
        statusCode = HTTPStatusCodes.UNAUTHORIZED
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'MISSING_XBL_AUTHORIZATION'
        }),
    fileNotFound: (
        message = 'File not found',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'FILE_NOT_FOUND'
        }),
    mappedFileNameNotFound: (
        message = 'Mapped file name not found',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'MAPPED_FILE_NAME_NOT_FOUND'
        }),
    missingFileURIs: (
        message = 'Missing file URIs',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'MISSING_FILE_URIS'
        }),
    missingFileThumbnails: (
        message = 'Missing file thumbnails',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new ExpressUGCProxyError(message, {
            statusCode,
            reason: 'MISSING_FILE_THUMBNAILS'
        })
};
