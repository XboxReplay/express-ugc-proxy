import { ExpressUGCProxyError } from './errors';

export const extractErrorDetails = (err: ExpressUGCProxyError) => ({
    statusCode: err.extra.statusCode,
    reason: err.extra.reason
});

export const computeFileMetadataUri = (
    type: string,
    xuid: string,
    scid: string,
    fileId: string
) =>
    `https://${type}metadata.xboxlive.com/users/xuid(${xuid})/scids/${scid}/${
        type === 'gameclips' ? 'clips' : type
    }/${fileId}`;
