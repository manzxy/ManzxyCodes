// ecosystem.config.cjs
// PM2 config untuk ManzxyCodes
//
// Cara pakai:
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup   ← ikuti instruksinya supaya auto-start

module.exports = {
  apps: [
    {
      name:         'manzxycodes',
      script:       'manzxy.js',
      interpreter:  'node',

      // Env vars — bisa juga pakai file .env
      env_production: {
        NODE_ENV:  'production',
        PORT:      3000,
      },
      env_development: {
        NODE_ENV:  'development',
        PORT:      3000,
      },

      // Jalankan 1 instance (gunakan 'max' untuk cluster mode jika punya banyak CPU)
      instances:    1,
      exec_mode:    'fork',

      // Auto-restart jika crash
      autorestart:  true,
      watch:        false,
      max_memory_restart: '256M',

      // Log
      out_file:  './logs/out.log',
      error_file:'./logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready:   true,
    },
  ],
};
