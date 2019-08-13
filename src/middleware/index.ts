import * as express from 'express';
import * as proxy from 'http-proxy-middleware';
import * as XboxLiveAPI from '@xboxreplay/xboxlive-api';
import * as validations from './validations';
import errors, { ExpressUGCProxyError } from './errors';
import { extractErrorDetails, computeFileMetadataUri } from './utils';
import { parse } from 'url';

import {
    fileTypes,
    gameclipFileNames,
    screenshotFileNames
} from './file-definitions';

import {
    MiddlewareOptions,
    XBLAuthenticateMethod,
    XBLAuthorization,
    ErrorDetails,
    onRequestError
} from '../..';

type ResolveXBLAuthorizationSuccessResponse = {
    success: true;
    authorization: XBLAuthorization;
};

type ResolveXBLAuthorizationFailureResponse = {
    success: false;
    error: ExpressUGCProxyError;
};

type ResolveXBLAuthorizationResponse =
    | ResolveXBLAuthorizationSuccessResponse
    | ResolveXBLAuthorizationFailureResponse;

type FetchGameclipSuccessResponse = {
    success: true;
    metadata: XboxLiveAPI.GameclipNode;
};

type FetchScreenshotSuccessResponse = {
    success: true;
    metadata: XboxLiveAPI.ScreenshotNode;
};

type FetchFileFailureResponse = {
    success: false;
    error: ExpressUGCProxyError;
};

type FetchFileResponse =
    | FetchGameclipSuccessResponse
    | FetchScreenshotSuccessResponse
    | FetchFileFailureResponse;

class Middleware {
    private authorization: XBLAuthorization | null = null;
    private readonly req: express.Request;
    private readonly res: express.Response;
    private readonly next: express.NextFunction;
    private readonly debug: boolean;
    private readonly redirectOnSuccess: boolean;
    private readonly onRequestError: onRequestError;

    constructor(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        options: MiddlewareOptions = {}
    ) {
        this.req = req;
        this.res = res;
        this.next = next;

        const { debug, onRequestError, redirectOnSuccess } = options;

        this.res.setHeader('X-Powered-By', 'XboxReplay.net');
        this.redirectOnSuccess = !!redirectOnSuccess;
        this.debug = !!debug;

        const { statusCode, reason } = ExpressUGCProxyError.details;

        if (typeof onRequestError === 'function') {
            this.onRequestError = onRequestError;
        } else
            this.onRequestError = (details: ErrorDetails) =>
                this.res
                    .status(details.statusCode || statusCode)
                    .send(this.debug ? details.reason || reason : null);
    }

    handle = async (authenticate: XBLAuthenticateMethod) => {
        if (typeof authenticate !== 'function') {
            return this.continue(errors.incorrectAuthenticationMethod());
        }

        const onAuthenticate = await this.resolveXBLAuthorization(authenticate);

        if (onAuthenticate.success === false) {
            return this.continue(onAuthenticate.error);
        }

        this.setAuthorization(onAuthenticate.authorization);
        const parameters = this.getParameters();

        if (parameters === null) {
            return this.continue(errors.badRequest());
        }

        const onFileFetch = await this.fetchFile(
            parameters.type,
            parameters.xuid,
            parameters.scid,
            parameters.id
        );

        if (onFileFetch.success === false) {
            return this.continue(onFileFetch.error);
        }

        const fileUris =
            parameters.type === 'gameclips'
                ? (onFileFetch.metadata as XboxLiveAPI.GameclipNode)
                      .gameClipUris
                : (onFileFetch.metadata as XboxLiveAPI.ScreenshotNode)
                      .screenshotUris;

        const { thumbnails } = onFileFetch.metadata;

        if ((fileUris || []).length === 0) {
            return this.continue(errors.missingFileUris());
        } else if ((thumbnails || []).length === 0) {
            return this.continue(errors.missingFileThumbnails());
        }

        const targetedFileUri = this.getFileUriByName(
            parameters.name,
            fileUris,
            thumbnails
        );

        if (targetedFileUri === null) {
            return this.continue(errors.fileNameNotFound());
        } else if (this.redirectOnSuccess === true) {
            return this.res.redirect(302, targetedFileUri);
        }

        const { protocol, host, pathname, query } = parse(targetedFileUri);

        // prettier-ignore
        try { return this.createProxy(`${protocol}//${host}${pathname}`, query); }
        catch (err) { return this.continue(errors.internal(err.message)); }
    };

    private createProxy = (target: string, query: string | null) =>
        proxy({
            target,
            pathRewrite: () => (query !== null ? `?${query}` : ''),
            changeOrigin: true
        })(this.req, this.res, this.next);

    private getParameters = () => {
        const [
            type = null,
            xuid = null,
            scid = null,
            id = null,
            name = null
        ] = this.req.path.split('/').splice(1) as string[];

        const hasInvalidParameters = [
            validations.isValidFileType(type),
            validations.isValidOwnerXUID(xuid),
            validations.isValidFileScid(scid),
            validations.isValidFileId(id),
            validations.isValidFileNameForType(name, type)
        ].includes(false);

        if (hasInvalidParameters === true) {
            return null;
        }

        const t = type as typeof fileTypes[number];
        const n =
            t === 'gameclips'
                ? (name as typeof gameclipFileNames[number])
                : (name as typeof screenshotFileNames[number]);

        const parameters = {
            type: t,
            xuid: xuid as string,
            scid: scid as string,
            id: id as string,
            name: n
        };

        return parameters;
    };

    private getFileUriByName = (
        name:
            | typeof gameclipFileNames[number]
            | typeof screenshotFileNames[number],
        uris: XboxLiveAPI.MediaUri[],
        thumbnails: XboxLiveAPI.MediaThumbnail[]
    ) => {
        switch (name) {
            case 'gameclip.mp4':
            case 'screenshot.png':
                return uris[0].uri;
            case 'thumbnail-large.png':
                const filterLargeThumbnail = thumbnails.filter(
                    thumbnail => thumbnail.thumbnailType === 'Large'
                )[0];

                return filterLargeThumbnail !== void 0
                    ? filterLargeThumbnail.uri
                    : null;
            case 'thumbnail-small.png':
                const filterSmallThumbnail = thumbnails.filter(
                    thumbnail => thumbnail.thumbnailType === 'Small'
                )[0];

                return filterSmallThumbnail !== void 0
                    ? filterSmallThumbnail.uri
                    : null;
            default:
                return null;
        }
    };

    private setAuthorization = (authorization: XBLAuthorization) => {
        this.authorization = authorization;
        return this;
    };

    private resolveXBLAuthorization = (
        authenticate: XBLAuthenticateMethod
    ): Promise<ResolveXBLAuthorizationResponse> =>
        new Promise(resolve => {
            return authenticate()
                .then(authorization =>
                    resolve({
                        success: true,
                        authorization
                    })
                )
                .catch(err =>
                    resolve({
                        success: false,
                        error: errors.authorizationFetchFailed(err.message)
                    })
                );
        });

    private fetchFile = (
        type: typeof fileTypes[number],
        xuid: string,
        scid: string,
        id: string
    ): Promise<FetchFileResponse> => {
        if (this.authorization === null) {
            return Promise.resolve({
                success: false,
                error: errors.missingAuthorization()
            });
        }

        if (type === 'gameclips')
            return this.fetchGameclip(
                this.authorization,
                { xuid, scid, id },
                (metadata: XboxLiveAPI.GameclipNode) => ({
                    success: true,
                    metadata
                }),
                (error: ExpressUGCProxyError) => ({
                    success: false,
                    error
                })
            );

        if (type === 'screenshots')
            return this.fetchScreenshot(
                this.authorization,
                { xuid, scid, id },
                (metadata: XboxLiveAPI.ScreenshotNode) => ({
                    success: true,
                    metadata
                }),
                (error: ExpressUGCProxyError) => ({
                    success: false,
                    error
                })
            );

        return Promise.resolve({
            success: false,
            error: errors.internal()
        });
    };

    private fetchGameclip = (
        authorization: XBLAuthorization,
        properties: { xuid: string; scid: string; id: string },
        onSuccess: (
            metadata: XboxLiveAPI.GameclipNode
        ) => FetchGameclipSuccessResponse,
        onError: (error: ExpressUGCProxyError) => FetchFileFailureResponse
    ) =>
        XboxLiveAPI.call<{ gameClip?: XboxLiveAPI.GameclipNode }>(
            computeFileMetadataUri(
                'gameclips',
                properties.xuid,
                properties.scid,
                properties.id
            ),
            authorization
        )
            .then(response =>
                response.gameClip === void 0
                    ? onError(errors.fileNotFound())
                    : onSuccess(response.gameClip)
            )
            .catch(() => onError(errors.fileFetchFailed()));

    private fetchScreenshot = (
        authorization: XBLAuthorization,
        properties: { xuid: string; scid: string; id: string },
        onSuccess: (
            metadata: XboxLiveAPI.ScreenshotNode
        ) => FetchScreenshotSuccessResponse,
        onError: (error: ExpressUGCProxyError) => FetchFileFailureResponse
    ) =>
        XboxLiveAPI.call<{ screenshot?: XboxLiveAPI.ScreenshotNode }>(
            computeFileMetadataUri(
                'screenshots',
                properties.xuid,
                properties.scid,
                properties.id
            ),
            authorization
        )
            .then(response =>
                response.screenshot === void 0
                    ? onError(errors.fileNotFound())
                    : onSuccess(response.screenshot)
            )
            .catch(() => onError(errors.fileFetchFailed()));

    private continue = (err: ExpressUGCProxyError) => {
        if (this.debug) {
            console.error(err);
        }

        return this.onRequestError(
            extractErrorDetails(err),
            this.res,
            this.next
        );
    };
}

export default Middleware;
