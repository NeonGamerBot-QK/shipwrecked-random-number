require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const app = express();

// Log level is one of the options you can set in the constructor
const web = new WebClient(process.env.SLACK_XOXB, {
});

const blockedNumbers = [process.env.MY_NUMBER]
const redirectCalls = JSON.parse(process.env.NUMBER_LIST || '[]');
let lastCalledNumber = null;
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/static', express.static('static'));
/**
 * @typedef {Object} Body
 * @property {string} AccountSid - Twilio Account SID
 * @property {string} CallSid - Unique identifier for the call
 * @property {string} CallSidLegacy - Legacy call SID, if applicable
 * @property {string} CallerId - The caller's ID
 * @property {string} CallingPartyType - Type of the calling party
 * @property {string} ConnectionId - ID of the connection
 * @property {string} From - The number or address the call is from
 * @property {string} FromSipUri - SIP URI of the caller
 * @property {string} SipHeader_P-Early-Media - SIP header for early media
 * @property {string} To - The number or address the call is going to
 * @property {string} ToSipUri - SIP URI of the callee
 */
// Entry point for Telnyx webhooks (voice calls)
app.post('/voice', (req, res) => {
    console.log(req.body, req.headers)

    /** @type {Body} */
    const body = req.body
    if (blockedNumbers.includes(body.From)) {
        // reject the call
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Reject />
</Response>`;
        res.type('text/xml');
        return res.send(response);
    }
    const siltedNumbers = [
        ...redirectCalls,
    ].filter(n => n["slack ID"] !== lastCalledNumber && n["Phone number"] !== body.From)
    const forwardD0 = siltedNumbers[Math.floor(Math.random() * siltedNumbers.length)]
    if (!forwardD0) {
        // reject 
        // return ``
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Reject reason="busy" />
</Response>`;
        res.type('text/xml');
        return res.send(response);
    }
    const forwardNumber = forwardD0?.["Phone number"]


    web.chat.postMessage({
        channel: process.env.SLACK_CHANNEL,
        text: `📞 Incoming call from \`${body.From}\` to \`${body.To}\`. Redirecting to \`${forwardNumber}\`.`,
    }).catch(err => {
        console.error('Error sending message to Slack:', err);
    })
    web.chat.postMessage({
        channel: `C098PLD3SCD`,
        text: `📞 A call is being sent to <@${forwardD0["slack ID"]}>`,
    })
    lastCalledNumber = forwardD0["slack ID"]
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Redirecting you to a random shipwrecker</Say>
    <Dial timeout="15"  callerId="+12017789744">
        <Number>${forwardNumber}</Number>
    </Dial>
</Response>`;

    res.type('text/xml');
    res.send(response);
});
process.on('uncaughtException', (err) => {
    web.chat.postMessage({
        channel: process.env.SLACK_CHANNEL,
        text: `❗ An error occurred: ${err.message}\n\`\`\`${err.stack}\`\`\``,
    }).catch(err => {
        console.error('Error sending error message to Slack:', err);
    });
    console.error('Uncaught Exception:', err);
})

// app.post('/webhooks/telnyx', express.json(), (req, res) => {
//     console.log(req.body, 'webhook')
//     const event = req.body.data;

//     if (event.event_type === 'call.hangup') {
//         const callId = event.payload.call_control_id;
//         const reason = event.payload.hangup_cause;

//         console.log(`Call ${callId} hung up. Reason: ${reason}`);
//         // You can log this, update DB, stop timers, etc.
//     }

//     res.sendStatus(200);
// });

// Endpoint for hold music (while call is ringing or during dial)
// app.post('/hold-music', (req, res) => {
//     const response = `<?xml version="1.0" encoding="UTF-8"?>
// <Response>
//     <Play>https://port8000.saahild.com/static/hold-audio.mp3</Play>
// </Response>`;

//     res.type('text/xml');
//     res.send(response);
// });

// Optional endpoint if call fails
// app.get('/out-of-service', (req, res) => {
//     const response = `<?xml version="1.0" encoding="UTF-8"?>
// <Response>
//     <Say>The number you have called is currently out of service. Please try again later.</Say>
// </Response>`;

//     res.type('text/xml');
//     res.send(response);
// });
setInterval(() => {
    lastCalledNumber = null;
    // delete lastCalledNumber;
}, 60 * 1000); // Clear last called number every minute
app.listen(process.env.SERVER_PORT || 3000, () => {
    console.log('Telnyx voice app listening on port 3000!');
});
