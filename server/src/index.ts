import * as express from 'express';
import * as functions from 'firebase-functions';
import { createNestServer } from './app';
const server = express();

createNestServer(server)
  .then(() => console.log('Nest Ready'))
  .catch((err) => console.error('Nest broken', err));

export const api = functions.https.onRequest(server);
