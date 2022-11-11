import { graphql, rest } from 'msw';

function makePost(id: number, title = 'Awesome Post') {
  return { id, title: `${id} ${title}` };
}

export const handlers: any[] = [
  // Handles a "GetUserInfo" query
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.query('Posts', (req, res, ctx) => {
    return res(
      ctx.data({
        posts: new Array(5).fill(0).map((_, idx) => makePost(idx + 1))
      })
    );
  }),
  graphql.query('Post', (req, res, ctx) => {
    return res(
      ctx.data({
        post: makePost(req.variables.id)
      })
    );
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.query('QueryParseError', (req, res) => {
    return res(resVar => {
      resVar.headers.set('content-type', 'text/html');
      resVar.body = '<div></div>';

      return resVar;
    });
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.query('QueryNetworkError', (req, res) => {
    return res.networkError('Failed to connect');
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.query('QueryError', (req, res, ctx) => {
    return res(
      ctx.errors([
        {
          message: 'Not authenticated',
          errorType: 'AuthenticationError'
        }
      ])
    );
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.query('ErrorWith500', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.errors([
        {
          message: 'Not authenticated',
          errorType: 'AuthenticationError'
        }
      ])
    );
  }),
  graphql.mutation('LikePost', (req, res, ctx) => {
    return res(ctx.data({ likePost: makePost(req.variables.id || 1) }));
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.mutation('MutationError', (req, res, ctx) => {
    return res(
      ctx.errors([
        {
          message: 'Not authenticated',
          errorType: 'AuthenticationError'
        }
      ])
    );
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.mutation('MutationParseError', (req, res) => {
    return res(resVar => {
      resVar.headers.set('content-type', 'text/html');
      resVar.body = '<div></div>';

      return resVar;
    });
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  graphql.mutation('MutationNetworkError', (req, res) => {
    return res.networkError('Failed to connect');
  }),
  // Handles Batched requests
  rest.post('https://test.com/graphql', async (req, res, ctx) => {
    if (!Array.isArray(req.body)) {
      throw new Error('Unknown operation');
    }
    const responses = await Promise.all(
      req.body.map(async op => {
        const partReq = { ...req, body: op };
        const handler = handlers.find(h => h.test(partReq));
        if (!handler) {
          return Promise.reject(new Error(`Cannot handle operation ${op}`));
        }

        return handler.run(partReq);
      })
    );

    const batchedResponse = responses.map(d => {
      return JSON.parse(d?.response?.body) || {};
    });

    return res(ctx.json(batchedResponse));
  })
];
