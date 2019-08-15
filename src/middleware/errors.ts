import { XboxReplayError } from '@xboxreplay/errors';
import * as HTTPStatusCodes from './http-status-codes';

const errors = {
    internal: (
        message = 'Something went wrong...',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) => new XboxReplayError(message, { statusCode }),
    badImplementation: (
        message = 'Bad implementation, please fill an issue on http://bit.ly/xr-proxy-create-issue',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) => new XboxReplayError(message, { statusCode }),
    invalidParameters: (
        message = 'Invalid parameters',
        statusCode = HTTPStatusCodes.BAD_REQUEST
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'INVALID_PARAMETERS'
        }),
    invalidXBLAuthenticateMethod: (
        message = 'Missing or invalid XBL authenticate method',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'MISSING_OR_INVALID_AUTHENTICATION_METHOD'
        }),
    authorizationFetchFailed: (
        message = 'Could not fetch XBL authorization',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'XBL_AUTHORIZATION_FETCH_FAILED'
        }),
    fileFetchFailed: (
        message = 'Could not fetch specified file',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'FILE_FETCH_FAILED'
        }),
    proxyFailed: (
        message = 'Could not create a proxy for the specified file',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'PROXY_FAILED'
        }),
    missingAuthorization: (
        message = 'Missing XBL authorization',
        statusCode = HTTPStatusCodes.UNAUTHORIZED
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'MISSING_XBL_AUTHORIZATION'
        }),
    fileNotFound: (
        message = 'File not found',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'FILE_NOT_FOUND'
        }),
    mappedFileNameNotFound: (
        message = 'Mapped file name not found',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'MAPPED_FILE_NAME_NOT_FOUND'
        }),
    missingFileURIs: (
        message = 'Missing file URIs',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'MISSING_FILE_URIS'
        }),
    missingFileThumbnails: (
        message = 'Missing file thumbnails',
        statusCode = HTTPStatusCodes.NOT_FOUND
    ) =>
        new XboxReplayError(message, {
            statusCode,
            reason: 'MISSING_FILE_THUMBNAILS'
        }),
    cacheSetFailed: (
        message = 'Could not cache file metadata',
        statusCode = HTTPStatusCodes.INTERNAL_SERVER_ERROR
    ) => new XboxReplayError(message, { statusCode })
};

export = errors;
