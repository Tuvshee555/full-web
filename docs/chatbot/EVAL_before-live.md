# Chatbot evaluation: before-live

Mode: live (gpt-4.1). 62 conversations, 74 customer turns. Generated 2026-11-01 11:47 UTC.

| Measure | Result |
| --- | --- |
| Turns passing every check | 50/74 (67.6%) |
| Turns passing the hard rules (reply, no invented amount, language, privacy, no promise, confirmed orders only) | 73/74 (98.6%) |
| Conversations fully correct | 41/62 |
| Average engine time per turn | 762 ms |
| Model calls | 70 (803 ms each on average) |

## By category

| Category | Turns | Passed | Hard rules ok |
| --- | --- | --- | --- |
| pricing | 14 | 13 (93%) | 14 |
| availability | 10 | 8 (80%) | 10 |
| usage | 10 | 9 (90%) | 10 |
| purchase | 16 | 4 (25%) | 16 |
| latin | 11 | 10 (91%) | 11 |
| unknown | 7 | 4 (57%) | 6 |
| contradictory | 6 | 2 (33%) | 6 |

## Every turn

| Conversation | Customer | Reply | Result | Why |
| --- | --- | --- | --- | --- |
| price-01-named-product | Хөмсөгний сэрум үнэ хэд вэ? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-02-latin-named | test homsognii serum une hed ve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-03-keyword-serum | сэрумын үнэ хэд вэ | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-04-cheapest | Хамгийн хямд нь юу вэ? | Хамгийн хямд нь:<br>Налуу сойз — 15,000₮<br>https://shop.example.invalid/mn/products/ev-brush | PASS |  |
| price-05-set-discount | Хөмсөгний багц хямдралтай юу? | Хөмсөгний багц — 95,000₮ (үндсэн үнэ 110,000₮)<br>https://shop.example.invalid/mn/products/ev-set<br>Дээрх үнэд бүтээгдэхүүний идэвхтэй хямдрал орсон.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-06-after-list | Ямар бүтээгдэхүүн байгаа вэ? | Хөмсөгний арчилгаа, харандаа, гель, помад, тос зэрэг хэд хэдэн төрлийн бүтээгдэхүүн байна. Эхний гурван сонголтыг танилцуулж байна:<br><br>Хөмсөгний сэрум — 61,000₮<br>Өдөр тутмын арчилгаанд зориулагдсан сэрум.<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Нарийн хөмсөгний харандаа — 23,000₮<br>Нарийн үзүүртэй, сойзтой харандаа.<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>Тунгалаг хөмсөгний гель — 31,000₮<br>Хөмсөгийг хэлбэрт нь тогтоох гель.<br>https://shop.example.invalid/mn/products/ev-gel<br><br>Өөр бүтээгдэхүүн сонирхож байвал хэлээрэй, илүү олон сонголт бий. | FAIL | missing /1\)/ |
| price-06-after-list | эхнийх нь хэд вэ | Аль бүтээгдэхүүнийг сонирхож байна вэ?<br><br>1) Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>2) Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>3) Тунгалаг хөмсөгний гель — 31,000₮<br>https://shop.example.invalid/mn/products/ev-gel | PASS |  |
| price-07-english | How much is Хөмсөгний сэрум? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/en/products/ev-serum<br><br>You can add it to your cart from the product page. | PASS |  |
| price-08-latin-followup | Хөмсөгний сэрум байгаа юу | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>5 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-08-latin-followup | une ni hed ve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-09-two-products | харандаа хэд вэ | Аль бүтээгдэхүүнийг сонирхож байна вэ?<br><br>1) Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>2) Модон хөмсөгний харандаа — 18,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-b | PASS |  |
| price-10-glued-latin | serum unehedve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| price-11-generic-latin-typo | tanai buteegdhuni une hedwe | Манай бүтээгдэхүүний үнэ:<br><br>Хөмсөгний сэрум — 61,000₮<br>Өдөр тутмын арчилгаанд зориулсан сэрум.<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Нарийн хөмсөгний харандаа — 23,000₮<br>Нарийн үзүүртэй, сойзтой харандаа.<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>Модон хөмсөгний харандаа — 18,000₮<br>Ирлэх боломжтой модон харандаа.<br>https://shop.example.invalid/mn/products/ev-pencil-b<br><br>Бусад бүтээгдэхүүний үнийг сонирхож байвал хэлээрэй. | PASS |  |
| price-12-oil | тос хэдэн төгрөг вэ | Хөмсөгний тос — 41,000₮<br>https://shop.example.invalid/mn/products/ev-oil<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| stock-01-serum-available | Хөмсөгний сэрум одоо бэлэн байгаа юу? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>5 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| stock-02-latin | serum odoo bga yu | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | FAIL | missing /захиалах боломжтой\|бэлэн/ |
| stock-03-soldout-shade | Нарийн хөмсөгний харандаа хүрэн байгаа юу | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Хүрэн — Дууссан<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| stock-04-low-shade | Нарийн хөмсөгний харандаа цайвар хүрэн байна уу | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Цайвар хүрэн — Дуусаж байна<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| stock-05-untracked-shade | Нарийн хөмсөгний харандаа хар хүрэн байна уу | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Хүрэн — Дууссан<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | FAIL | missing /Хар хүрэн — захиалах боломжтой/ |
| stock-06-shade-across-pencils | хүрэн харандаа байна уу | Аль бүтээгдэхүүнийг сонирхож байна вэ?<br><br>1) Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Хүрэн — Дууссан<br><br>2) Модон хөмсөгний харандаа — 18,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-b<br>Хүрэн — захиалах боломжтой | PASS |  |
| stock-07-duussan-uu | Тунгалаг хөмсөгний гель дууссан уу? | Тунгалаг хөмсөгний гель — 31,000₮<br>https://shop.example.invalid/mn/products/ev-gel<br>Захиалах боломжтой.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| stock-08-english | Is Нарийн хөмсөгний харандаа in stock? | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/en/products/ev-pencil-a<br>Цайвар хүрэн — Almost gone<br>Хүрэн — Sold out<br>Хар хүрэн — available to order<br><br>You can add it to your cart from the product page. | PASS |  |
| stock-09-colours-question | харандаа ямар өнгөтэй байгаа | Аль бүтээгдэхүүнийг сонирхож байна вэ?<br><br>1) Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Цайвар хүрэн — Дуусаж байна<br>Хүрэн — Дууссан<br>Хар хүрэн<br><br>2) Модон хөмсөгний харандаа — 18,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-b<br>Цайвар хүрэн<br>Хүрэн<br>Хар хүрэн | PASS |  |
| stock-10-latin-duussan | serum duussan uu | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>5 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-01-mn | Хөмсөгний сэрум яаж хэрэглэх вэ? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-02-latin | serumaa yaj heregleh ve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-03-frequency | сэрумыг өдөрт хэдэн удаа хэрэглэх вэ? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-04-duration-faq | сэрумыг хэдий хугацаанд хэрэглэх вэ? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | FAIL | missing /8 долоо хоног/ |
| usage-05-missing-honest | Тунгалаг хөмсөгний гель яаж хэрэглэх вэ? | Тунгалаг хөмсөгний гель — 31,000₮<br>https://shop.example.invalid/mn/products/ev-gel<br>Хэрэглэх зааврыг бүтээгдэхүүний хуудсаас үзнэ үү. Нэмэлт мэдээллийг ажилтнаас тодруулж болно.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-06-followup-en | Do you have Хөмсөгний сэрум? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/en/products/ev-serum<br><br>You can add it to your cart from the product page. | PASS |  |
| usage-06-followup-en | how do I use it? | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/en/products/ev-serum<br>See the product page for the published instructions. Our team can help with further details.<br><br>You can add it to your cart from the product page. | PASS |  |
| usage-07-button | Нарийн хөмсөгний харандаа үнэ хэд вэ | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-07-button | Хэрэглэх заавар | Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br>Хэрэглэх заавар:<br>• Үс шиг нарийн зураасаар хоосон хэсгийг нөхнө.<br>• Сойзоор зөөлөн самнана.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| usage-08-apply-word | сэрум түрхэх арга хэлээч | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| buy-01-how-to-order | Яаж захиалах вэ? | Картаар төлөх боломжгүй. Зөвхөн QPay эсвэл банкны шилжүүлгээр төлнө. Бүтээгдэхүүнээ сагсанд нэмээд захиалгаа баталгаажуулна.<br>https://shop.example.invalid/mn/cart<br>https://shop.example.invalid/mn/checkout | PASS |  |
| buy-02-latin-how | yaj zahialah ve | Картаар төлөх боломжгүй. Зөвхөн QPay эсвэл банкны шилжүүлгээр төлнө. Бүтээгдэхүүнээ сагсанд нэмээд захиалгаа баталгаажуулна.<br>https://shop.example.invalid/mn/cart<br>https://shop.example.invalid/mn/checkout | PASS |  |
| buy-03-take-one-after-focus | Хөмсөгний сэрум үнэ хэд вэ | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| buy-03-take-one-after-focus | Нэгийг авъя. | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing //buy/ev-serum/; missing /61,000₮/; forbidden /захиалгын дугаар болон/ |
| buy-04-latin-avya | serum avya | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | FAIL | missing //buy/ev-serum/ |
| buy-05-hudaldaj-avya | odo hudaldaj away | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /аль\|сонго\|1\)\|/buy//; forbidden /захиалгын дугаар болон/ |
| buy-06-no-product | захиалга өгье | Картаар төлөх боломжгүй. Зөвхөн QPay эсвэл банкны шилжүүлгээр төлнө. Бүтээгдэхүүнээ сагсанд нэмээд захиалгаа баталгаажуулна.<br>https://shop.example.invalid/mn/cart<br>https://shop.example.invalid/mn/checkout | FAIL | missing /Аль\|1\)/ |
| buy-06-no-product | 1 | Ямар бүтээгдэхүүн захиалахыг хүсэж байна вэ? Манай дэлгүүр зөвхөн хөмсөгний бүтээгдэхүүнүүд зардаг. Танд туслах бүтээгдэхүүнээ сонгоход туслах уу? | FAIL | missing //buy// |
| buy-07-quantity | сэрум 2 ширхэг авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /qty=2\|2 ширхэг\|× 2\|x 2/ |
| buy-08-en | I want to buy Хөмсөгний сэрум | Please provide your order number and the phone number registered on that order. | FAIL | missing //buy/ev-serum/ |
| buy-09-en-order-it | Tell me about Хөмсөгний тос | Хөмсөгний тос — 41,000₮<br>This is a plant-based oil that nourishes eyebrows.<br>https://shop.example.invalid/en/products/ev-oil | PASS |  |
| buy-09-en-order-it | order it | Please provide your order number and the phone number registered on that order. | FAIL | missing //buy/ev-oil/ |
| buy-10-soldout-shade-refused | Нарийн хөмсөгний харандаа хүрэн өнгийг авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /Дууссан/ |
| buy-11-shade-needed | Модон хөмсөгний харандаа авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /Цайвар хүрэн/; missing /Хар хүрэн/ |
| buy-11-shade-needed | хар хүрэн | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing //buy/ev-pencil-b/ |
| buy-12-zahialya-latin | serum zahialya | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing //buy/ev-serum/ |
| latin-01-greeting | sain uu | Сайн байна уу! Тест дэлгүүрийн бүтээгдэхүүн, хүргэлт, захиалгын талаар асуугаарай. | PASS |  |
| latin-02-serum-bga-yu | homsognii serum bgaa yu | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>5 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| latin-03-une-ni | homsognii serum bgaa yu | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>5 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| latin-03-une-ni | une ni hed ve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| latin-04-hurgelt | hurgelt hed ve | Хүргэлтийн төлбөр: 7,000₮.<br>Тест: Улаанбаатарт 1–2 ажлын өдөр, орон нутагт 2–5 ажлын өдөрт хүрнэ. | PASS |  |
| latin-05-zaavar | serum heregleh zaavar | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br>Хэрэглэх заавар:<br>• Орой цэвэр, хуурай хөмсөгт үсний ургалтын дагуу нимгэн түрхэнэ.<br>• Өдөрт нэг удаа хэрэглэнэ.<br>• Нүдэнд хүргэхгүй байна уу.<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| latin-06-ur-dun | hezee ur dun garah ve | Эдгээр нь гоо сайхны бүтээгдэхүүн тул тодорхой хугацаанд үр дүн амлах боломжгүй. Хэрвээ та шинэ бүтээгдэхүүн туршиж байгаа бол эхлээд жижиг хэсэгт туршиж үзэхийг зөвлөж байна. Хөмсөгний бүтээгдэхүүн, үнэ, хүргэлтийн талаар туслах уу? | FAIL | missing /батл\|батал\|ажилт\|эмч/ |
| latin-07-dans | dansnii dugaar uguh uu | Банкны шилжүүлэг:<br>Тест банк<br>Тест дэлгүүр<br>0000000000<br>Гүйлгээний утгад захиалгын дугаараа бичнэ үү. | PASS |  |
| latin-08-huntei | huntei holbogdmoor baina | Таны хүсэлтийг ажилтанд хадгаллаа. Нэр, холбогдох утсаа үлдээнэ үү. | PASS |  |
| latin-09-mixed | serum price hed ve | Хөмсөгний сэрум — 61,000₮<br>https://shop.example.invalid/mn/products/ev-serum<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| latin-10-odo-belen | tos odo belen bn uu | Хөмсөгний тос — 41,000₮<br>https://shop.example.invalid/mn/products/ev-oil<br>10 мл — захиалах боломжтой<br><br>Захиалах бол бүтээгдэхүүний хуудаснаас сагсандаа нэмээрэй. | PASS |  |
| unk-01-weather | Маргааш цаг агаар ямар байх вэ? | Уучлаарай, би зөвхөн хөмсөгний бүтээгдэхүүн, үнэ, хүргэлт, захиалгатай холбоотой мэдээлэл өгөх боломжтой. Танд ямар бүтээгдэхүүн хэрэгтэй вэ? | PASS |  |
| unk-02-who-made-you | Чамайг хэн хийсэн бэ | Тест дэлгүүрийн тухай мэдээлэл. | FAIL | missing /туслах\|бүтээгдэхүүн/ |
| unk-03-face-cream | нүүрний тос байгаа юу | Уучлаарай, бид зөвхөн хөмсөгний бүтээгдэхүүн зардаг. Хөмсөгний тос, сэрум, харандаа, гель зэрэг бүтээгдэхүүнүүдээс сонгох боломжтой. Хэрэв хөмсөгний арчилгааны бүтээгдэхүүн сонирхож байвал мэдээлэл өгөхөд баяртай байна. | PASS |  |
| unk-04-shampoo-en | Do you sell shampoo? | We don't sell shampoo. Our shop offers only eyebrow products like pencils, gels, serums, and care oils. Let me know if you need information about any of these. | PASS |  |
| unk-05-about | Та нар хэн бэ? | Тест дэлгүүрийн тухай мэдээлэл. | PASS |  |
| unk-06-contact | Холбоо барих утас хэд вэ | 00000000 · test@example.invalid | FAIL | no Cyrillic in Mongolian reply |
| unk-07-shop-faq | Ажлын цаг хэд вэ? | Тест дэлгүүрийн тухай мэдээлэл. | FAIL | missing /10:00–18:00/ |
| contra-01-switch-product | Хөмсөгний сэрум авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing //buy/ev-serum/ |
| contra-01-switch-product | үгүй, харандаа авъя | Аль бүтээгдэхүүнийг сонирхож байна вэ?<br><br>1) Нарийн хөмсөгний харандаа — 23,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-a<br><br>2) Модон хөмсөгний харандаа — 18,000₮<br>https://shop.example.invalid/mn/products/ev-pencil-b | PASS |  |
| contra-02-switch-shade | Модон хөмсөгний харандаа хар хүрэн авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing //buy/ev-pencil-b/ |
| contra-02-switch-shade | биш, цайвар хүрэн нь | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /Цайвар хүрэн/ |
| contra-03-switch-qty | сэрум 2 ширхэг авъя | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | PASS |  |
| contra-03-switch-qty | биш 3 ширхэг | Захиалгын дугаар болон тухайн захиалгад бүртгэсэн утасны дугаараа хамт бичнэ үү. | FAIL | missing /qty=3\|3 ширхэг/ |
