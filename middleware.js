const isLoggedIn = function (req, res, next) {
    if (!req.isAuthenticated()) { //will return true if user is logged in
        req.session.returnTo = req.originalUrl; //setting property to session to remember where the user was trying to go before being asked to login. originalURl will be smth like /campgrounds/new
        req.flash('error', 'You must be logged in first');
        return res.redirect('/login');
    }
    next();
}

module.exports = isLoggedIn;