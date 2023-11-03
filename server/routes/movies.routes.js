const express = require('express');
const router = express.Router();
const db = require('../db');
const { getSearch, getMovie, getActor, getDirector } = require('../controllers/movies.controller');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/buscar', getSearch);

router.get('/pelicula/:id', getMovie);

router.get('/actor/:id', getActor);

router.get('/director/:id', getDirector);

module.exports = router;