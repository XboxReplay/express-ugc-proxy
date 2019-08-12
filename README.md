# Express UGC Proxy

Express middleware to proxy user-generated content to another host and embed them on social media platforms such as Facebook, Twitter, Discord, etc.

<img src="twitter-preview.png" width="520" />

# But, why?

By default if the shared domain (for instance xboxreplay.net) does not match the media one (gameclipscontent-xxxx.xboxlive.com), the content may be blocked by the navigator due to the `Same-origin policy` (see: https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) or by the platform itself once the metatags are retrieved.

# WORK IN PROGRESS

```
import UGCProxyMiddleware from '@xboxreplay/express-ugc-proxy';

// The good
app.use('/ugc-files', UGCProxyMiddleware.handle(() =>
    getAuthorizationFromCache
        .then(authorization => {
            if (authorization === null) {
                return XboxLiveAuth.authenticate('hello@world.com', '*****);
            } else return authorization;
        })
));

// The bad
app.use('/ugc-files', UGCProxyMiddleware.handle(
    XboxLiveAuth.authenticate('hello@world.com', '*****)
);

// The ugly
app.use('/ugc-files', UGCProxyMiddleware.handle({
    XSTSToken: '...',
    userHash: '...'
});
```

:)
