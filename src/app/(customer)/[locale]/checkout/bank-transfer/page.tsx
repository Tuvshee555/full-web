import { Suspense } from "react";
import BankTransferClient from "./BankTransferClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BankTransferClient />
    </Suspense>
  );
}
