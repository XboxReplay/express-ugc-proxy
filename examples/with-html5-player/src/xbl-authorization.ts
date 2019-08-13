import * as XboxLiveAuth from '@xboxreplay/xboxlive-auth';
import config = require('./config');

let XBLAuthorization: {
    userHash: string;
    XSTSToken: string;
    expiresOn: string;
} | null = null;

export const getOrResolveXBLAuthorization = async () => {
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
        config.userCredentials.email,
        config.userCredentials.password
    );

    XBLAuthorization = authenticate;

    return {
        userHash: XBLAuthorization.userHash,
        XSTSToken: XBLAuthorization.XSTSToken
    };
};
