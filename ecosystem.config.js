module.exports = {
  apps: [
    {
      name: 'clinic-organizer-pro-api',
      cwd: './project',
      script: 'backend/dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8788,
      },
    },
  ],
};
