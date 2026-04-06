//Librerias
import "rootpath";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
//Archivos de configuración propios
import config from "./middlewares/config.mjs";
import errorHandler from "./middlewares/error-handler.mjs";
// archivos que procesan las entidades (tablas) del proyecto
import ProductoController from "./controllers/producto.controller.mjs";
// se instancia el servidor
const app = express();
//libreria en tiempo de desarrollo para poder ver el tipo de peticion que te estan mandando
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: false })); //decodifica los json que envia el cliente
app.use(bodyParser.json()); //decodifica los json que envia el cliente
app.use(cors()); // evita que tengas el error de no poderconectarte a tu mismo servidor
//se establecen tus rutas o tus apis o tus endpoints
app.use("/producto", ProductoController);
app.use(errorHandler);
// inicia el servidor
app.listen(config.PORT, function () {
console.log("Server listening on port ", config.PORT);
});