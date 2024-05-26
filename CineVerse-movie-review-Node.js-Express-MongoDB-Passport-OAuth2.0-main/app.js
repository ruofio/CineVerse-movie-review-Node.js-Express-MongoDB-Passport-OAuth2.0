require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../CineVerse/models/User");
const { isLoggedIn } = require('../CineVerse/middleware/checkAuth');
const Movies = require("../CineVerse/models/Movies");
const MongoStore = require('connect-mongo');


const port = process.env.PORT || 5000;
const app = express();
// Set up session middleware
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI
    }),
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());



// Set up EJS and views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up public directory for static files
app.use(express.static('public'));

// Set up Express Layouts
app.use(expressLayouts);
app.set('layout', './layouts/main');

// Set up body-parser middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to the MongoDB database
const db = process.env.MONGODB_URI;
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));


// Define Movies schema for random generator
const randomSchema = new mongoose.Schema({
    title: String,
    director: String,
    genre: String,
    releaseYear: Number,
    rating: Number,
    thumbnailImage: String
});
const randomMovie = mongoose.model("randomMovie", randomSchema);




//////////////////////////////////Routes/////////////////////////////

app.get('/', (req, res) => {
    const locals = {
        title: "CineVerse",
        description: "Free movie rating App",
    }
    res.render('index', locals);
});



app.get('/dashboard', isLoggedIn, (req, res) => {
    const locals = {
        title: "Dashboard-CineVerse",
        description: "Free movie rating App",
        user: req.user
    };
    Movies.aggregate([{
        $match: { user: new mongoose.Types.ObjectId(req.user.id) }
    }])

        .then((result) => {
            console.log("All movies retrieved.");
            res.render('dashboard', {
                locals,
                moviesList: result,
                layout: "../views/layouts/dashboard",
            });
        })
        .catch((err) => {
            console.log("Error retrieving movies:", err);
            res.status(500).send('Internal Server Error');
        });

});

app.get('/about', (req, res) => {
    const locals = {
        title: "About-CineVerse",
        description: "Free movie rating App",
    }
    res.render('about', locals);
});




app.get('/movie/:userId/:movieId', (req, res) => {
    const { userId, movieId } = req.params;

    // Retrieve movie from database with matching ID and user ID
    Movies.findOne({ _id: movieId, user: userId })
        .then((result) => {
            if (!result) {
                console.log("Movie not found.");
                return res.status(404).send("Movie not found.");
            }
            console.log(`The movie ${result.title} was retrieved from the database`);
            // Render the movie page and pass through the movie details from result
            res.render('movie', {
                title: result.title,
                director: result.director,
                genre: result.genre,
                releaseYear: result.releaseYear,
                rating: result.rating,
                review: result.review,
                thumbnailImage: result.thumbnailImage,
                movieId: result._id
            });
        })
        .catch((err) => {
            console.error("Error retrieving movie:", err);
            res.status(500).send("Internal Server Error");
        });
});

app.post('/delete/:movieId', isLoggedIn, (req, res) => {
    const movieId = req.params.movieId;
    const userId = req.user._id;

    // Find the movie by ID and user ID, then remove it
    Movies.findOneAndDelete({ _id: movieId, user: userId })
        .then((result) => {
            if (!result) {
                console.log("Movie not found.");
                return res.status(404).send("Movie not found.");
            }
            console.log(`The movie ${result.title} was deleted successfully.`);
            // Redirect to the dashboard page after deleting the movie
            res.redirect('/dashboard');
        })
        .catch((err) => {
            console.error("Error deleting movie:", err);
            res.status(500).send("Internal Server Error");
        });
});


// Show the 'add movie' form
app.get('/add', isLoggedIn, (req, res) => {
    const locals = {
        title: "Add-CineVerse",
        description: "Free movie rating App",
    }
    res.render('add', {
        locals,
        layout: "../views/layouts/dashboard"
    });
});
// Define route handler for POST request to add a new movie
app.post('/add', (req, res) => {
    // Extract movie data from request body
    const { title, director, genre, releaseYear, rating, review, thumbnailImage } = req.body;
    // Retrieve the authenticated user's ID
    const userId = req.user._id;
    // Create a new Movie object with the extracted data
    const newMovie = new Movies({
        user: userId,
        title,
        director,
        genre,
        releaseYear,
        rating,
        review,
        thumbnailImage
    });

    // Save the new movie to the database
    newMovie.save()
        .then((result) => {
            console.log('New movie added successfully:', result);
            // Redirect to the dashboard page after adding the movie
            res.redirect('/dashboard');
        })
        .catch((err) => {
            console.error('Error adding new movie:', err);
            // Handle errors, such as displaying an error message to the user
            res.status(500).send('Internal Server Error');
        });
});


app.get('/faqs', (req, res) => {
    const locals = {
        title: "FAQs-CineVerse",
        description: "Free movie rating App",
    }
    res.render('faqs', {
        locals,
        layout: "../views/layouts/faqs",
    });
});

// Retrieve a random movie
app.get('/random-movies', (req, res) => {
    const genre = req.query.genre;

    let query = {}; // Default query fetches any movie
    if (genre && genre !== 'Any') {
        query.genre = new RegExp(genre, 'i'); // Case-insensitive matching for genre
    }

    // Retrieve a random movie based on the specified query
    randomMovie.aggregate([{ $match: query }, { $sample: { size: 1 } }])
        .then((randomMovies) => {
            if (randomMovies.length > 0) {
                const movie = randomMovies[0];
                res.json({
                    title: movie.title,
                    thumbnailImage: movie.thumbnailImage,
                    rating: movie.rating
                });
            } else {
                res.json({ message: "No movies found for the selected genre." });
            }
        })
        .catch((err) => {
            console.error('Error retrieving random movie:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});


// Define route for random movie page
app.get('/random', isLoggedIn, (req, res) => {
    const locals = {
        title: "Random-CineVerse",
        description: "Free movie rating App",
    }
    // Retrieve a random movie from the database
    randomMovie.aggregate([{ $sample: { size: 1 } }])
        .then((randomMovie) => {
            // Render the random.ejs template and pass the random movie details
            res.render('random', {
                locals,
                randomMovie: randomMovie[0],
                layout: "../views/layouts/dashboard"
            });
        })
        .catch((err) => {
            console.error('Error retrieving random movie:', err);
            res.status(500).send('Internal Server Error');
        });
});

// Configure Passport with Google OAuth 2.0
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
        async function (accessToken, refreshToken, profile, done) {
            const newUser = {
                googleId: profile.id,
                displayName: profile.displayName,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                profileImage: profile.photos[0].value,
            };

            try {
                let user = await User.findOne({ googleId: profile.id });
                if (user) {
                    done(null, user);
                } else {
                    user = await User.create(newUser);
                    done(null, user);
                }
            } catch (error) {
                console.log(error);
            }
        }
    )
);

// Serialize and deserialize user
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


// Add a login route handler for Google OAuth
app.get('/login', passport.authenticate('google', { scope: ['profile', 'email'] }));


// Example of using passport.authenticate middleware for authentication
app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard', // Redirect to dashboard on successful login
    failureRedirect: '/login', // Redirect back to login page on failure
    failureFlash: true // Enable flash messages for error handling (if using)
}));

// Google authentication route
app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google authentication callback route
app.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login-failure",
        successRedirect: "/dashboard",
    })
);



// Route if something goes wrong
app.get('/login-failure', (req, res) => {
    res.send('Something went wrong...');
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(error => {
        if (error) {
            console.log(error);
            res.send('Error loggin out');
        } else {
            res.redirect('/')
        }
    })
});


// Handle 404
app.get('*', function (req, res) {
    res.status(404).render('404');
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});