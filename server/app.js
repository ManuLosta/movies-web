const express = require('express');
const router = require('./routes/movies.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('views'));

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

app.use(router);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
