// PM2 Ecosystem Configuration for Production Deployment
// Usage: pm2 start ecosystem.config.js

module.exports = {
    apps: [
        {
            name: 'comic-server',
            cwd: './server',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            env_file: './server/.env',
            watch: false,
            max_memory_restart: '500M',
            error_file: './logs/server-error.log',
            out_file: './logs/server-out.log',
            time: true
        },
        {
            name: 'image-server',
            cwd: './image-server',
            script: 'server.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3002
            },
            env_file: './image-server/.env',
            watch: false,
            max_memory_restart: '500M',
            error_file: './logs/image-server-error.log',
            out_file: './logs/image-server-out.log',
            time: true
        }
    ]
};

// To start the applications, run: pm2 start ecosystem.config.cjs
// To monitor the applications, run: pm2 monit
// To view logs, run: pm2 logs
// To restart applications, run: pm2 restart comic-server image-server
// To stop applications, run: pm2 stop comic-server image-server
// To delete applications, run: pm2 delete comic-server image-server