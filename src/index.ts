import express, {response} from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import winston from 'winston';
import {URLSearchParams} from "url";

dotenv.config();
const app = express();
app.use(
    express.urlencoded({
        extended: true
    })
)
app.use(express.json())

const twitchApiUrl = "https://api.twitch.tv/helix/eventsub/subscriptions";

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'Twitch webhooks' },
    transports: [
        new winston.transports.Console(),
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

const ngrokApiUrl = "http://localhost:4040/api/tunnels/command_line";
let callbackUrl = "";

fetch(ngrokApiUrl, {}).then( res => res.json()).then((json) => {
    callbackUrl = json.public_url;
    logger.info("Ngrok url : " + callbackUrl);
    // getAuthToken();
    creatSub();
})

app.get('/', (req, res) => {
    res.send('Webhook test');
})

app.post('/notification', (req, res) => {
    logger.info("Eventsub notification");
    logger.info(req.headers);
    logger.info(req.body);
    if (req.header("Twitch-Eventsub-Message-Type") === "webhook_callback_verification") {
        res.send(req.body.challenge);
    } else if (req.header("Twitch-Eventsub-Message-Type") === "notification") {
        res.send("");
    } else {
        res.status(403).send("Forbidden");
    }
});

app.listen(3000, () => {
    logger.info('The application is listening on port 3000!');
})

function getAuthToken() {
    const apiUrl = "https://id.twitch.tv/oauth2/token";
    const params = new URLSearchParams();
    params.append('client_id', process.env.TWITCH_CLIENT_ID!);
    params.append('client_secret', process.env.TWITCH_CLIENT_SECRET!);
    params.append("grant_type","client_credentials");

    fetch(apiUrl, {method: 'POST', body : params}).then(res => res.json()).then((json) => {
        logger.info(json);
    });
}

function creatSub() {
    logger.info("Subscribing to event");
    const callback = callbackUrl + "/notification";
    logger.info("Callback : " + callback);
    const reqHeaders = {
        "Client-ID" : process.env.TWITCH_CLIENT_ID!,
        "Authorization" : "Bearer " + process.env.TWITCH_ACCESS_TOKEN!,
        "Content-Type" : "application/json"
    };
    const body = {
        "type": "channel.update",
        "version": "1",
        "condition": {
            "broadcaster_user_id": "58394079"
        },
        "transport": {
            "method": "webhook",
            "callback": callback,
            "secret": "imstufflkjsdlkajdklsaj"
        }
    };
    fetch(twitchApiUrl, {method : 'POST', headers : reqHeaders, body : JSON.stringify(body)}).then((res) => {
        // logger.info(res.headers.raw());
        return res.text();
        logger.info("Status code : " + res.status);
    }).then( res => logger.info(res));
}