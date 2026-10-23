// The words of the Terms and Privacy pages, written from how the store actually works
// (checkout, payment windows, emails, chat, hosting). Delivery, returns and safety come
// from POLICIES, the same text the FAQ shows. Change the facts here when the store changes.
import { STORE, policiesFor } from "@/config/store";

export type LegalSection = { heading: string; paragraphs?: string[]; items?: string[] };
export type LegalDocument = { intro: string; sections: LegalSection[] };

type Locale = "mn" | "en";
const loc = (locale: string): Locale => (locale === "en" ? "en" : "mn");

/** "phone, email" in whatever order is available, for the "contact us" lines. */
const contactLine = (locale: Locale) => {
  const { phone, email } = STORE.contact;
  const parts = [phone && (locale === "en" ? `phone ${phone}` : `утас ${phone}`), email && (locale === "en" ? `email ${email}` : `имэйл ${email}`)].filter(Boolean);
  return parts.join(locale === "en" ? ", " : ", ");
};

export function termsDocument(localeInput: string, fee: string): LegalDocument {
  const locale = loc(localeInput);
  const policy = policiesFor(locale);
  const contact = contactLine(locale);

  if (locale === "en") {
    return {
      intro: `These terms apply when you order from ${STORE.name}. By confirming an order you accept them.`,
      sections: [
        {
          heading: "Ordering",
          paragraphs: [
            "An order is made when you add products to your cart, fill in your delivery details and press the confirm button. Our system checks prices and stock at that moment; a product that is out of stock can't be ordered.",
            "Stock for your order is held for you while we wait for payment (see below).",
          ],
        },
        {
          heading: "Prices and payment",
          paragraphs: [
            `Prices are in Mongolian tögrög (₮). Delivery costs ${fee} on top of the products, the same in Ulaanbaatar and the countryside.`,
            "You can pay with QPay (scan a QR code in your bank app) or by bank transfer.",
          ],
          items: [
            "QPay: pay the QR code within 15 minutes of confirming the order. If it isn't paid in time, the order is cancelled automatically and the stock is released.",
            "Bank transfer: write your order number in the transfer description and pay within 24 hours. We check our bank account and confirm the payment. An order not paid within 24 hours is cancelled automatically.",
            "If you sent money for an order that was already cancelled, contact us with your order number and we will look into it.",
          ],
        },
        {
          heading: "Delivery",
          paragraphs: [
            policy.delivery,
            "You can follow your order under Account → Order history. When its status changes we also email you (if you gave a real email address).",
          ],
        },
        { heading: "Returns and exchanges", paragraphs: [policy.returns] },
        {
          heading: "Using the products safely",
          paragraphs: [policy.safety, "Our products are for cosmetic care. They are not medicines and do not treat any condition."],
        },
        {
          heading: "Questions and complaints",
          paragraphs: [`For anything about an order or a product, contact us: ${contact}. You can also write to us in the chat on the website.`],
        },
        {
          heading: "Changes to these terms",
          paragraphs: ["We may update these terms. The latest version is always on this page, and the terms that applied when you ordered apply to that order."],
        },
      ],
    };
  }

  return {
    intro: `Эдгээр нөхцөл ${STORE.name} дэлгүүрээс захиалга хийх үед үйлчилнэ. Захиалга баталгаажуулснаар та эдгээр нөхцөлийг зөвшөөрсөнд тооцогдоно.`,
    sections: [
      {
        heading: "Захиалга",
        paragraphs: [
          "Сагсандаа бүтээгдэхүүн нэмж, хүргэлтийн мэдээллээ бөглөөд «Захиалга баталгаажуулах» товчийг дарснаар захиалга үүснэ. Үнэ болон нөөцийг захиалга үүсэх мөчид манай систем шалгана; нөөц дууссан бүтээгдэхүүнийг захиалах боломжгүй.",
          "Төлбөр хүлээх хугацаанд (доор харна уу) таны захиалсан бүтээгдэхүүний нөөцийг танд зориулж хадгална.",
        ],
      },
      {
        heading: "Үнэ ба төлбөр",
        paragraphs: [
          `Үнийг төгрөгөөр (₮) харуулна. Бүтээгдэхүүний үнэ дээр хүргэлтийн төлбөр ${fee} нэмэгдэнэ; Улаанбаатар болон орон нутагт ижил.`,
          "Төлбөрийг QPay (банкны аппаар QR уншуулж) эсвэл банкны шилжүүлгээр хийнэ.",
        ],
        items: [
          "QPay: захиалга баталгаажуулсны дараа гарах QR кодыг 15 минутын дотор төлнө. Хугацаандаа төлөөгүй бол захиалга автоматаар цуцлагдаж, нөөц чөлөөлөгдөнө.",
          "Банкны шилжүүлэг: гүйлгээний утга дээр захиалгын дугаараа заавал бичиж, 24 цагийн дотор шилжүүлнэ. Төлбөр орсныг бид банкаар шалгаж баталгаажуулна. 24 цагийн дотор шилжүүлээгүй бол захиалга автоматаар цуцлагдана.",
          "Цуцлагдсан захиалгад мөнгө шилжүүлсэн бол захиалгын дугаараа хэлж бидэнтэй холбогдоно уу; бид төлбөрийг шалгаж шийдвэрлэнэ.",
        ],
      },
      {
        heading: "Хүргэлт",
        paragraphs: [
          policy.delivery,
          "Захиалгын явцыг «Бүртгэл → Захиалгын түүх» хэсгээс харна. Төлөв өөрчлөгдөх бүрд бид танд имэйлээр мэдэгдэнэ (жинхэнэ имэйл хаяг өгсөн бол).",
        ],
      },
      { heading: "Буцаалт, солилт", paragraphs: [policy.returns] },
      {
        heading: "Аюулгүй хэрэглээ",
        paragraphs: [policy.safety, "Манай бүтээгдэхүүнүүд гоо сайхны арчилгааны зориулалттай. Эм биш бөгөөд ямар нэг өвчин эмгэг эмчилдэггүй."],
      },
      {
        heading: "Асуулт, гомдол",
        paragraphs: [`Захиалга, бүтээгдэхүүний талаар асуух зүйл, гомдол байвал ${contact} -аар холбогдоно уу. Сайтын чатаар бичиж болно.`],
      },
      {
        heading: "Нөхцөлийн өөрчлөлт",
        paragraphs: ["Бид эдгээр нөхцөлийг шинэчилж болно. Хамгийн сүүлийн хувилбар энэ хуудсанд байршина; захиалга хийх үед хүчинтэй байсан нөхцөл тухайн захиалгад үйлчилнэ."],
      },
    ],
  };
}

export function privacyDocument(localeInput: string): LegalDocument {
  const locale = loc(localeInput);
  const contact = contactLine(locale);

  if (locale === "en") {
    return {
      intro: `${STORE.name} uses your information only to fulfil your order and answer your questions. This page explains what we collect, who it is shared with and how to have it deleted.`,
      sections: [
        {
          heading: "What we collect",
          items: [
            "When you order: your name, phone number, delivery address (city or province, district, khoroo, street address), any note you add, the products you ordered and how you pay.",
            "When you sign in: your email address. If you use Google sign-in we receive your email and name from Google. \"Continue as guest\" asks for no personal details.",
            "In chat: the messages you send us in the website chat or on Facebook Messenger.",
            "Technical data: server logs such as your IP address, used to keep the site secure and to stop abuse.",
            "In your browser: we keep your sign-in and your cart in the browser's storage. We do not use advertising trackers or third-party analytics.",
          ],
        },
        {
          heading: "Why we use it",
          paragraphs: [
            "To record and deliver your order, confirm your payment, send you order updates, answer your questions and complaints, and protect the shop from fraud and misuse.",
            "We do not sell your information, and we do not give it to anyone for their own advertising.",
          ],
        },
        {
          heading: "Who it is shared with",
          paragraphs: ["Some services are needed to run the shop:"],
          items: [
            "QPay: to take your online payment (order amount and invoice number).",
            "Vercel (website hosting) and Neon (database, servers in the USA): your data is stored on their servers.",
            "Telegram and email: when an order arrives, the shop owner receives its details (name, phone, address, products). We email you about your order if you gave a real email address.",
            "Chat assistant: the messages you write in the chat are processed by an AI service (OpenAI) to prepare replies. Messages sent through Facebook Messenger also pass through Meta's platform. Please do not write card numbers, passwords or other secrets in the chat.",
            "Google: only if you choose Google sign-in.",
            "Authorities: only where the law requires it.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Order records are kept for as long as we need them for accounting and support. Guest accounts with no orders are deleted automatically after 30 days. Chat conversations are deleted on request.",
          ],
        },
        {
          heading: "Your choices",
          paragraphs: [
            "You can see and edit your details under Account → Personal details. To have your data deleted, see the \"Delete my data\" page or email us and we will remove it, keeping only what we are required to keep for accounting.",
          ],
        },
        {
          heading: "Security",
          paragraphs: ["Passwords are stored hashed, never in plain text. The site is served over HTTPS. Only the shop owner can sign in to the admin area."],
        },
        { heading: "Contact", paragraphs: [`Questions about your data: ${contact}.`] },
      ],
    };
  }

  return {
    intro: `${STORE.name} таны мэдээллийг зөвхөн захиалгыг биелүүлэх, асуултад хариулахад ашигладаг. Энэ хуудас ямар мэдээлэл цуглуулдаг, хэнтэй хуваалцдаг, хэрхэн устгуулах талаар тайлбарлана.`,
    sections: [
      {
        heading: "Ямар мэдээлэл цуглуулдаг вэ",
        items: [
          "Захиалга хийхэд: нэр, утасны дугаар, хүргэлтийн хаяг (хот/аймаг, дүүрэг/сум, хороо/баг, хаяг), нэмэлт тайлбар, захиалсан бүтээгдэхүүн, төлбөрийн хэлбэр.",
          "Нэвтрэхэд: имэйл хаяг. Google-ээр нэвтэрвэл Google-ээс таны имэйл болон нэрийг авна. «Зочноор нэвтрэх» сонголт хувийн мэдээлэл шаардахгүй.",
          "Чатад: сайтын чат болон Facebook Messenger-ээр бидэнд бичсэн мессеж.",
          "Техникийн мэдээлэл: сайтыг аюулгүй ажиллуулах, буруу ашиглалтаас хамгаалахад хэрэглэх IP хаяг зэрэг серверийн бүртгэл.",
          "Хөтөч дээр: таны нэвтрэлт болон сагсыг хөтчийн санах ойд хадгална. Бид сурталчилгааны трэкер болон гуравдагч талын аналитик ашигладаггүй.",
        ],
      },
      {
        heading: "Яагаад ашигладаг вэ",
        paragraphs: [
          "Захиалгыг бүртгэж хүргэх, төлбөрийг баталгаажуулах, захиалгын мэдэгдэл илгээх, асуулт гомдолд хариулах, залилан болон буруу ашиглалтаас дэлгүүрийг хамгаалахад ашиглана.",
          "Бид таны мэдээллийг зарж борлуулдаггүй, өөр хүний сурталчилгааны зорилгоор өгдөггүй.",
        ],
      },
      {
        heading: "Хэнтэй хуваалцдаг вэ",
        paragraphs: ["Дэлгүүрийг ажиллуулахад дараах үйлчилгээ шаардлагатай:"],
        items: [
          "QPay: онлайн төлбөр хүлээн авах (захиалгын дүн, нэхэмжлэлийн дугаар).",
          "Vercel (сайтын хостинг) болон Neon (өгөгдлийн сан, АНУ-ын серверүүд): таны мэдээлэл тэдний серверт хадгалагдана.",
          "Telegram болон имэйл: захиалга ирэхэд дэлгүүрийн эзэнд захиалгын мэдээлэл (нэр, утас, хаяг, бараа) очно. Жинхэнэ имэйл хаяг өгсөн бол танд захиалгын мэдэгдлийг имэйлээр илгээнэ.",
          "Чат туслах: чатад бичсэн мессежийг хариу боловсруулахын тулд AI үйлчилгээ (OpenAI) боловсруулна. Facebook Messenger-ээр бичсэн мессеж Meta-гийн платформоор дамжина. Чатад картын дугаар, нууц үг зэрэг нууц мэдээлэл бүү бичээрэй.",
          "Google: зөвхөн «Google-ээр нэвтрэх»-ийг сонгосон тохиолдолд.",
          "Эрх бүхий байгууллага: зөвхөн хуулиар шаардсан тохиолдолд.",
        ],
      },
      {
        heading: "Хэр удаан хадгалдаг вэ",
        paragraphs: [
          "Захиалгын бүртгэлийг нягтлан бодох бүртгэл болон дэмжлэгт шаардлагатай хугацаанд хадгална. Захиалгагүй зочны бүртгэл 30 хоногийн дараа автоматаар устна. Чатын харилцааг хүсвэл устгана.",
        ],
      },
      {
        heading: "Таны сонголт",
        paragraphs: [
          "Хувийн мэдээллээ «Бүртгэл → Хувийн мэдээлэл» хэсгээс харж, засна. Мэдээллээ устгуулахыг хүсвэл «Мэдээлэл устгах» хуудас дахь имэйл рүү бичнэ үү; нягтлан бодох бүртгэлд заавал хадгалах шаардлагатайгаас бусдыг нь устгана.",
        ],
      },
      {
        heading: "Аюулгүй байдал",
        paragraphs: ["Нууц үгийг шифрлэж (hash) хадгалдаг, ил бичдэггүй. Сайтад HTTPS холболтоор хандана. Админ хэсэгт зөвхөн дэлгүүрийн эзэн нэвтэрнэ."],
      },
      { heading: "Холбоо барих", paragraphs: [`Таны мэдээллийн талаар асуух зүйл байвал ${contact} -аар холбогдоно уу.`] },
    ],
  };
}
