/**
 * GraphQL Server Setup for Monetixra
 * Integrates Apollo Server with Express
 */

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const { readFileSync } = require('fs');
const { join } = require('path');
const { resolvers } = require('./graphql/resolvers');
const { buildSchema } = require('graphql');

// Import schema
const typeDefs = require('./graphql/schema.graphql');

/**
 * Setup GraphQL Server
 */
async function setupGraphQLServer(app, httpServer) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer })
    ],
    context: ({ req }) => {
      // Extract user from JWT token or session
      const token = req.headers.authorization || '';
      const user = token ? verifyToken(token) : null;
      
      return {
        user,
        pubsub: io // Socket.io instance for subscriptions
      };
    },
    formatError: (error) => {
      console.error('[GraphQL Error]', error);
      return {
        message: error.message,
        path: error.path,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
        }
      };
    }
  });

  await server.start();
  
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization || '';
        const user = token ? verifyToken(token) : null;
        return { user, pubsub: io };
      }
    })
  );

  console.log('[GraphQL] Server started at /graphql');
  return server;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('[GraphQL] Token verification failed:', error);
    return null;
  }
}

module.exports = { setupGraphQLServer };
