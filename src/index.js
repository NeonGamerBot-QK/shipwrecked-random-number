const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const blockedNumbers = []
const redirectCalls = [process.env.MY_NUMBER];

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
    const forwardNumber = redirectCalls[0];
    /** @type {Body} */
    const body = req.body
    if (blockedNumbers.includes(body.From)) {
        // reject the call
        const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Reject reason="busy" />
</Response>`;
        res.type('text/xml');
        return res.send(response);
    }
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial action="/hold-music" timeout="30">
        <Number>${forwardNumber}</Number>
    </Dial>
</Response>`;

    res.type('text/xml');
    res.send(response);
});

// Endpoint for hold music (while call is ringing or during dial)
app.post('/hold-music', (req, res) => {
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play>https://port8000.saahild.com/static/hold-audio.mp3</Play>
</Response>`;

    res.type('text/xml');
    res.send(response);
});

// Optional endpoint if call fails
app.get('/out-of-service', (req, res) => {
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>The number you have called is currently out of service. Please try again later.</Say>
</Response>`;

    res.type('text/xml');
    res.send(response);
});

app.listen(3000, () => {
    console.log('Telnyx voice app listening on port 3000!');
});
