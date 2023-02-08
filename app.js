if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
//const catchAsync = require('./utilities/catchAsync.js'); we only need this on the routes files, to wrap async func.
const ExpressError = require('./utilities/ExpressError.js');



const session = require('express-session'); //install with nmp i express-session
const MongoStore = require('connect-mongo'); //npm i connect-mongo to store our session in mongo instead of just memory
const flash = require('connect-flash'); //installed with npm i connect-flash

mongoose.connect('mongodb://localhost:27017/yelp-camp');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Database connected');
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.engine('ejs', ejsMate); //we tell app to use ejsMate as the new ejs engine, instead of the default one. we installed this through npm i ejs-mate. in the views folder, we define a folder called layouts, and we add boilerplate.ejs
app.use(express.urlencoded({ extended: true })); // npm i body-parser(mbase nuk duhet).always need this in order to use req.body.
const methodOverride = require('method-override');
const { title } = require('process');
app.use(methodOverride('_method'))

const sessionConfig = {
    store: MongoStore.create({   //we added this after with connect-mongo above. this creates a session store in our database
        mongoUrl: 'mongodb://localhost:27017/yelp-camp',  //see docs for this, bc it has been updated
        touchAfter: 24 * 3600 //time period in seconds, updates the session after this time
    }),
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, //expires in one week, all in miliseconds(Date.now()returns date today in miliseconds)
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
} //this would normaly go inside session({}) below

app.use(session(sessionConfig)); //we need session to use flash
app.use(flash()); //now we can use req.flash('key', 'value'}) ex: req.flash('succsess', 'Succsessfully made a new campground'); on campgroundRoute.js
//above i required and executed flash in one line. normally would be first const flash = require('flash'), then app.use(flash())


//PASSPORT
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js')

app.use(passport.initialize());
app.use(passport.session()); //this needs to come after app.use(session) above
passport.use(new LocalStrategy(User.authenticate())); //telling passport which strategy to use. we can use multiple.
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//This is flash, but im setting this below passport bc req.user is created by passport
app.use((req, res, next) => {
    //console.log(req.session.returnTo);
    res.locals.currentUser = req.user; //passport gives this method. it contains info about the current user in the session. if the user is not logged in, it is undefined, and we can use it in our templates to hide or show things.
    res.locals.success = flash('success'); //whatever success is, we will have access to it in our tempates(ejs) under success variable
    res.locals.error = flash('error');//now we can also use error
    next(); //never forget to call next in a middleware, otherwise the app will breaK
}) //when we do an operatio(ex add camp or edit), right after that action, we can specify success to be a new message right there, and it will automatically be updated in ejs templates.
//if we dont set flash after an operation, then nothing will be displayed, bc it wont exist.

//ROUTES
const campgroundRoute = require('./routes/campgroundRoute.js');
const reviewRoute = require('./routes/reviewRoute.js');
const userRoute = require('./routes/userRoute.js');

app.use('/campgrounds', campgroundRoute);
app.use('/campgrounds/:campgroundId/reviews', reviewRoute);
app.use('/', userRoute);


app.get('/', (req, res) => {
    res.render('home.ejs'); //this will look in the views folder
})


app.all('*', (req, res, next) => {  //this path * is a RegEx. see express docs for more info
    next(new ExpressError('Page not found', 404))  //inside next, we pass the custom error that we created
})

app.use((err, req, res, next) => {
    const { message = 'Something went wrong', statusCode = 500 } = err;  //distructuring from err object. we can do this apparently. we also pass default values if they dont exist
    res.status(statusCode).render('error.ejs', { err });
})

app.listen(3000, () => {
    console.log('Listening on port 3000')
})
