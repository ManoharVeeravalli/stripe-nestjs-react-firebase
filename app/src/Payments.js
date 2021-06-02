import React, { useState } from "react";
import { fetchFromAPI } from "./helpers";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

function Payments() {
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = useState(0);
  const [paymentIntent, setPaymentIntent] = useState();

  // Create a payment intent on the server
  const createPaymentIntent = async (event) => {
    // Clamp amount to Stripe min/max
    const validAmonut = Math.min(Math.max(amount, 50), 9999999);
    setAmount(validAmonut);

    // Make the API Request
    const pi = await fetchFromAPI("stripe/payments", {
      body: { amount: validAmonut },
    });
    setPaymentIntent(pi);
  };

  // Handle the submission of card details
  const handleSubmit = async (event) => {
    event.preventDefault();

    const cardElement = elements.getElement(CardElement);

    // Confirm Card Payment
    const { paymentIntent: updatedPaymentIntent, error } =
      await stripe.confirmCardPayment(paymentIntent.client_secret, {
        payment_method: { card: cardElement },
      });

    if (error) {
      console.error(error);
      error.payment_intent && setPaymentIntent(error.payment_intent);
    } else {
        console.log('SUCCESS', paymentIntent);
      setPaymentIntent(updatedPaymentIntent);
    }
  };

  return (
    <>
      <div className="form-inline">
        <input
          type="number"
          className="form-control"
          value={amount}
          disabled={paymentIntent}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
         className="btn btn-success"
          disabled={amount <= 0}
          onClick={createPaymentIntent}
          hidden={paymentIntent}
        >
          Ready to Pay ${(amount / 100).toFixed(2)}
        </button>
      </div>
      <hr />

      <form onSubmit={handleSubmit} className="well">
        <h3>Step 2: Submit a Payment Method</h3>
        <p>Collect credit card details, then submit the payment.</p>
        <p>
          Normal Card: <code>4242424242424242</code>
        </p>
        <p>
          3D Secure Card: <code>4000002500003155</code>
        </p>

        <hr />

        <CardElement />
        <button className="btn btn-success" type="submit">Pay</button>
      </form>
    </>
  );
}

export default Payments;
