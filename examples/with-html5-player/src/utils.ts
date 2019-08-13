import { demoGameclipParameters } from './config';
import { readFile } from 'fs';
import { join } from 'path';

export const readTemplateFile = (
    fileName: string,
    cb: (err: Error | null, data: any) => void
) => {
    readFile(
        join(__dirname, '..', 'templates', fileName),
        'utf-8',
        (err, data) => {
            cb(err, data);
        }
    );
};

export const replacePlaceholders = (data: string, appDomain: string) => {
    const { type, xuid, scid, id } = demoGameclipParameters;
    const filePath = join(type, xuid, scid, id);

    const mapping = {
        APP_DOMAIN: appDomain,
        IMAGE_URI: `${appDomain}/ugc-proxy/${filePath}/thumbnail-large.png`,
        VIDEO_URI: `${appDomain}/ugc-proxy/${filePath}/gameclip.mp4`,
        IMAGE_URI_WITH_REDIRECT: `${appDomain}/ugc-redirect/${filePath}/thumbnail-large.png`,
        VIDEO_URI_WITH_REDIRECT: `${appDomain}/ugc-redirect/${filePath}/gameclip.mp4`
    };

    (Object.keys(mapping) as Array<keyof typeof mapping>).forEach(key => {
        const regexp = new RegExp(`\\{${key}\\}`, 'g');
        data = data.replace(regexp, mapping[key]);
    });

    return data;
};
