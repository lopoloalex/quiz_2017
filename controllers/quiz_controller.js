var models = require("../models");
var Sequelize = require('sequelize');

var paginate = require('../helpers/paginate').paginate;

// Autoload el quiz asociado a :quizId
exports.load = function (req, res, next, quizId) {

    models.Quiz.findById(quizId)
    .then(function (quiz) {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('No existe ningún quiz con id=' + quizId);
        }
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes
exports.index = function (req, res, next) {

    var countOptions = {};

    // Busquedas:
    var search = req.query.search || '';
    if (search) {
        var search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { $like: search_like }};
    }

    models.Quiz.count(countOptions)
    .then(function (count) {

        // Paginacion:

        var items_per_page = 10;

        // La pagina a mostrar viene en la query
        var pageno = parseInt(req.query.pageno) || 1;

        // Crear un string con el HTML que pinta la botonera de paginacion.
        // Lo añado como una variable local de res para que lo pinte el layout de la aplicacion.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        var findOptions = countOptions;

        findOptions.offset = items_per_page * (pageno - 1);
        findOptions.limit = items_per_page;

        return models.Quiz.findAll(findOptions);
    })
    .then(function (quizzes) {
        res.render('quizzes/index.ejs', {
            quizzes: quizzes,
            search: search
        });
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes/:quizId
exports.show = function (req, res, next) {

    res.render('quizzes/show', {quiz: req.quiz});
};


// GET /quizzes/new
exports.new = function (req, res, next) {

    var quiz = {question: "", answer: ""};

    res.render('quizzes/new', {quiz: quiz});
};


// POST /quizzes/create
exports.create = function (req, res, next) {

    var quiz = models.Quiz.build({
        question: req.body.question,
        answer: req.body.answer
    });

    // guarda en DB los campos pregunta y respuesta de quiz
    quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz creado con éxito.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/new', {quiz: quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al crear un Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = function (req, res, next) {

    res.render('quizzes/edit', {quiz: req.quiz});
};


// PUT /quizzes/:quizId
exports.update = function (req, res, next) {

    req.quiz.question = req.body.question;
    req.quiz.answer = req.body.answer;

    req.quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz editado con éxito.');
        res.redirect('/quizzes/' + req.quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/edit', {quiz: req.quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = function (req, res, next) {

    req.quiz.destroy()
    .then(function () {
        req.flash('success', 'Quiz borrado con éxito.');
        res.redirect('/quizzes');
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = function (req, res, next) {

    var answer = req.query.answer || '';

    res.render('quizzes/play', {
        quiz: req.quiz,
        answer: answer
    });
};

// GET /quizzes/randomplay
exports.randomplay = function (req, res, next) {

    if (!req.session.respondidas){req.session.respondidas = [-1];}//si no hay => crea con respondidas vacia
    //if (!req.session.score) {req.session.score = 0;}// si no hay puntuacion anterior => puntuacion a 0
    //var puntuacion = req.session.score;
    if (req.session.respondidas.length == req.totalQuizCount) { // si ha respondido todas 
        var acertadas = req.session.respondidas.length-1;
        req.session.respondidas=[-1]; // reinicio las preguntas 
        res.render('quizzes/random_nomore', { score: acertadas  //se le envia a la pagina random_nomore
    }); // aun no se han respondido todas
}else{
    var Id = Math.floor(Math.random()*req.totalQuizCount+1);
    while {(req.session.respondidas.includes(Id) && req.session.respondidas.length <= req.totalQuizCount)// mientras Id este respondido 
        Id = Math.floor(Math.random() * (req.totalQuizCount) + 1);}// si esta entre las respondidas cogemos otro aleatorio id 

    req.session.respondidas.push(Id); // metemos Id
    models.Quiz.findById(Id)
     .then(function (quiz) {
        if (quiz) {
            req.quiz = quiz;
            var acertadas = req.session.respondidas.length-1;
             res.render('quizzes/random_play', {
                 quiz: req.quiz, 
                 answer: '',
                 score: acertadas
             });
             next();
         } else {
             throw new Error('No existe ese Id');
         }
     })
     .catch(function (error) {
         next(error);
    });
    }
    };
// GET /quizzes/randomcheck/:quizId?answer=respuesta
exports.randomcheck  = function (req, res, next) {
    var respuesta = req.query.answer || "";//respuesta es igual a la answer o un string vacio
    var acierto = respuesta.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim(); // comparamos la respuesta dada con la correcta
    var acertadas= req.session.respondidas.length-1;
if (acierto){// acierto es un booleano 
req.session.respondidas.push(req.quiz.id);// si es correcta meto esta quiz en el array de las completadas
acertadas++; // sumo uno a acertadas
} else {
    req.session.respondidas=[-1] // reinicio la array con las respondidas
}
res.render('quizzes/random_result', {
        score: acertadas,
        result: acierto,
       answer: respuesta
   });
};
// GET /quizzes/:quizId/check
exports.check = function (req, res, next) {

    var answer = req.query.answer || "";

    var result = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz: req.quiz,
        result: result,
        answer: answer
    });
};
