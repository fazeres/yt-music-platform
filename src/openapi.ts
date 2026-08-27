export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'YouTube Music Streaming Platform API',
    version: '1.0.0',
    description: 'REST API spec for personal self-hosted YouTube Music streaming platform',
  },
  servers: [{ url: '/api', description: 'API server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { 200: { description: 'API health status' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  deviceName: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { 200: { description: 'JWT token and session info' } },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh JWT token',
        responses: { 200: { description: 'New JWT token' } },
      },
    },
    '/auth/sessions': {
      get: {
        summary: 'List user active sessions',
        responses: { 200: { description: 'List of sessions' } },
      },
    },
    '/search': {
      get: {
        summary: 'Search YouTube for tracks',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Array of search results' } },
      },
    },
    '/admin/quota': {
      get: {
        summary: 'Get daily YouTube API quota stats',
        responses: { 200: { description: 'Quota stats' } },
      },
    },
    '/tracks/{videoId}/resolve': {
      post: {
        summary: 'Resolve and cache audio for a YouTube video',
        parameters: [{ name: 'videoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Already cached' },
          202: { description: 'Extraction queued' },
        },
      },
    },
    '/stream/{videoId}': {
      get: {
        summary: 'Stream audio file with HTTP Range support',
        parameters: [{ name: 'videoId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Full audio stream' },
          206: { description: 'Partial audio stream (Range)' },
        },
      },
    },
    '/library/playlists': {
      get: { summary: 'Get user playlists', responses: { 200: { description: 'List of playlists' } } },
      post: {
        summary: 'Create playlist',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } },
        },
        responses: { 201: { description: 'Playlist created' } },
      },
    },
    '/library/favorites': {
      get: { summary: 'Get user favorites', responses: { 200: { description: 'List of favorites' } } },
      post: { summary: 'Add track to favorites', responses: { 201: { description: 'Favorited' } } },
    },
    '/library/history/stats': {
      get: { summary: 'Get listening stats and year-in-review', responses: { 200: { description: 'Listening stats' } } },
    },
    '/recommendations': {
      get: { summary: 'Get personalized track recommendations', responses: { 200: { description: 'Recommendations list' } } },
    },
    '/cache/stats': {
      get: { summary: 'Get audio disk cache statistics', responses: { 200: { description: 'Cache statistics' } } },
    },
  },
};
