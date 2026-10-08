"use client";

import { MapPin, Phone, Store } from "lucide-react";

export default function BranchesPage() {
  const branches = [
    {
      name: "Nomad Edge Store - Central Showroom",
      address: "Улаанбаатар хот, Хан-Уул дүүрэг, 3-р хороо, Мишээл экспо төв",
      phone: "86185769",
      map: "https://maps.google.com/?q=Misheel+Expo+Ulaanbaatar",
    },
    {
      name: "Nomad Edge Store - Pickup Point",
      address: "Улаанбаатар хот, Баянгол дүүрэг, 4-р хороо, Нарны зам",
      phone: "88112233",
      map: "https://maps.google.com/?q=Narnii+zam+Ulaanbaatar",
    },
  ];

  return (
    <section className="max-w-5xl mx-auto px-6 py-16 space-y-12">
      <h1 className="text-3xl font-bold text-center">Салбарууд</h1>

      <div className="grid gap-5">
        {branches.map((branch) => (
          <div key={branch.name} className="border rounded-2xl p-6 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Store className="h-5 w-5" />
              <h2 className="font-semibold text-lg">{branch.name}</h2>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>{branch.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href={`tel:${branch.phone}`} className="hover:text-foreground">
                  {branch.phone}
                </a>
              </p>
              <a
                href={branch.map}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex mt-2 text-primary hover:underline"
              >
                Газрын зураг харах
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-2xl p-6 bg-card">
        <h3 className="font-semibold mb-2">Онлайн үйлчилгээ</h3>
        <p className="text-sm text-muted-foreground">
          Долоо хоногийн 7 өдөр, 10:00-20:00 цагт онлайнаар захиалга авч, Улаанбаатар
          болон орон нутагт хүргэлт хийж байна.
        </p>
      </div>
    </section>
  );
}
