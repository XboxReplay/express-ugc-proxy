import * as express from 'express';
import * as proxy from 'http-proxy-middleware';
import * as XboxLiveAPI from '@xboxreplay/xboxlive-api';
import * as HTTPStatusCodes from '../http-status-codes';
import { isValidUUID, computeFileMetadataUri, isValidXUID } from './utils';
import { parse } from 'url';

import {
    MiddlewareOptions,
    ErrorDetails,
    XBLAuthorization,
    XBLAuthorizationGenerationMethod
} from '../..';

const USER_AGENT: string = [
    'Mozilla/5.0 (XboxReplay; ExpressUGCProxy/0.1)',
    'AppleWebKit/537.36 (KHTML, like Gecko)',
    'Chrome/71.0.3578.98 Safari/537.36'
].join(' ');

class Middleware {
    private readonly req: express.Request;
    private readonly res: express.Response;
    private readonly next: express.NextFunction;
    private readonly fileTypes = ['gameclips', 'screenshots'];
    private onRequestError: (details: ErrorDetails) => any;

    // TODO: Allow cache handling logic to prevent useless refetch at each request
    /**
        options.cache: { // redis or whatever
            get: userRedisInstance.get,
            set: userRedisInstance.set,
        }

        // Redis sample / draft
        options.cache.get('xboxreplay-gameclip-...', (err, reply) => {
            if (err) return cb(err);
            else if (reply === null) return cb(null, null);
            const parse = JSON.parse(reply);
            return reply;
        });

        options.cache.set('xboxreplay-gameclip-...', JSON.stringify({
            uris: { mp4: '...', 'thumbnailSmall': '...', '...' }
        }), 'EX', fileExpiration);
    **/

    constructor(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        options: MiddlewareOptions = {}
    ) {
        this.req = req;
        this.res = res;
        this.next = next;

        const { onRequestError, displayErrorReason = false } = options;

        this.onRequestError = (details: ErrorDetails) =>
            typeof onRequestError === 'function'
                ? onRequestError(details, this.res, this.next)
                : this.res
                      .status(details.statusCode)
                      .send(displayErrorReason ? details.reason : null);
    }

    public handle = async (
        authorization: XBLAuthorization | XBLAuthorizationGenerationMethod
    ) => {
        if (authorization === void 0 || authorization === null) {
            return this.onRequestError({
                statusCode: HTTPStatusCodes.UNAUTHORIZED,
                reason: 'MISSING_AUTHORIZATION'
            });
        } else if (typeof authorization === 'function') {
            const generateAuthorization = authorization;
            const response = await generateAuthorization().catch(() => null);

            if (response === null || typeof response !== 'object') {
                return this.onRequestError({
                    statusCode: HTTPStatusCodes.UNAUTHORIZED,
                    reason: 'EMPTY_AUTHORIZATION'
                });
            } else authorization = response;
        }

        const {
            type,
            xuid,
            scid,
            fileId,
            fileName // Will be used :)
        } = this.getRequestParameters();

        // TODO: Move validation outside this method
        if (type === null)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'MISSING_TYPE_PARAMETER'
            });
        else if (this.fileTypes.includes(type) === false) {
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'NON_SUPPORTED_TYPE_PARAMETER'
            });
        }

        if (xuid === null)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'MISSING_XUID_PARAMETER'
            });
        else if (isValidXUID(xuid) === false) {
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'INVALID_XUID_PARAMETER'
            });
        }

        if (scid === null)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'MISSING_SCID_PARAMETER'
            });
        else if (isValidUUID(scid) === false)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'INVALID_SCID_PARAMETER'
            });

        if (fileId === null)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'MISSING_FILE_ID_PARAMETER'
            });
        else if (isValidUUID(fileId) === false)
            return this.onRequestError({
                statusCode: HTTPStatusCodes.BAD_REQUEST,
                reason: 'INVALID_FILE_ID_PARAMETER'
            });

        // TODO: Improve
        return XboxLiveAPI.call<
            { screenshot: XboxLiveAPI.ScreenshotNode } & {
                gameClip: XboxLiveAPI.GameclipNode;
            }
        >(computeFileMetadataUri(type, xuid, scid, fileId), authorization)
            .then(response => {
                const { screenshot, gameClip } = response;

                if (screenshot === void 0 && gameClip === void 0) {
                    return this.onRequestError({
                        statusCode: HTTPStatusCodes.NOT_FOUND,
                        reason: 'FILE_NOT_FOUND'
                    });
                }

                // TODO: Improve + use fileName
                const fileUri =
                    screenshot !== void 0
                        ? screenshot.screenshotUris[0].uri
                        : gameClip.gameClipUris[0].uri;

                const { protocol, host, pathname, query } = parse(fileUri);

                return proxy({
                    target: `${protocol}//${host}${pathname}`,
                    pathRewrite: () => `?${query}`,
                    changeOrigin: true
                })(this.req, this.res, this.next);
            })
            .catch((err: Error & { extra: { [key: string]: any } }) =>
                this.onRequestError({
                    statusCode:
                        (err.extra && err.extra.statusCode) ||
                        HTTPStatusCodes.INTERNAL_SERVER_ERROR,
                    reason: (err.extra && err.extra.reason) || 'INTERNAL_ERROR'
                })
            );
    };

    private getRequestParameters = () => {
        const [
            type = null,
            xuid = null,
            scid = null,
            fileId = null,
            fileName = null
        ] = this.req.path.split('/').splice(1) as string[];

        return { type, xuid, scid, fileId, fileName };
    };
}

export default Middleware;
