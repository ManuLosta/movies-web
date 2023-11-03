const db = require('../db');

const getSearch = (req, res) => {
    const searchTerm = req.query.q;

    // Realizar la búsqueda en la base de datos
    db.all(
        'SELECT * FROM movie WHERE title LIKE ?',
        [`%${searchTerm}%`],
        (err, movies) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error en la búsqueda.');
            } else {
                db.all(
                    `SELECT DISTINCT p.person_name, p.person_id
                    FROM movie_cast AS mc
                    JOIN person AS p ON mc.person_id = p.person_id
                    WHERE p.person_name LIKE ?`,
                    [`%${searchTerm}%`],
                    (err, actors) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send('Error en la búsqueda.');
                        } else {
                            db.all(
                                `SELECT DISTINCT p.person_name, p.person_id
                                FROM movie_crew AS mc
                                JOIN person AS p ON p.person_id = mc.person_id
                                WHERE mc.job = 'Director' AND p.person_name LIKE ?`,
                                [`%${searchTerm}%`],
                                (err, directors) => {
                                    if (err) {
                                        console.log(err);
                                        res.status(500).send('Error en la búsqueda.');
                                    } else {
                                        res.render('resultado', { movies, actors, directors })
                                    }
                                }
                            );
                        }
                    }
                );
            }
        }
    );
}


const getMovie = (req, res) => {
    const movieId = req.params.id;

    // Consulta SQL para obtener los datos de la película, elenco y crew
    const query = `
    SELECT
      movie.*,
      actor.person_name as actor_name,
      actor.person_id as actor_id,
      crew_member.person_name as crew_member_name,
      crew_member.person_id as crew_member_id,
      movie_cast.character_name,
      movie_cast.cast_order,
      department.department_name,
      movie_crew.job
    FROM movie
    LEFT JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
    LEFT JOIN person as actor ON movie_cast.person_id = actor.person_id
    LEFT JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
    LEFT JOIN department ON movie_crew.department_id = department.department_id
    LEFT JOIN person as crew_member ON crew_member.person_id = movie_crew.person_id
    WHERE movie.movie_id = ?
  `;

    // Ejecutar la consulta
    db.all(query, [movieId], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar los datos de la película.');
        } else if (rows.length === 0) {
            res.status(404).send('Película no encontrada.');
        } else {
            // Organizar los datos en un objeto de película con elenco y crew
            const movieData = {
                id: rows[0].id,
                title: rows[0].title,
                release_date: rows[0].release_date,
                overview: rows[0].overview,
                directors: [],
                writers: [],
                cast: [],
                crew: [],
            };

            // Crear un objeto para almacenar directores
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en directors
                    const isDuplicate = movieData.directors.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de directors
                        if (row.department_name === 'Directing' && row.job === 'Director') {
                            movieData.directors.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            // Crear un objeto para almacenar writers
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en writers
                    const isDuplicate = movieData.writers.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de writers
                        if (row.department_name === 'Writing' && row.job === 'Writer') {
                            movieData.writers.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            // Crear un objeto para almacenar el elenco
            rows.forEach((row) => {
                if (row.actor_id && row.actor_name && row.character_name) {
                    // Verificar si ya existe una entrada con los mismos valores en el elenco
                    const isDuplicate = movieData.cast.some((actor) =>
                        actor.actor_id === row.actor_id
                    );

                    if (!isDuplicate) {
                    // Si no existe, agregar los datos a la lista de elenco
                        movieData.cast.push({
                            actor_id: row.actor_id,
                            actor_name: row.actor_name,
                            character_name: row.character_name,
                            cast_order: row.cast_order,
                        });
                    }
                }
            });

            // Crear un objeto para almacenar el crew
            rows.forEach((row) => {
                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                    // Verificar si ya existe una entrada con los mismos valores en el crew
                    const isDuplicate = movieData.crew.some((crew_member) =>
                        crew_member.crew_member_id === row.crew_member_id
                    );

                    // console.log('movieData.crew: ', movieData.crew)
                    // console.log(isDuplicate, ' - row.crew_member_id: ', row.crew_member_id)
                    if (!isDuplicate) {
                        // Si no existe, agregar los datos a la lista de crew
                        if (row.department_name !== 'Directing' && row.job !== 'Director'
                        && row.department_name !== 'Writing' && row.job !== 'Writer') {
                            movieData.crew.push({
                                crew_member_id: row.crew_member_id,
                                crew_member_name: row.crew_member_name,
                                department_name: row.department_name,
                                job: row.job,
                            });
                        }
                    }
                }
            });

            res.render('pelicula', { movie: movieData });
        }
    });
}


const getPerson = (req, res) => {
    const personId = req.params.id;

    db.all(
        `SELECT m.title, m.movie_id, p.person_name, m.release_date
        FROM person as p JOIN movie_crew as mcr ON p.person_id = mcr.person_id
        JOIN movie as m ON m.movie_id = mcr.movie_id
        WHERE mcr.job = 'Director' AND p.person_id = ?`,
        [personId],
        (err, moviesDirector) => {
            if (err) {
                console.log('Peliculas no encontradas');
                res.status(500).send('Error al cargar los datos de la persona.');
            } else {
                db.all(
                    `SELECT m.title, m.movie_id, mc.character_name, m.release_date, p.person_name
                    FROM person as p JOIN movie_cast as mc ON p.person_id = mc.person_id
                    JOIN movie as m ON m.movie_id = mc.movie_id
                    WHERE p.person_id = ?`,
                    [personId],
                    (err, moviesActor) => {
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

module.exports = {
    getSearch,
    getMovie,
    getPerson,
}