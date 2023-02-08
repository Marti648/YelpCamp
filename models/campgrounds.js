const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review.js');  // we import this, in order to use it in the middleware below to delete all reviews when a campground is deleted.

const CampgroundSchema = new Schema({
    title: String,
    price: Number,
    description: String,
    location: String,
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    images: [{ url: String, filename: String }]
})

let Campground = mongoose.model('Campground', CampgroundSchema);

CampgroundSchema.post('findOneAndDelete', async function (deleted_campground) { //this middleware runs after we use findByIdAndDelete to delete all reviews associated with a deleted campground. 
    if (deleted_campground) { //maybe it doesnt exist, so we prevent errors
        await Review.deleteMany({ _id: { $in: deleted_campground.reviews } });
    }
})

module.exports = Campground;