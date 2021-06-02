import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDqFxIF8EtYwkmFMHuyaQkijxNlXJWMhWk",
  authDomain: "stripe-js-course-dc8be.firebaseapp.com",
  projectId: "stripe-js-course-dc8be",
  storageBucket: "stripe-js-course-dc8be.appspot.com",
  messagingSenderId: "850446743170",
  appId: "1:850446743170:web:c6343941af0e536bb7a69b",
};

firebase.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
