import fetch, {Request, Response, Headers} from 'node-fetch';
import HttpProxyAgent from 'http-proxy-agent';
import {TextEncoder} from 'util';
import koa from 'koa';
import logger from 'koa-logger';
import toml from 'toml';
import fs from 'fs';

global.fetch = async (url, init) => {
  const proxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const agent = proxy ? new HttpProxyAgent(proxy) : undefined;
  return await fetch(url, {
    ...init,
    agent,
  });
};
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
global.TextEncoder = TextEncoder;

export function bindGlobal(target) {
  Object.keys(target).forEach((key) => {
    if (typeof target[key] === 'function') {
      global[key] = target[key].bind(target);
    } else {
      global[key] = target[key];
    }
  });
}

export default {
   startServer(port, host, config, database, handler) {
    var env = {}
    if (config) {
      const raw = fs.readFileSync(config);
      const tomlFile = toml.parse(raw);  
      env = {
        ...env,
        ...tomlFile,
      }
    }
    if (database) {
      env = {
        ...env,
        ...database
      }
    }
    const app = new koa();
    app.use(logger());
    app.use(async (ctx) => {
      const url = new URL(`http://localhost${ctx.request.url}`);
      const request = new Request(url, {
        method: ctx.request.method,
        headers: ctx.request.headers,
        body: ctx.request.body,
      });
      const response = await handler(request, env);
      ctx.status = response.status;
      ctx.body = response.body;
      for (const [key, value] of response.headers) {
        ctx.set(key, value);
      }
    })
    app.listen(port, host);
   }
}