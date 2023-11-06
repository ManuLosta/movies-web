const db = require('../db');

const getSearch = (req, res) => {
    const searchType = req.query.type;
    const searchTerm = req.query.q;

    const handleSearchResults = (err, movies, actors = [], directors = []) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error en la búsqueda.');
        } else {
            res.render('resultado', { movies, actors, directors });
        }
    };

    if (searchType == "all") {
        db.all(
            'SELECT * FROM movie WHERE title LIKE ? ORDER BY popularity DESC',
            [`%${searchTerm}%`],
            (err, movies) => {
                if (err) {
                    handleSearchResults(err);
                } else {
                    db.all(
                        `SELECT DISTINCT p.person_name, p.person_id
                        FROM movie_cast AS mc
                        JOIN person AS p ON mc.person_id = p.person_id
                        WHERE p.person_name LIKE ?`,
                        [`%${searchTerm}%`],
                        (err, actors) => {
                            if (err) {
                              handleSearchResults(err);
                            } else {
                                db.all(
                                    `SELECT DISTINCT p.person_name, p.person_id
                                    FROM movie_crew AS mc
                                    JOIN person AS p ON p.person_id = mc.person_id
                                    WHERE mc.job = 'Director' AND p.person_name LIKE ?`,
                                    [`%${searchTerm}%`],
                                    (err, directors) => {
                                        handleSearchResults(err, movies, actors, directors);
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    } else if (searchType == "keywords") {
        db.all(
            `SELECT m.title, m.movie_id, m.release_date
            FROM movie as m JOIN movie_keywords as mk ON m.movie_id = mk.movie_id
            JOIN keyword as k ON k.keyword_id = mk.keyword_id
            WHERE k.keyword_name = ?`,
            [`${searchTerm}`],
            (err, movies) => {
                handleSearchResults(err, movies);
            }
        )
    }
    
}


const getMovie = (req, res) => {
    const movieId = req.params.id;

    const movieQuery = `
    SELECT
        m.*,
        c.country_name,
        g.genre_name,
        prc.company_name,
        k.keyword_name,
        k.keyword_id
    FROM movie AS m
    JOIN movie_genres AS mg ON mg.movie_id = m.movie_id
    JOIN genre AS g ON mg.genre_id = g.genre_id
    JOIN production_country AS pc ON m.movie_id = pc.movie_id
    JOIN country AS c ON pc.country_id = c.country_id
    JOIN movie_company AS mc ON mc.movie_id = m.movie_id
    JOIN production_company AS prc ON prc.company_id = mc.company_id
    JOIN movie_keywords AS mk ON mk.movie_id = m.movie_id
    JOIN keyword AS k ON k.keyword_id = mk.keyword_id
    WHERE m.movie_id = ?
    `;

    const castQuery = `
    SELECT 
        p.person_name,
        p.person_id,
        mc.character_name
    FROM person AS p
    JOIN movie_cast AS mc ON p.person_id = mc.person_id
    WHERE mc.movie_id = ?
    ORDER BY mc.cast_order
    `;

    const crewQuery = `
    SELECT 
        p.person_name, 
        mc.job,
        p.person_id,
        d.department_name
    FROM person AS p
    JOIN movie_crew AS mc ON mc.person_id = p.person_id
    JOIN department AS d ON d.department_id = mc.department_id
    WHERE mc.movie_id = ?
    `;

    db.all(movieQuery, movieId, (err, movie) => {
        if (err) {
            console.log('Película no encontrada');
            res.status(500).send('Error al cargal la información de la película');
        }

        const removeDuplicates = (data, key) => {
            const unique = [];
            const seen = new Set();
        
            data.forEach(element => {
                const value = element[key];
        
                if (!seen.has(value)) {
                    seen.add(value);
                    unique.push(element);
                }
            });
        
            return unique;
        }
        
        const genres = removeDuplicates(movie, 'genre_name');
        const keywords = removeDuplicates(movie, 'keyword_name');

        db.all(crewQuery, movieId, (err, crew) => {
            if (err) {
                console.log('Crew no encontrados');
                return res.status(500).send('Error al cargar los directores de la película');
            }
            
            db.all(castQuery, movieId, (err, cast) => {
                if (err) {
                    console.log('Actores no encontrados');
                    return res.status(500).send('Error al cargar los directores de la película');
                }

                const directors = crew.filter(person => person.job == 'Director');

                res.render('pelicula', { movie, cast, crew, directors, genres, keywords });
            });
        });
    });
}


const getPerson = (req, res) => {
    const personId = req.params.id;

    const directorQuery = `
        SELECT m.title, m.movie_id, p.person_name, m.release_date
        FROM person as p
        JOIN movie_crew as mcr ON p.person_id = mcr.person_id
        JOIN movie as m ON m.movie_id = mcr.movie_id
        WHERE mcr.job = 'Director' AND p.person_id = ?
    `;

    const actorQuery = `
        SELECT m.title, m.movie_id, mc.character_name, m.release_date, p.person_name
        FROM person as p
        JOIN movie_cast as mc ON p.person_id = mc.person_id
        JOIN movie as m ON m.movie_id = mc.movie_id
        WHERE p.person_id = ?
    `;

    db.all(directorQuery, [personId], (err, moviesDirector) => {
        if (err) {
            console.log('Peliculas no encontradas');
            res.status(500).send('Error al cargar los datos de la persona.');
        } else {
            db.all(actorQuery, [personId],(err, moviesActor) => {
                if (err) {
                    console.log('Peliculas no encontradas');
                    res.status(500).send('Error al cargar los datos de la persona.');
                } else {
                    const name = (moviesDirector.length != 0) ? moviesDirector[0].person_name : moviesActor[0].person_name;
                    res.render('person', { moviesDirector, moviesActor, name });
                }
                }
            );
        }
        }
    );
}

const getMoviesKeyWord = (req, res) => {
    const keywordId = req.params.id;

    const query = `
        SELECT m.*, k.keyword_name
        FROM keyword AS k
        JOIN movie_keywords AS mk ON k.keyword_id = mk.keyword_id
        JOIN movie AS m ON m.movie_id = mk.movie_id
        WHERE k.keyword_id = ?;
    `;

    db.all(query, keywordId, (err, movies) => {
        if (err) {
            console.log('Peliculas no encontradas');
            res.status(500).send('Error al cargar las peliculas');
        }

        res.render('keyword', { movies });
    });
}

module.exports = {
    getSearch,
    getMovie,
    getPerson,
    getMoviesKeyWord
}