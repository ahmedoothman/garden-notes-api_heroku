const mongoose = require('mongoose');
const dotenv = require('dotenv'); // to use environment variable
dotenv.config({ path: './config.env' }); // configuration of the environment file
const app = require('./app'); // import the express app
const preventSleep = require('./utils/preventSleep');
console.log(process.env.NODE_ENV);
process.on('uncaughtException', (err) => {
    console.log(err);
    console.log('Shuting down');
    process.exit(1);
});

// connect with the databas but replacing the password in the link with the password we set from the atals
const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);
// mongoose
//     .connect(DB, {
//         useNewUrlParser: true,
//         useCreateIndex: true,
//         useFindAndModify: false,
//         useUnifiedTopology: true,
//     })
//     .then((con) => {
//         //  console.log(con);
//         console.log('DB Connected Successfully .....');
//         mongoFinishedStatus = true;
//     });
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(DB, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        });
        console.log('DB Connected Successfully .....');
    } catch (err) {
        console.log(err);
    }
};
const port = process.env.PORT;
let server;
// server = app.listen(port, () => {
//     console.log(`works on ${port} ...`);
// });

connectDB().then(() => {
    server = app.listen(port, () => {
        console.log(`works on ${port} ...`);
        // preventSleep
        preventSleep.preventSleep();
    });
});
process.on('unhandeledRejection', (err) => {
    console.log(err);
    console.log('Shuting down');
    server.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (err) => {
    console.log(err);
    console.log('Shuting down');
    server.close(() => {
        process.exit(1);
    });
});
