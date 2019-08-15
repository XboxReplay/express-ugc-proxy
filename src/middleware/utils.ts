import * as crypto from 'crypto';
import { Request } from 'express';
import { XboxReplayError } from '@xboxreplay/errors';

import {
    fileTypes,
    gameclipFileNames,
    screenshotFileNames
} from './file-definitions';
import { parse } from 'url';

export const extractErrorDetails = (err: XboxReplayError) => ({
    statusCode: err.details.statusCode,
    reason: err.details.reason
});

export const extractLangFromRequest = (req: Request) => {
    const defaultValue = 'en-us';
    const header = req.headers['accept-language'] || null;

    if (header !== null) {
        const [matchLocale, matchLang] = [
            header.match(/([a-z]+){2,3}-([a-z]+){2,3}/gi),
            header.match(/([a-z]+){2,3}/gi)
        ];

        const [locale, lang] = [
            matchLocale !== null ? matchLocale[0] : null,
            matchLang !== null ? matchLang[0] : null
        ];

        if (locale !== null) return locale.toLowerCase();
        else if (lang !== null) return lang.toLowerCase();
    }

    return defaultValue;
};

export const hasFileExpired = (fileURI: string) => {
    const { query } = parse(fileURI, true);
    const exp = (String(query.__gda__) || '').split('_')[0] || null;

    if (exp !== null) {
        return new Date(Number(exp) * 1000) > new Date();
    } else return true;
};

export const computeFileMetadataUri = (parameters: {
    type: typeof fileTypes[number];
    xuid: string;
    scid: string;
    id: string;
}) =>
    `https://${parameters.type}metadata.xboxlive.com/users/xuid(${
        parameters.xuid
    })/scids/${parameters.scid}/${
        parameters.type === 'gameclips' ? 'clips' : parameters.type
    }/${parameters.id}`;

export const safeJSONParse = <T>(entry: any): T | null => {
    // prettier-ignore
    try { return JSON.parse(entry); }
    catch (err) { return null; }
};

export const sha1 = (entry: string) =>
    crypto
        .createHash('sha1')
        .update(entry)
        .digest('hex');
