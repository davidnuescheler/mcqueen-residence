/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable */

/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable */
const {
  Runtime
} = require('@adobe/htlengine');

function run(runtime) {
  const $ = {
    col: runtime.col,
    exec: runtime.exec.bind(runtime),
    xss: runtime.xss.bind(runtime),
    listInfo: runtime.listInfo.bind(runtime),
    use: runtime.use.bind(runtime),
    slyResource: runtime.resource.bind(runtime),
    call: runtime.call.bind(runtime),
    template: runtime.template.bind(runtime),
    dom: runtime.dom
  };
  return runtime.run(function* () {
    let content = runtime.globals["content"];
    let request = runtime.globals["request"];
    let context = runtime.globals["context"];
    let payload = runtime.globals["payload"];
    const global = runtime.globals;
    let $t,
        $n = $.dom.start();
    const var_0 = content["document"]["body"];
    $.dom.append($n, var_0);
    $.dom.text($n, "\n");
    return $.dom.end();
  });
}

module.exports.main = async function main(context) {
  const global = Object.assign({}, context);
  global.payload = new Proxy(global, {
    get: function (obj, prop) {
      process.emitWarning(`payload.${prop}: The use of the global 'payload' variable is deprecated in HTL. use 'context.${prop}' instead.`);
      return obj[prop];
    }
  });
  global.context = context;
  const runtime = new Runtime();
  runtime.setGlobal(global);

  if (context.content && context.content.document && context.content.document.implementation) {
    runtime.withDomFactory(new Runtime.VDOMFactory(context.content.document.implementation));
  }

  return await run(runtime);
};

function helix_wrap_action(main) {
  const {
    OpenWhiskAction
  } = require('@adobe/helix-pipeline');

  const {
    pipe
  } = require('@adobe/helix-pipeline/src/defaults/html.pipe.js');

  const {
    pre,
    before,
    after,
    replace
  } = require('@adobe/helix-pipeline/src/defaults/html.pre.js'); // todo: move to helix-pipeline


  const CONTEXT_PROPS = ['error', 'request', 'content', 'response'];
  const CONTENT_PROPS = ['sources', 'body', 'mdast', 'sections', 'document', 'htast', 'json', 'xml', 'meta', 'title', 'intro', 'image'];
  const REQUEST_PROPS = ['url', 'path', 'pathInfo', 'rootPath', 'selector', 'extension', 'method', 'headers', 'params'];
  const RESPONSE_PROPS = ['status', 'body', 'hast', 'headers', 'document'];

  const filterObject = (obj, allowedProperties) => {
    if (!obj) {
      return;
    }

    Object.keys(obj).forEach(key => {
      if (allowedProperties.indexOf(key) < 0) {
        delete obj[key];
      }
    });
  };

  const sanitizeContext = context => {
    filterObject(context, CONTEXT_PROPS);
    filterObject(context.content, CONTENT_PROPS);
    filterObject(context.request, REQUEST_PROPS);
    filterObject(context.response, RESPONSE_PROPS);
  }; // this gets called by openwhisk


  return async function wrapped(params) {
    // this is the once function that will be installed in the pipeline
    async function once(context, action) {
      // calls the pre function and then the script's main.
      async function invoker(next) {
        const ret = await Promise.resolve(pre(context, action));
        const res = await Promise.resolve(next(ret || context, action));

        if (!context.response) {
          context.response = {};
        }

        if (typeof res === 'object') {
          // check for response from direct script
          if (res.response) {
            context.response = res.response;
          } else if (res.type) {
            context.response.hast = res;
          } else {
            context.response.document = res;
          }
        } else {
          context.response.body = String(res);
        }

        sanitizeContext(context);
        return context;
      }

      return invoker(main);
    }

    if (before) {
      once.before = before;
    }

    if (after) {
      once.after = after;
    }

    if (replace) {
      once.replace = replace;
    }

    return OpenWhiskAction.runPipeline(once, pipe, params);
  };
}

module.exports.main = helix_wrap_action(module.exports.main);
//# sourceMappingURL=plain_html.js.map