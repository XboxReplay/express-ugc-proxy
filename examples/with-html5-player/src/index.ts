import * as express from 'express';
import * as UGCMiddleware from '@xboxreplay/express-ugc-proxy';
import { replacePlaceholders, readTemplateFile } from './utils';
import { getOrResolveXBLAuthorization } from './xbl-authorization';

const host = String(process.env.HOST || '127.0.0.1');
const port = Number(process.env.PORT || 8899);
const localUrl = `http://${host}:${port}`;

const app = express();

app.enable('trust proxy');

app.get('/favicon.ico', (_, res) =>
    res.redirect(301, 'https://www.xboxreplay.net/favicon.ico')
);

app.use(
    '/ugc-proxy',
    UGCMiddleware.handle(getOrResolveXBLAuthorization, {
        debug: true,
        redirectOnFetch: false
    })
);

app.use(
    '/ugc-redirect',
    UGCMiddleware.handle(getOrResolveXBLAuthorization, {
        debug: true,
        redirectOnFetch: true
    })
);

app.get('/', (req, res) => {
    readTemplateFile('index.html', (err, data) => {
        if (err) return res.status(500).send(err.message);
        const appDomain = req.protocol + '://' + req.get('host');
        return res.send(replacePlaceholders(data, appDomain));
    });
});

app.get('/embed', (req, res) => {
    readTemplateFile('embed.html', (err, data) => {
        if (err) return res.status(500).send(err.message);
        const appDomain = req.protocol + '://' + req.get('host');
        return res.send(replacePlaceholders(data, appDomain));
    });
});

app.get('*', (_, res) => res.sendStatus(404));

app.listen(port, host, err => {
    if (err) throw err;
    else console.info(`> Listening at ${localUrl}`);
});
