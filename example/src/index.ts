import * as express from 'express';
import * as UGCMiddleware from '@xboxreplay/express-ugc-proxy';
import { replacePlaceholders, readTemplateFile } from './modules/utils';
import XBLAuthenticateMethod from './modules/authenticate';
import { join } from 'path';

const host = String(process.env.HOST || '127.0.0.1');
const port = Number(process.env.PORT || 8899);
const app = express();

app.enable('trust proxy');
app.use('/assets', express.static(join(__dirname, '..', 'assets')));

app.use(
    '/ugc-proxy',
    UGCMiddleware.handle(XBLAuthenticateMethod, {
        debug: true,
        redirectOnFetch: false,
        fileTypesMapping: {
            screenshots: 'captures',
            gameclips: 'clips'
        }
    })
);

app.use(
    '/ugc-redirect',
    UGCMiddleware.handle(XBLAuthenticateMethod, {
        debug: true,
        redirectOnFetch: true,
        fileTypesMapping: {
            screenshots: 'captures',
            gameclips: 'clips'
        }
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

app.get('/favicon.ico', (_, res) =>
    res.redirect(301, 'https://www.xboxreplay.net/favicon.ico')
);

app.get('*', (_, res) => res.sendStatus(404));

app.listen(port, host, err => {
    if (err) throw err;
    else console.info(`> Listening at http://${host}:${port}`);
});
