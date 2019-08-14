import * as XboxLiveAuth from '@xboxreplay/xboxlive-auth';
import credentials from '../config/credentials';

let XBLAuthorization: {
    userHash: string;
    XSTSToken: string;
    expiresOn: string;
} | null = null;

export default async () => {
    if (XBLAuthorization !== null) {
        const hasExpired =
            XBLAuthorization.expiresOn !== null &&
            new Date(XBLAuthorization.expiresOn) <= new Date();

        if (hasExpired === false) {
            return {
                userHash: XBLAuthorization.userHash,
                XSTSToken: XBLAuthorization.XSTSToken
            };
        }
    }

    const authenticate = await XboxLiveAuth.authenticate(
        credentials.email,
        credentials.password
    );

    XBLAuthorization = authenticate;

    return {
        userHash: XBLAuthorization.userHash,
        XSTSToken: XBLAuthorization.XSTSToken
    };
};
