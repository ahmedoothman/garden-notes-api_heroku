const axios = require('axios'); // to make http request
const dotenv = require('dotenv'); // to use environment variable
dotenv.config({ path: './config.env' }); // configuration of the environment file
const hostUrl = process.env.HOST_URL;
const wakeUpPeriod = process.env.WAKE_UP_PERIOD; // in minutes
exports.preventSleep = () => {
    const url = hostUrl;
    setInterval(() => {
        axios
            .get(url)
            .then((response) => {
                console.log('🤓➡️ : preventing sleep... 😉');
            })
            .catch((error) => {
                console.log(error);
            });
    }, 60000 * wakeUpPeriod); // ms * m
};
