/* ============================================
   ARTÉVA Maison — Legal pages

   Written against what this codebase actually does, not from a template. Every
   processor named here is one the site really talks to, and every retention
   period is one that is really enforced somewhere in the code — the 180-day
   visit log is the TTL index on the SiteVisit model, the 14-day refund window
   is REFUND_WINDOW_DAYS in utils/refundRequest.js.

   That accuracy is the point: a privacy policy that misdescribes the
   processing is worse than none, because it is a published statement the
   business can be held to.

   NOT LEGAL ADVICE. This is an accurate technical description for a lawyer or
   the owner to review and adopt. Kuwaiti consumer law and, if the shop ever
   ships into the EU, the GDPR both carry specifics that need a professional.
   ============================================ */

export const LEGAL_SLUGS = ['privacy', 'returns', 'terms', 'data-deletion'];

const CONTACT_EMAIL = 'artevamaison@gmail.com';

export const legalContent = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: 27 July 2026',
      sections: [
        {
          heading: 'Who we are',
          body: [
            `ARTÉVA Maison is a home décor retailer based in Kuwait City, Kuwait. This policy explains what we collect when you use artevamaisonkw.com, why, and who we share it with.`,
            `For any question about this policy or your data, write to ${CONTACT_EMAIL}.`,
          ],
        },
        {
          heading: 'What we collect',
          list: [
            'Account details you give us: name, email address, phone number and any delivery addresses you save.',
            'Order details: what you bought, the amount, the delivery address and the status of the order.',
            'Delivery location: if you pin a delivery point on the map at checkout, we store those coordinates so the driver can find you.',
            'Technical data: your IP address, browser, operating system, the pages you visit and the site that referred you.',
            'Stored in your own browser: your basket, wishlist, chosen currency and language, and your sign-in token. These stay on your device and are not sent to us except when you place an order.',
          ],
        },
        {
          heading: 'What we do not collect',
          body: [
            `We never see or store your card details. Payments are handled entirely by our payment providers, and your card number never reaches our servers.`,
          ],
        },
        {
          heading: 'Why we use it',
          list: [
            'To take, deliver and support your orders — the main reason any of it exists.',
            'To send you order updates by email and WhatsApp.',
            'To understand how the shop is used, so we can improve it.',
            'To measure and target our advertising on Facebook and Instagram.',
          ],
        },
        {
          heading: 'Advertising and the Meta pixel',
          body: [
            `This site uses the Meta pixel and the Meta Conversions API. When you view a product, add to your basket, begin checkout or complete an order, we report that action to Meta so our advertising can be measured and shown to people likely to be interested.`,
            `Some of this is sent from our own server rather than your browser. Where it includes your email address or phone number, those are irreversibly hashed before they leave us — Meta receives a fingerprint that lets them match an existing account, not the address itself.`,
            `We do not send Meta anything sensitive, and we do not send custom data fields.`,
            `You can limit this in your Facebook and Instagram ad settings, or by using your browser's tracking protection or an ad blocker — the site works normally either way.`,
          ],
        },
        {
          heading: 'Who else sees your data',
          body: ['We do not sell your data. We share it only with the services needed to run the shop:'],
          list: [
            'Payment providers (MyFatoorah, Deema) — to take payment. They receive your name, contact details and order amount.',
            'Meta Platforms — advertising measurement, as described above.',
            'Our email provider (Mailgun) — to send order confirmations and account emails.',
            'WhatsApp (Meta) — to send order notifications to the number you gave us.',
            'Cloudinary — image hosting. It sees no personal data.',
            'Our delivery drivers — your name, address, pinned location and phone number, so they can deliver.',
          ],
        },
        {
          heading: 'How long we keep it',
          list: [
            'Account and order records: for as long as your account exists, and afterwards where we are required to keep them for tax or accounting purposes.',
            'Website visit logs, including IP addresses: automatically deleted after 180 days.',
            'Data held in your own browser: until you clear it, or sign out.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            `You can ask us for a copy of the data we hold about you, ask us to correct it, or ask us to delete it. Write to ${CONTACT_EMAIL} and we will respond within 30 days.`,
            `Deleting your account removes your profile, saved addresses and wishlist. Order records are kept where we are legally required to keep them.`,
          ],
        },
        {
          heading: 'Children',
          body: [`This shop is not intended for children under 16, and we do not knowingly collect their data.`],
        },
        {
          heading: 'Changes',
          body: [`If we change this policy we will update the date at the top of this page.`],
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      updated: 'آخر تحديث: 27 يوليو 2026',
      sections: [
        {
          heading: 'من نحن',
          body: [
            'أرتيفا ميزون متجر للديكور المنزلي مقره مدينة الكويت، الكويت. توضح هذه السياسة ما نجمعه عند استخدامك للموقع، ولماذا، ومع من نشاركه.',
            `لأي استفسار بخصوص هذه السياسة أو بياناتك، راسلنا على ${CONTACT_EMAIL}.`,
          ],
        },
        {
          heading: 'ما الذي نجمعه',
          list: [
            'بيانات الحساب التي تزودنا بها: الاسم والبريد الإلكتروني ورقم الهاتف وعناوين التوصيل المحفوظة.',
            'تفاصيل الطلب: ما اشتريته، والمبلغ، وعنوان التوصيل، وحالة الطلب.',
            'موقع التوصيل: إذا حددت نقطة التوصيل على الخريطة، نحفظ الإحداثيات ليتمكن السائق من الوصول إليك.',
            'بيانات تقنية: عنوان IP، والمتصفح، ونظام التشغيل، والصفحات التي تزورها، والموقع الذي أحالك إلينا.',
            'محفوظ في متصفحك: سلة التسوق والمفضلة والعملة واللغة ورمز تسجيل الدخول. تبقى على جهازك ولا تُرسل إلينا إلا عند إتمام الطلب.',
          ],
        },
        {
          heading: 'ما لا نجمعه',
          body: ['لا نطّلع على بيانات بطاقتك ولا نحفظها. تتم المدفوعات بالكامل لدى مزودي الدفع، ولا يصل رقم بطاقتك إلى خوادمنا.'],
        },
        {
          heading: 'لماذا نستخدمها',
          list: [
            'لتنفيذ طلباتك وتوصيلها ودعمها.',
            'لإرسال تحديثات الطلب عبر البريد الإلكتروني وواتساب.',
            'لفهم كيفية استخدام المتجر وتحسينه.',
            'لقياس إعلاناتنا على فيسبوك وإنستغرام وتوجيهها.',
          ],
        },
        {
          heading: 'الإعلانات وبكسل ميتا',
          body: [
            'يستخدم هذا الموقع بكسل ميتا وواجهة التحويلات (Conversions API). عند عرض منتج أو إضافته إلى السلة أو بدء الدفع أو إتمام الطلب، نُبلغ ميتا بذلك لقياس إعلاناتنا.',
            'يُرسل جزء من ذلك من خادمنا لا من متصفحك. وعندما يتضمن بريدك الإلكتروني أو رقم هاتفك، يتم تشفيرهما تشفيراً غير قابل للعكس قبل مغادرتنا — تتلقى ميتا بصمة للمطابقة لا العنوان نفسه.',
            'لا نرسل إلى ميتا أي بيانات حساسة ولا أي حقول مخصصة.',
            'يمكنك الحد من ذلك من إعدادات الإعلانات لديك، أو عبر حماية التتبع في متصفحك — ويعمل الموقع بشكل طبيعي في الحالتين.',
          ],
        },
        {
          heading: 'من يطّلع على بياناتك',
          body: ['لا نبيع بياناتك. نشاركها فقط مع الخدمات اللازمة لتشغيل المتجر:'],
          list: [
            'مزودو الدفع (ماي فاتورة، ديما) — لتحصيل المبلغ.',
            'منصات ميتا — لقياس الإعلانات كما هو موضح أعلاه.',
            'مزود البريد الإلكتروني (Mailgun) — لإرسال تأكيدات الطلبات.',
            'واتساب (ميتا) — لإرسال إشعارات الطلب إلى رقمك.',
            'Cloudinary — استضافة الصور. لا يطّلع على بيانات شخصية.',
            'سائقو التوصيل — الاسم والعنوان والموقع والهاتف لإتمام التوصيل.',
          ],
        },
        {
          heading: 'مدة الاحتفاظ',
          list: [
            'سجلات الحساب والطلبات: طوال وجود حسابك، وبعده حيثما يلزمنا القانون بالاحتفاظ بها.',
            'سجلات زيارة الموقع، بما فيها عناوين IP: تُحذف تلقائياً بعد 180 يوماً.',
            'البيانات المحفوظة في متصفحك: حتى تمسحها أو تسجّل الخروج.',
          ],
        },
        {
          heading: 'حقوقك',
          body: [
            `يمكنك طلب نسخة من بياناتك أو تصحيحها أو حذفها. راسلنا على ${CONTACT_EMAIL} وسنرد خلال 30 يوماً.`,
            'حذف حسابك يزيل ملفك الشخصي والعناوين المحفوظة والمفضلة. تُحفظ سجلات الطلبات حيثما يلزمنا القانون.',
          ],
        },
        {
          heading: 'الأطفال',
          body: ['هذا المتجر غير موجّه لمن هم دون 16 عاماً، ولا نجمع بياناتهم عن قصد.'],
        },
        {
          heading: 'التغييرات',
          body: ['عند تعديل هذه السياسة سنحدّث التاريخ أعلى الصفحة.'],
        },
      ],
    },
  },

  'data-deletion': {
    en: {
      title: 'Deleting Your Data',
      updated: 'Last updated: 27 July 2026',
      sections: [
        {
          heading: 'Deleting your account and data',
          body: [
            `You can ask us to delete your account and the personal data attached to it at any time. There are two ways.`,
          ],
        },
        {
          heading: 'By email',
          body: [
            `Send a message to ${CONTACT_EMAIL} from the email address on your account, with the subject "Delete my data". We will confirm and complete the deletion within 30 days.`,
          ],
        },
        {
          heading: 'By WhatsApp',
          body: [
            `Message us on the WhatsApp number in the footer of the site and ask for your data to be deleted. We will ask you to confirm the email address on the account before acting.`,
          ],
        },
        {
          heading: 'If you signed in with Facebook',
          body: [
            `You can also remove ARTÉVA Maison from your Facebook settings: Settings & Privacy → Settings → Apps and Websites → ARTÉVA Maison → Remove. That disconnects the login. To delete the data we hold as well, use one of the methods above.`,
          ],
        },
        {
          heading: 'What gets deleted',
          list: [
            'Your profile: name, email, phone number.',
            'Saved delivery addresses and pinned map locations.',
            'Your wishlist and any saved basket.',
            'Your Facebook connection, if you used one.',
          ],
        },
        {
          heading: 'What we have to keep',
          body: [
            `Records of completed orders are kept where tax and accounting law requires it. These are financial records rather than a profile, and they are not used for advertising or contact after your account is deleted.`,
          ],
        },
      ],
    },
    ar: {
      title: 'حذف بياناتك',
      updated: 'آخر تحديث: 27 يوليو 2026',
      sections: [
        {
          heading: 'حذف حسابك وبياناتك',
          body: ['يمكنك طلب حذف حسابك والبيانات الشخصية المرتبطة به في أي وقت، بإحدى طريقتين.'],
        },
        {
          heading: 'عبر البريد الإلكتروني',
          body: [`أرسل رسالة إلى ${CONTACT_EMAIL} من البريد المسجل في حسابك بعنوان "حذف بياناتي". سنؤكد وننفّذ الحذف خلال 30 يوماً.`],
        },
        {
          heading: 'عبر واتساب',
          body: ['راسلنا على رقم واتساب الظاهر أسفل الموقع واطلب حذف بياناتك. سنطلب منك تأكيد البريد الإلكتروني المسجل قبل التنفيذ.'],
        },
        {
          heading: 'إذا سجّلت الدخول عبر فيسبوك',
          body: ['يمكنك أيضاً إزالة أرتيفا ميزون من إعدادات فيسبوك: الإعدادات والخصوصية ← الإعدادات ← التطبيقات والمواقع ← أرتيفا ميزون ← إزالة. هذا يفصل تسجيل الدخول. ولحذف البيانات لدينا أيضاً، استخدم إحدى الطريقتين أعلاه.'],
        },
        {
          heading: 'ما الذي يُحذف',
          list: [
            'ملفك الشخصي: الاسم والبريد ورقم الهاتف.',
            'عناوين التوصيل المحفوظة والمواقع المحددة على الخريطة.',
            'المفضلة وسلة التسوق المحفوظة.',
            'ارتباط حساب فيسبوك إن وُجد.',
          ],
        },
        {
          heading: 'ما يلزمنا الاحتفاظ به',
          body: ['تُحفظ سجلات الطلبات المكتملة حيثما تقتضي القوانين الضريبية والمحاسبية. هذه سجلات مالية وليست ملفاً شخصياً، ولا تُستخدم للإعلان أو التواصل بعد حذف حسابك.'],
        },
      ],
    },
  },

  returns: {
    en: {
      title: 'Returns & Refunds',
      updated: 'Last updated: 27 July 2026',
      sections: [
        {
          heading: 'The short version',
          body: [
            `You have 14 days from delivery to request a return. Items must be unused and in their original packaging. Contact us on WhatsApp and we will arrange it.`,
          ],
        },
        {
          heading: 'How to request a return',
          body: [
            `Open your order under "My Orders" and press "Request refund". That opens a WhatsApp conversation with your order details already filled in. You can also message the number in the footer directly.`,
            `The button appears on delivered orders for 14 days after delivery.`,
          ],
        },
        {
          heading: 'Condition of returned items',
          list: [
            'Items must be unused, undamaged and in their original packaging.',
            'Glassware and fragile pieces must be repacked in the protective material they arrived in.',
            'We may decline a return if an item arrives back damaged through poor repacking.',
          ],
        },
        {
          heading: 'Damaged or wrong items',
          body: [
            `If something arrives broken or is not what you ordered, contact us within 48 hours of delivery with a photograph. We will replace it or refund it in full, including delivery, and we will arrange collection at our cost.`,
          ],
        },
        {
          heading: 'Refunds',
          body: [
            `Once we receive and check the item, the refund is issued to the original payment method. Card and KNET refunds usually appear within 7 to 14 working days, depending on your bank.`,
            `Delivery charges are refunded only where the item was faulty, damaged or sent in error.`,
          ],
        },
        {
          heading: 'Cancelling an order',
          body: [
            `An order can be cancelled before it is handed to the driver — use "Cancel order" on the order page. After that, treat it as a return.`,
          ],
        },
        {
          heading: 'Questions',
          body: [`Message us on WhatsApp or write to ${CONTACT_EMAIL}.`],
        },
      ],
    },
    ar: {
      title: 'الإرجاع والاسترداد',
      updated: 'آخر تحديث: 27 يوليو 2026',
      sections: [
        {
          heading: 'باختصار',
          body: ['لديك 14 يوماً من تاريخ الاستلام لطلب الإرجاع. يجب أن تكون القطع غير مستخدمة وبعبوتها الأصلية. راسلنا على واتساب وسنرتب ذلك.'],
        },
        {
          heading: 'كيفية طلب الإرجاع',
          body: [
            'افتح طلبك من "طلباتي" واضغط "طلب استرجاع". سيفتح ذلك محادثة واتساب مع تفاصيل طلبك جاهزة. ويمكنك أيضاً مراسلة الرقم أسفل الموقع مباشرة.',
            'يظهر الزر على الطلبات المسلّمة لمدة 14 يوماً بعد التسليم.',
          ],
        },
        {
          heading: 'حالة القطع المرتجعة',
          list: [
            'يجب أن تكون غير مستخدمة وغير تالفة وبعبوتها الأصلية.',
            'تُعاد القطع الزجاجية والقابلة للكسر بنفس مواد الحماية التي وصلت بها.',
            'قد نرفض الإرجاع إذا وصلت القطعة تالفة بسبب سوء التغليف.',
          ],
        },
        {
          heading: 'القطع التالفة أو الخاطئة',
          body: ['إذا وصلت القطعة مكسورة أو مختلفة عمّا طلبت، راسلنا خلال 48 ساعة من الاستلام مع صورة. سنستبدلها أو نعيد المبلغ كاملاً شاملاً التوصيل، وسنرتب الاستلام على حسابنا.'],
        },
        {
          heading: 'استرداد المبالغ',
          body: [
            'بعد استلام القطعة وفحصها، يُعاد المبلغ إلى وسيلة الدفع الأصلية. تستغرق مبالغ البطاقات وكي‑نت عادة من 7 إلى 14 يوم عمل حسب بنكك.',
            'تُعاد رسوم التوصيل فقط إذا كانت القطعة معيبة أو تالفة أو أُرسلت بالخطأ.',
          ],
        },
        {
          heading: 'إلغاء الطلب',
          body: ['يمكن إلغاء الطلب قبل تسليمه للسائق من صفحة الطلب. بعد ذلك يُعامل كإرجاع.'],
        },
        {
          heading: 'استفسارات',
          body: [`راسلنا على واتساب أو على ${CONTACT_EMAIL}.`],
        },
      ],
    },
  },

  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last updated: 27 July 2026',
      sections: [
        {
          heading: 'Agreement',
          body: [`By using artevamaisonkw.com or placing an order, you agree to these terms. ARTÉVA Maison is a home décor retailer based in Kuwait City, Kuwait.`],
        },
        {
          heading: 'Orders',
          body: [
            `An order is an offer to buy. It becomes a contract when we confirm it. We may decline an order — for example if an item is out of stock, a price was listed in error, or we cannot deliver to the address given.`,
            `Prices are shown in Kuwaiti Dinar. Other currencies shown on the site are a conversion for guidance; the amount charged is in KWD.`,
          ],
        },
        {
          heading: 'Products',
          body: [`Our pieces are handcrafted, so colour, finish and dimensions vary slightly from one to the next. Photographs are as accurate as we can make them, but screens differ and small variation is a property of the craft rather than a fault.`],
        },
        {
          heading: 'Payment',
          body: [`Payment is taken through our payment providers at checkout. We never receive or store your card details. Your order is processed once payment is confirmed.`],
        },
        {
          heading: 'Delivery',
          body: [`We deliver within Kuwait. Delivery times given at checkout are estimates. Risk in the goods passes to you on delivery.`],
        },
        {
          heading: 'Returns',
          body: [`Returns and refunds are covered by our Returns & Refunds policy, which forms part of these terms.`],
        },
        {
          heading: 'Your account',
          body: [`You are responsible for keeping your sign-in details private and for activity on your account. Tell us promptly if you believe someone else has used it.`],
        },
        {
          heading: 'Acceptable use',
          body: [`Do not attempt to interfere with the site, access other customers' data, or use it for anything unlawful.`],
        },
        {
          heading: 'Our content',
          body: [`The photographs, text, designs and branding on this site belong to ARTÉVA Maison and may not be reproduced commercially without our written permission.`],
        },
        {
          heading: 'Liability',
          body: [`We are responsible for delivering what you ordered in the condition described. Nothing in these terms limits liability that cannot be limited under the law of Kuwait.`],
        },
        {
          heading: 'Governing law',
          body: [`These terms are governed by the law of the State of Kuwait.`],
        },
        {
          heading: 'Contact',
          body: [`${CONTACT_EMAIL}, or the WhatsApp number in the footer.`],
        },
      ],
    },
    ar: {
      title: 'شروط الخدمة',
      updated: 'آخر تحديث: 27 يوليو 2026',
      sections: [
        {
          heading: 'الاتفاق',
          body: ['باستخدامك الموقع أو بإتمام طلب، فإنك توافق على هذه الشروط. أرتيفا ميزون متجر للديكور المنزلي مقره مدينة الكويت.'],
        },
        {
          heading: 'الطلبات',
          body: [
            'الطلب عرض بالشراء يصبح عقداً عند تأكيدنا له. ويجوز لنا رفض الطلب — مثلاً عند نفاد الكمية أو خطأ في السعر أو تعذّر التوصيل للعنوان.',
            'الأسعار بالدينار الكويتي. والعملات الأخرى المعروضة تحويل استرشادي، والمبلغ المحصّل بالدينار.',
          ],
        },
        {
          heading: 'المنتجات',
          body: ['قطعنا مصنوعة يدوياً، لذا يختلف اللون والتشطيب والأبعاد اختلافاً طفيفاً بين قطعة وأخرى. والصور دقيقة قدر الإمكان، لكن الشاشات تتفاوت، وهذا التباين البسيط من طبيعة الصناعة اليدوية وليس عيباً.'],
        },
        {
          heading: 'الدفع',
          body: ['يتم الدفع عبر مزودي الدفع لدينا. لا نتلقى بيانات بطاقتك ولا نحفظها. ويُجهّز طلبك بعد تأكيد الدفع.'],
        },
        {
          heading: 'التوصيل',
          body: ['نوصل داخل الكويت. ومدد التوصيل المذكورة تقديرية. وتنتقل تبعة البضاعة إليك عند التسليم.'],
        },
        {
          heading: 'الإرجاع',
          body: ['يحكم الإرجاع والاسترداد سياسة الإرجاع والاسترداد، وهي جزء من هذه الشروط.'],
        },
        {
          heading: 'حسابك',
          body: ['أنت مسؤول عن سرية بيانات دخولك وعن النشاط على حسابك. أبلغنا فوراً إذا اعتقدت أن شخصاً آخر استخدمه.'],
        },
        {
          heading: 'الاستخدام المقبول',
          body: ['لا تحاول العبث بالموقع أو الوصول إلى بيانات عملاء آخرين أو استخدامه لأي غرض غير مشروع.'],
        },
        {
          heading: 'المحتوى',
          body: ['الصور والنصوص والتصاميم والعلامة التجارية على هذا الموقع ملك لأرتيفا ميزون ولا يجوز استنساخها تجارياً دون إذن كتابي.'],
        },
        {
          heading: 'المسؤولية',
          body: ['نحن مسؤولون عن تسليم ما طلبته بالحالة الموصوفة. ولا يحدّ أي بند هنا من مسؤولية لا يجوز تحديدها بموجب القانون الكويتي.'],
        },
        {
          heading: 'القانون الواجب التطبيق',
          body: ['تخضع هذه الشروط لقانون دولة الكويت.'],
        },
        {
          heading: 'التواصل',
          body: [`${CONTACT_EMAIL}، أو رقم واتساب أسفل الموقع.`],
        },
      ],
    },
  },
};
