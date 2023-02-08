//will use this file anytime we need to seed campgrounds.this will delete any previous collection

const path = require('path');
const Campground = require('../models/campgrounds.js') //we use ../ instead of ./ because we are in another folder.
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/yelp-camp');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Database connected');
})

const sample = array => array[Math.floor(Math.random() * array.length)]; //we will use this func to create sample titles using places and descriptors arrays

//this func will delete old and insert new Campgrounds
const seedDB = async () => {
    await Campground.deleteMany({});

    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            location: `${cities[random1000].city} , ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: 'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Rerum vero quas cupiditate doloremque in voluptas accusantium sit! Cumque optio voluptate dolorem libero ipsa dolore temporibus vero maiores? Nostrum, officiis? Tempor',
            price: price,
            author: '63745a03e08d1dfb4dfd33de', //set the author for all campgrounds to monkey
            images: [
                {url: 'https://res.cloudinary.com/dxgghwwu8/image/upload/v1669065989/YelpCamp/z9ces1t0cuzjmldzryve.jpg',
                filename: 'YelpCamp/z9ces1t0cuzjmldzryve'}
            ]
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})