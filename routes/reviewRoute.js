const express = require('express');
const router = express.Router({ mergeParams: true }); //we always have to do this, otherwise we wont have access to req.params
const Campground = require('../models/campgrounds.js');
const Review = require('../models/review.js');
const isLoggedIn = require('../middleware.js');

const catchAsync = require('../utilities/catchAsync.js');
const ExpressError = require('../utilities/ExpressError.js');

const Joi = require('joi')


const validateReview = (req, res, next) => {
    const reviewSchema = Joi.object({
        review: Joi.object({      //object we are validating is review, and is required.
            body: Joi.string().required(),
            rating: Joi.number().required().min(1).max(5)
        }).required()
    })

    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = (error.details).map(elem => elem.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}

//we are prefixing everything with /campgrounds/:campgroundId/reviews on app.js, so we dont include prefix here

router.post('/', isLoggedIn, validateReview, catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.campgroundId);
    const { rating, body } = req.body.review; //because we submited review as review[body], review[rating].
    const review = new Review({ rating, body }); // we can also just do req.body.review
    review.author = req.user._id; //req.user holds user object info (not session, but actual user logged in)
    campground.reviews.push(review); //we are only saving reviews id on campground, not other way around. we can push whole review, but only id will be saved, and we can populate it later
    await review.save();
    await campground.save();
    req.flash('success', 'Created a new review!'); //we are updating success to be this new message. the next page we are redirected to, will show this alert.
    res.redirect(`/campgrounds/${campground._id}`);
}))

router.delete('/:reviewId', isLoggedIn, catchAsync(async (req, res) => {  //delete reviews
    const { campgroundId, reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review.author.equals(req.user._id)){ //checking if the one deleting is actually the author of review
        req.flash('error', 'You do not have permission to do that');
        res.redirect(`/campgrounds/${campgroundId}`);
    }

    await Campground.findByIdAndUpdate(campgroundId, { $pull: { reviews: reviewId } }); //this deletes an element from an array. see mongoose docs on pull operator
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully deleted a review!'); //now success is this new message. next page will show this alert
    res.redirect(`/campgrounds/${campgroundId}`);
}))


module.exports = router;