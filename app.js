const express = require('express'); // import express
const path = require('path');
const morgan = require('morgan'); // 3rd party middleware
////////////////////////////////////////////////////////
const userRouter = require('./routes/userRoutes');
const noteRouter = require('./routes/noteRoutes');
const gardenRouter = require('./routes/gardenRoutes');
const inventoryRouter = require('./routes/inventoryRoutes');
const errorController = require('./controllers/errorController');
// configure router
const router = express.Router();
//secuirty
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const timeout = require('connect-timeout');
const AppError = require('./utils/appError.js');
const app = express(); // creating express app
//multiple request attack
const limiter = rateLimit({
    max: 200,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests drom this IP, please try again in an hour!',
});
/* CORS */
app.use(cors());
app.options('*', cors());
app.use('/api', limiter);
app.use(timeout('10s'));

app.use(express.json({ limit: '10kb' })); // we need that middleware for convert the url we got to json (not sure)
app.use(express.static(`${__dirname}/public`));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); //Data sensitization against no SQL query injection
app.use(xss()); //Data sensitization against XSS
app.use(
    hpp({
        whitelist: [],
    })
);
app.use(haltOnTimedout);
function haltOnTimedout(req, res, next) {
    if (!req.timedout) next();
}
//routes
app.use('/api/users', userRouter);
app.use('/api/garden', gardenRouter);
app.use('/api/notes', noteRouter);
app.use('/api/inventory', inventoryRouter);

app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));

app.use('/api/img', express.static(path.join(__dirname, 'img')));

//unhandeled routes gets response with this , must be put at the end of the file after all routes
app.all('*', (req, res, next) => {
    // res.status(404).json({
    //     status: 'fail',
    //     message: `Can't find ${req.originalUrl} on this server`
    // });
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); // node js understand that , when we pass a parameter to next() it means that is an error and will skip all middlewares and send it to the global error handling middleware
});

app.use(errorController);
module.exports = app; // we export it to the server file where we will include it there
