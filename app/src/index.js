import React from "react";
import ReactDOM from "react-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { FirebaseAppProvider } from "reactfire";
import { firebaseConfig } from "./firebase";
import "./index.css";

import App from "./App";

export const stripePromise = loadStripe(
  "pk_test_51Ix4wJSJzInEwQYNxBSId5G5dweEZSNbjt6sW7Aqsx5DfkWVyeTGR1B5P8yq2c4rzgO3q9OsufIb4MCnMVxlbCTV00uqqsfc7R"
);

ReactDOM.render(
  <React.StrictMode>
    <FirebaseAppProvider firebaseConfig={firebaseConfig}>
      <Elements stripe={stripePromise}>
        <App />
      </Elements>
    </FirebaseAppProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
