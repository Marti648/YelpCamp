const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const passport = require('passport');


router.get('/register', (req, res) => {
    res.render('users/register.ejs'); //this will search in the views folder, so we dont have to do ./
})

router.post('/register', async (req, res, next) => {  //here we need next parameter, cause we use it below in login
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email }) //but no password
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {  //method from passport, just like logout(). we log the user in when they register.
            if (err) return next(err);
            req.flash('success', 'Welcome to YelpCamp');
            res.redirect('/campgrounds');
        })

    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
})

router.get('/login', (req, res) => {
    res.render('users/login.ejs');
})

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back');
    //const redirectUrl = req.session.returnTo || '/campgrounds' //if req.session is undefined, we send to campgrounds
    if (req.session.returnTo) {
        res.redirect(req.session.returnTo);
    } else {
        res.redirect('/campgrounds');
    }
    delete req.session.returnTo;
})

router.get('/logout', (req, res, next) => {
    req.logout(function (err) {             // as per the new update, we have to add this callback func to req.logout()
        if (err) { return next(err); }
    })
    req.flash('success', 'Logged out');
    res.redirect('/campgrounds');
})

module.exports = router;