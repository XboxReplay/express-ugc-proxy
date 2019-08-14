import { XboxReplayError } from '@xboxreplay/errors';

export const extractErrorDetails = (err: XboxReplayError) => ({
    statusCode: err.details.statusCode,
    reason: err.details.reason
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
