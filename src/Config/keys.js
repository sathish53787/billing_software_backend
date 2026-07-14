import { APP_MODE } from './appConfig.js';

export const keys = {
  MONGO_DB_URL:
    process.env.MONGO_DB_URL ||
    'mongodb+srv://twinsdayrestaurant_db_user:Twinday2026@twinsday.fsnm500.mongodb.net/TwinsDay?retryWrites=true&w=majority&appName=TwinsDay',
};

if (APP_MODE === 'prod') {
  keys.backEndUrl = 'https://api.twinsday.com/api/v1';
  keys.frontEndUrl = 'https://twinsday.com';
} else {
  keys.backEndUrl = 'http://localhost:8080/api/v1';
  keys.frontEndUrl = 'http://localhost:3000';
}
