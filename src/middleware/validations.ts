import {
    fileTypes,
    gameclipFileNames,
    screenshotFileNames
} from './file-definitions';

type EntryType = string | null;

// **** PRIVATE METHODS **** //

const isValidUUID = (entry: EntryType) =>
    !!entry &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        entry
    ) === true;

// **** PUBLIC METHODS **** //

export const isValidFileId = (entry: EntryType) => isValidUUID(entry);
export const isValidFileScid = (entry: EntryType) => isValidUUID(entry);

export const isValidFileType = (entry: EntryType) =>
    !!entry && fileTypes.includes(entry as typeof fileTypes[number]);

export const isValidOwnerXUID = (entry: EntryType) => {
    const c = Number(entry);
    return !isNaN(c) && String(c).length >= 16;
};

export const isValidFileNameForType = (entry: EntryType, type: EntryType) => {
    if (type === 'gameclips')
        return gameclipFileNames.includes(
            entry as typeof gameclipFileNames[number]
        );
    else if (type === 'screenshots')
        return screenshotFileNames.includes(
            entry as typeof screenshotFileNames[number]
        );
    else return false;
};
