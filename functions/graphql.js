const serverlessHttp = require("serverless-http");

const app = require("./index.js");

module.exports.handler = serverlessHttp(app, {
  /**
   * **** IMPORTANT ****
   * this request() function is important because
   * it adds the lambda's event and context object
   * into the express's req object so you can access
   * inside the resolvers or routes if youre not using apollo
   */
  request(req, event, context) {
    req.event = event;
    req.context = context;
  }
});
