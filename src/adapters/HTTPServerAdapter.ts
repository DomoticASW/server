import express from 'express';

export class HTTPServerAdapter {

    constructor(port: number) {
        const app = express();

        app.get('/api', (req, res) => {
            res.send("API");
        });

        app.use(express.static('client/dist'))

        app.listen(port, () => {
            return console.log(`Express is listening at http://localhost:${port}`);
        });
    }
}
