const express = require('express');
const router = express.Router();
const Campground = require('../models/campgrounds.js');
const isLoggedIn = require('../middleware.js'); // this middleware ensures that a user is logged in before making a new campground for example
const catchAsync = require('../utilities/catchAsync.js');
const ExpressError = require('../utilities/ExpressError.js');

const multer = require('multer') //npm i multer. lets our form submit files instead of just text. req.body for text, and req.file/files for file/files
const { storage } = require('../cloudinary/index.js');
const upload = multer({ storage }) //specify the path where the submitted file/s will be stored. we want to store them on the cloud
const { cloudinary } = require('../cloudinary/index.js')

const Joi = require('joi')

const validateCampground = (req, res, next) => {
    const campgroundSchema = Joi.object({
        campground: Joi.object({    //the object we are validating is campground, so name is important
            title: Joi.string().required(),
            price: Joi.number().required().min(0), //we can also set .min(smth).max(smth)
            // image: Joi.string().required(),  
            location: Joi.string().required(),
            description: Joi.string().required()
        }).required(), //campground object itself is required,otherwise we can leave it off
        deleteImages: Joi.array()
    })
    const { error } = campgroundSchema.validate(req.body); //we use the schema to validate req.body object
    if (error) {
        const msg = (error.details).map(elem => elem.message).join(','); //create array with map, and then join in a string
        throw new ExpressError(msg, 400); //we throw error, which will be caught by the error handler at the bottom of app.js
    } else {
        next()
    }
}

//all the routes below would start with /campgrounds, but we remove them here, bc we are specifying the prefix route on app.js


router.get('/', catchAsync(async (req, res) => { //this will show all campgrounds
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index.ejs', { campgrounds });
}))

router.get('/new', isLoggedIn, (req, res) => {
    res.render('campgrounds/new.ejs');
})

router.post('/', isLoggedIn, upload.array('image'), validateCampground, catchAsync(async (req, res, next) => {
    //we created upload variable above. this will make the req.files object store the images files. the image is the name of the file submitted by the form. we called it image
    //we are putting upload before validate, cause validate requires the req object to work, and upload gives us that maybe??
    //const { title, location } = req.body; //gets info from form, but this time this will be campground: {title,location}
    const newCampground = new Campground(req.body.campground); //bc in the new.ejs, we submited campground[title], campground[location]
    newCampground.images = req.files.map(f => ({ url: f.path, filename: f.filename })); //this will create array with objects, each containing url and filename
    newCampground.author = req.user._id; //bc there is a user logged in when creating a new campground. isLoggedIn makes sure of that
    await newCampground.save();
    req.flash('success', 'Successfuly made a new campground!'); //see notes on app.js for flash. we are setting up flash success.
    res.redirect(`/campgrounds/${newCampground._id}`)
}))

router.get('/:id', catchAsync(async (req, res) => { //this will show details about one specific camp
    const { id } = req.params; //this gets the id from the URL
    const campground = await Campground.findById(id).populate({ path: 'reviews', populate: { path: 'author' } }).populate('author'); //we added this later. so we can show reviews on the campground show page. we also added author to acess the info of the use who submits the campground
    //here we are populating the reviews and author section of camps, but also the author section of reviews. this is so that we can also display the name of the author of each review on that campground
    if (!campground) {
        req.flash('error', 'Cant find that campground'); //setting error to be this message
        return res.redirect('/campgrounds'); //we return so that we dont have to use else, for the code below this. or we can use else.
    }
    res.render('campgrounds/show.ejs', { campground })
}))

router.get('/:id/edit', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params; //or maybe const id = req.params.id
    const campground = await Campground.findById(req.params.id); //i did this on purpose, it works the same

    if (!campground) {
        req.flash('error', 'Cant find that campground'); //setting error to be this message
        return res.redirect('/campgrounds'); //we return so that we dont have to use else, for the code below this. or we can use else.
    }

    if (!campground.author.equals(req.user._id)) { //req.user is the current User object, and has id in it. this is to avoid that smn sends an edit or delete request through postman for ex.
        req.flash('error', 'You do not have permission to do that');
        return res.redirect(`/campgrounds/${id}`);
    }
    res.render('campgrounds/edit.ejs', { campground });
}))

router.put('/:id', isLoggedIn, upload.array('image'), validateCampground, catchAsync(async (req, res) => {
    //if (!req.body.campground) throw new ExpressError('Invalid campground data', 400); //if campground is empty. we can also selectively write if !req.body.campground.price for example.

    const id = req.params.id;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(req.user._id)) { //req.user is the current User object, and has id in it. this is to avoid that smn sends an edit or delete request through postman for ex.
        req.flash('error', 'You do not have permission to do that');
        return res.redirect(`/campgrounds/${id}`);
    }
    await Campground.findByIdAndUpdate(id, req.body.campground); //this does not include images, since they are separate under just images name
    const imgArray = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgArray); //bc imgArray is an array, and we dont want to nest an array inside of an array, but spread its contents inside campground.images
    await campground.save();
    if (req.body.deleteImages) { //this is an array containing filenames of the img that need to be deleted
        for(let filename of req.body.deleteImages){
            await cloudinary.uploader.destroy(filename); //cloudinary function to delete img in cloud using filename
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
    }
    req.flash('success', 'Successfuly updated campground!');//now we are setting the next success to be this new message
    res.redirect(`/campgrounds/${campground._id}`); //or just id, since it hasnt changed.
}))

router.delete('/:id', isLoggedIn, catchAsync(async (req, res) => { //delete campground
    const id = req.params.id;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(req.user._id)) { //req.user is the current User object, and has id in it. this is to avoid that smn sends an edit or delete request through postman for ex.
        req.flash('error', 'You do not have permission to do that');
        return res.redirect(`/campgrounds/${id}`);
    }
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted campground!');
    res.redirect('/campgrounds');
}))

module.exports = router;

