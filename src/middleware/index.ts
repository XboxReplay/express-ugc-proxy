import * as express from 'express';
import * as proxy from 'http-proxy-middleware';
import * as XboxLiveAPI from '@xboxreplay/xboxlive-api';
import * as validations from './validations';
import * as errors from './errors';
import { XboxReplayError } from '@xboxreplay/errors';
import { parse } from 'url';

import {
    extractErrorDetails,
    computeFileMetadataUri,
    safeJSONParse,
    sha1,
    extractLangFromRequest
} from './utils';

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
    OnRequestError,
    FileTypesMapping,
    CacheGetter,
    CacheSetter
} from '../..';

type Parameters = {
    type: typeof fileTypes[number];
    xuid: string;
    scid: string;
    id: string;
    name: string;
};

type ResolveXBLAuthorizationSuccessResponse = {
    success: true;
    authorization: XBLAuthorization;
};

type ResolveXBLAuthorizationFailureResponse = {
    success: false;
    error: XboxReplayError;
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
    error: XboxReplayError;
};

type FetchFileResponse =
    | FetchGameclipSuccessResponse
    | FetchScreenshotSuccessResponse
    | FetchFileFailureResponse;

type CacheEnabled = {
    enabled: true;
    get: CacheGetter;
    set: CacheSetter;
};

type CacheDisabled = {
    enabled: false;
};

type Cache = (CacheEnabled | CacheDisabled) & {
    keySeparator: string;
    forceUppercase: boolean;
};

class Middleware {
    private authorization: XBLAuthorization | null = null;
    private parameters: Parameters | null = null;
    private readonly req: express.Request;
    private readonly res: express.Response;
    private readonly next: express.NextFunction;
    private readonly debug: boolean;
    private readonly redirectOnFetch: boolean;
    private readonly onRequestError: OnRequestError;
    private readonly fileTypesMapping: Required<FileTypesMapping>;
    private readonly cache: Cache = {
        enabled: false,
        keySeparator: ':',
        forceUppercase: false
    };

    constructor(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
        options: MiddlewareOptions = {}
    ) {
        this.req = req;
        this.res = res;
        this.next = next;

        const {
            debug,
            onRequestError,
            redirectOnFetch,
            fileTypesMapping,
            cache
        } = options;

        this.fileTypesMapping = {
            gameclips: 'gameclips',
            screenshots: 'screenshots'
        };

        if (fileTypesMapping !== void 0) {
            const { gameclips = '', screenshots = '' } = fileTypesMapping;

            if (/^[a-z]/gi.test(gameclips) === true) {
                this.fileTypesMapping.gameclips = gameclips;
            }

            if (/^[a-z]/gi.test(screenshots) === true) {
                this.fileTypesMapping.screenshots = screenshots;
            }
        }

        this.res.setHeader('X-Powered-By', 'XboxReplay.net');
        this.redirectOnFetch = !!redirectOnFetch;
        this.debug = !!debug;

        const { statusCode, reason } = XboxReplayError.details;

        if (typeof onRequestError === 'function') {
            this.onRequestError = onRequestError;
        } else
            this.onRequestError = (details: ErrorDetails) =>
                this.res
                    .status(details.statusCode || statusCode)
                    .send(this.debug ? details.reason || reason : null);

        if (cache !== void 0) {
            const hasValidCacheMethods =
                typeof cache.getter === 'function' &&
                typeof cache.setter === 'function';

            if (hasValidCacheMethods === true) {
                const keySeparator =
                    String(cache.keySeparator || '').length === 1
                        ? String(cache.keySeparator)
                        : ':';

                const forceUppercase = cache.forceUppercase === true;

                this.cache = {
                    enabled: true,
                    keySeparator,
                    forceUppercase,
                    get: (cacheKey: string, cb: any) =>
                        cache.getter(cacheKey, cb),
                    set: (cacheKey: string, payload: any, cb: any) =>
                        cache.setter(cacheKey, payload, cb)
                };
            } else console.warn('Invalid cache methods supplied, skipping...');
        }
    }

    handle = async (authenticate: XBLAuthenticateMethod) => {
        if (typeof authenticate !== 'function') {
            return this.continue(errors.invalidXBLAuthenticateMethod());
        }

        const onAuthenticate = await this.resolveXBLAuthorization(authenticate);

        if (onAuthenticate.success === false) {
            return this.continue(onAuthenticate.error);
        }

        this.setAuthorization(onAuthenticate.authorization);
        const parameters = this.extractParameters();

        if (parameters === null) {
            return this.continue(errors.invalidParameters());
        } else this.setParameters(parameters);

        const onFileMetadataFetch = await this.fetchFileMetadata();

        if (onFileMetadataFetch.success === false) {
            return this.continue(onFileMetadataFetch.error);
        }

        const fileUris =
            parameters.type === 'gameclips'
                ? (onFileMetadataFetch.metadata as XboxLiveAPI.GameclipNode)
                      .gameClipUris
                : (onFileMetadataFetch.metadata as XboxLiveAPI.ScreenshotNode)
                      .screenshotUris;

        const { thumbnails } = onFileMetadataFetch.metadata;

        if (fileUris === void 0 || (fileUris || []).length === 0) {
            return this.continue(errors.missingFileURIs());
        } else if (thumbnails === void 0 || (thumbnails || []).length === 0) {
            return this.continue(errors.missingFileThumbnails());
        }

        const targetedFileUri = this.getFileUriByName(
            parameters.name,
            fileUris,
            thumbnails
        );

        if (targetedFileUri === null) {
            return this.continue(errors.mappedFileNameNotFound());
        }

        if (this.cache.enabled === true) {
            await this.setFileMetadataToCache(
                this.computeFileMetadataCacheKey(),
                onFileMetadataFetch.metadata
            ).catch(console.error);
        }

        if (this.redirectOnFetch === true) {
            return this.res.redirect(302, targetedFileUri);
        }

        const { protocol, host, pathname, query } = parse(targetedFileUri);

        // prettier-ignore
        try { return this.createProxy(`${protocol}//${host}${pathname}`, query); }
        catch (err) { return this.continue(errors.proxyFailed(err.message)); }
    };

    private getParameters = (): Parameters => {
        if (this.parameters === null) {
            throw errors.badImplementation();
        } else return this.parameters;
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

    private getFileMetadataFromCache = <T>(
        cacheKey: string
    ): Promise<T | null> =>
        new Promise((resolve, reject) => {
            if (this.cache.enabled === false) {
                return reject(errors.badImplementation());
            } else if (this.cache.forceUppercase === true) {
                cacheKey = cacheKey.toUpperCase();
            }

            this.cache.get(cacheKey, (err: any, reply: any) => {
                if (err) return resolve(null);
                const parse = safeJSONParse<T>(reply);
                return resolve(parse === null ? null : parse);
            });
        });

    private setAuthorization = (authorization: XBLAuthorization) => {
        this.authorization = authorization;
        return this;
    };

    private setParameters = (parameters: Parameters) => {
        this.parameters = parameters;
        return this;
    };

    private setFileMetadataToCache = (
        cacheKey: string,
        metadata: XboxLiveAPI.GameclipNode | XboxLiveAPI.ScreenshotNode
    ): Promise<void | null> =>
        new Promise((resolve, reject) => {
            if (this.cache.enabled === false) {
                return reject(errors.badImplementation());
            } else if (this.cache.forceUppercase === true) {
                cacheKey = cacheKey.toUpperCase();
            }

            this.cache.set(cacheKey, JSON.stringify(metadata), (err: any) => {
                return err
                    ? reject(errors.cacheSetFailed(err.message))
                    : resolve();
            });
        });

    private createProxy = (target: string, query: string | null) =>
        proxy({
            target,
            pathRewrite: () => (query !== null ? `?${query}` : ''),
            changeOrigin: true
        })(this.req, this.res, this.next);

    private extractParameters = () => {
        const path = this.req.path.split('/').splice(1) as string[];
        const [, xuid = null, scid = null, id = null, name = null] = path;
        let [type = null] = path;

        if (type !== null) {
            const [fileTypesKeys, fileTypesValues] = [
                Object.keys(
                    this.fileTypesMapping
                ) as typeof fileTypes[number][],
                Object.values(this.fileTypesMapping) as string[]
            ];

            const mappedIndex = fileTypesValues.findIndex(t => t === type);

            if (mappedIndex === -1) {
                return null;
            } else type = fileTypesKeys[mappedIndex];
        }

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

    private computeFileMetadataCacheKey = () => {
        const lang = extractLangFromRequest(this.req);
        return [
            'xbox-replay',
            'express-ugc-proxy',
            sha1([lang, ...Object.values(this.getParameters())].join('|'))
        ].join(this.cache.keySeparator);
    };

    private fetchFileMetadata = async (): Promise<FetchFileResponse> => {
        if (this.authorization === null) {
            return {
                success: false,
                error: errors.badImplementation()
            };
        }

        if (this.cache.enabled === true) {
            const cachedMetadata = await this.getFileMetadataFromCache<
                XboxLiveAPI.GameclipNode | XboxLiveAPI.ScreenshotNode | null
            >(this.computeFileMetadataCacheKey());

            if (cachedMetadata !== null) {
                return this.getParameters().type === 'gameclips'
                    ? ({
                          success: true,
                          metadata: cachedMetadata
                      } as FetchGameclipSuccessResponse)
                    : ({
                          success: true,
                          metadata: cachedMetadata
                      } as FetchScreenshotSuccessResponse);
            }
        }

        return this[
            this.getParameters().type === 'gameclips'
                ? 'fetchGameclipMetadata'
                : 'fetchScreenshotMetadata'
        ](
            this.authorization,
            (metadata: any): any => ({
                success: true,
                metadata
            }),
            (error: XboxReplayError): FetchFileFailureResponse => ({
                success: false,
                error
            })
        );
    };

    private fetchGameclipMetadata = (
        authorization: XBLAuthorization,
        onSuccess: (
            metadata: XboxLiveAPI.GameclipNode
        ) => FetchGameclipSuccessResponse,
        onError: (error: XboxReplayError) => FetchFileFailureResponse
    ) =>
        XboxLiveAPI.call<{ gameClip?: XboxLiveAPI.GameclipNode }>(
            computeFileMetadataUri(this.getParameters()),
            authorization
        )
            .then(response =>
                response.gameClip === void 0
                    ? onError(errors.fileNotFound())
                    : onSuccess(response.gameClip)
            )
            .catch(() => onError(errors.fileFetchFailed()));

    private fetchScreenshotMetadata = (
        authorization: XBLAuthorization,
        onSuccess: (
            metadata: XboxLiveAPI.ScreenshotNode
        ) => FetchScreenshotSuccessResponse,
        onError: (error: XboxReplayError) => FetchFileFailureResponse
    ) =>
        XboxLiveAPI.call<{ screenshot?: XboxLiveAPI.ScreenshotNode }>(
            computeFileMetadataUri(this.getParameters()),
            authorization
        )
            .then(response =>
                response.screenshot === void 0
                    ? onError(errors.fileNotFound())
                    : onSuccess(response.screenshot)
            )
            .catch(() => onError(errors.fileFetchFailed()));

    private continue = (err: XboxReplayError) => {
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
