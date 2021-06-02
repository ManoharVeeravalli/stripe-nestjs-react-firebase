// Initialize Firebase Admin resources
import * as firebaseAdmin from 'firebase-admin';
import { config } from 'dotenv';


if (process.env.NODE_ENV !== 'production') {
  config();
}
firebaseAdmin.initializeApp();

export const db = firebaseAdmin.firestore();
export const auth = firebaseAdmin.auth();
