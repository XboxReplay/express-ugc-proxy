export const isValidUUID = (entry: any) =>
    !!entry &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        entry
    ) === true;

export const isValidXUID = (entry: any) => {
    const c = Number(entry);
    return !isNaN(c) && String(c).length >= 16;
};

export const computeFileMetadataUri = (
    type: string,
    xuid: string,
    scid: string,
    fileId: string
) =>
    `https://${type}metadata.xboxlive.com/users/xuid(${xuid})/scids/${scid}/${
        type === 'gameclips' ? 'clips' : type
    }/${fileId}`;
