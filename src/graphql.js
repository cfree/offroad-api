import serverlessHttp from "serverless-http";

import app from "./index.js";

export const handler = serverlessHttp(app, {
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