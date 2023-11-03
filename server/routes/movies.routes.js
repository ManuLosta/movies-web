const express = require('express');
const router = express.Router();
const db = require('../db');
const { getSearch, getMovie, getPerson } = require('../controllers/movies.controller');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/buscar', getSearch);

router.get('/pelicula/:id', getMovie);

router.get('/persona/:id', getPerson);

module.exports = router;