module.exports = {
  apps: [
    {
      name: 'smart-energy-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'smart-energy-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      // Sesuaikan path ini dengan lokasi instalasi node-red di mesin deploy SIER
      // (mis. lewat `npm root -g` + '/node-red/red.js').
      name: 'node-red',
      script: 'node-red',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
