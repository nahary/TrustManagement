import * as express from "express";
import * as bodyParser from "body-parser";
import * as expressJwt from "express-jwt";

const addTokenHandling = (app, jwtSecret: string) => {
  app.use(
    expressJwt({ secret: jwtSecret }).unless({
      path: ["/health", "/user.authenticate"]
    })
  );
  app.use(function customAuthTokenErrorHandler(err, req, res, next) {
    console.log(err);
    if (err.name === "UnauthorizedError") {
      res.status(401).send({
        apiVersion: req.body.apiVersion,
        error: { code: 401, message: "A valid JWT auth bearer token is required for this route." }
      });
    }
  });
  app.use(function aliasToken(req, res, next) {
    req.token = req.user;
    next();
  });
};

const logging = (req: express.Request, res, next) => {
  console.log(
    `\n${req.method} ${req.path} [user=${(req.token || {}).userId} body.data=${JSON.stringify(
      req.body.data
    )}]`
  );
  next();
};

export const createBasicApp = (jwtSecret: string, rootSecret: string) => {
  const app = express();
  app.use(bodyParser.json());
  addTokenHandling(app, jwtSecret);
  app.use(logging);
  return app;
};
