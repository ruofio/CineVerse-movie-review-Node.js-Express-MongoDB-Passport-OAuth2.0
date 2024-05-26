const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const movieSchema = new Schema({
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    title: String,
    director: String,
    genre: String,
    releaseYear: Number,
    rating: Number,
    review: String,
    thumbnailImage: String
});
module.exports = mongoose.model("Movie", movieSchema);