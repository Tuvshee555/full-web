/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { API_BASE_URL } from "@admin/lib/api";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function QPayPage() {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const createPayment = async (amount = 100) => {
    setLoading(true);
    setStatus("");
    setPaid(false);
    setQrImage(null);
    setInvoiceId(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/qpay/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: `ORDER_${Date.now()}`, amount }),
        }
      );

      if (!res.ok) throw new Error("Failed to create invoice");

      const data = await res.json();
      setQrImage(`data:image/png;base64,${data.qr_image}`);
      setInvoiceId(data.invoice_id);
      setStatus("⌛ Waiting for payment...");
      // console.log("QPay token response:", res);
    } catch (err: any) {
      // console.error("Create payment error:", err.message);
      setStatus("❌ Failed to create payment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!invoiceId || paid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/qpay/check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId }),
          }
        );

        if (!res.ok) throw new Error("Failed to check payment");

        const data = await res.json();
        if (data.paid) {
          setPaid(true);
          setStatus("✅ Payment received!");
          clearInterval(interval);
        }
      } catch (err: any) {
        // console.error("Check payment error:", err.message);
        setStatus("⚠️ Checking payment failed, retrying...");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [invoiceId, paid]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">QPay Integration</h1>

      <button
        onClick={() => createPayment(100)}
        className="bg-blue-600 text-white px-6 py-3 rounded-none disabled:opacity-50 transition-all hover:bg-blue-700"
        disabled={loading || !!invoiceId}
      >
        {loading ? "Processing..." : paid ? "Paid ✅" : "Pay 100₮"}
      </button>

      {qrImage && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <Image
            src={qrImage}
            alt="QR Code"
            width={200}
            height={200}
            className="rounded-none shadow-md"
          />
          <p className="text-lg font-medium">{status}</p>

          {!paid && (
            <button
              onClick={() => setInvoiceId(null)}
              className="mt-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel / Retry
            </button>
          )}
        </div>
      )}

      {!qrImage && status && <p className="text-lg mt-4">{status}</p>}
    </div>
  );
}

// import React, { useState, useEffect } from "react";
// import axios, { AxiosResponse, AxiosError } from "axios";

// const QPAY_BASE_URL = "https://merchant-sandbox.qpay.mn/v2";
// const USERNAME = "DELIVERY_APP";
// const PASSWORD = "NwlvD0ro"; // double-check this

// interface TokenResponse {
//   access_token: string;
//   // Add other properties based on your response from the API
// }

// const QPayTokenComponent: React.FC = () => {
//   const [token, setToken] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);

//   useEffect(() => {
//     const fetchToken = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const res: AxiosResponse<TokenResponse> = await axios.post(
//           `${QPAY_BASE_URL}/auth/token`,
//           {}, // empty body
//           {
//             auth: { username: USERNAME, password: PASSWORD },
//           }
//         );
//         setToken(res.data.access_token); // Save the token to state
//       } catch (err) {
//         if (axios.isAxiosError(err)) {
//           // Handle Axios specific error
//           setError(err.response?.data?.message || err.message);
//         } else {
//           // For other errors
//           setError("An unknown error occurred.");
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchToken(); // Run the request when the component mounts
//   }, []); // Empty dependency array means this runs once when component mounts

//   return (
//     <div>
//       <h1>QPay Token Fetcher</h1>
//       {loading && <p>Loading...</p>}
//       {error && <p style={{ color: "red" }}>Error: {error}</p>}
//       {token && (
//         <div>
//           <h2>Access Token:</h2>
//           <pre>{token}</pre>
//         </div>
//       )}
//     </div>
//   );
// };

// export default QPayTokenComponent;
