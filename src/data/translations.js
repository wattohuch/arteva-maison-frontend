/**
 * ARTEVA Maison — Translations
 * Direct port of the full i18n.js translations object.
 * Both English and Arabic dictionaries preserved exactly.
 */
export const translations = {
  en: {
    // Navigation
    home: "Home", categories: "Categories", new_arrivals: "New Arrivals",
    crystals: "Crystals", lighting: "Lighting", vases_bowls: "Vases & Bowls",
    vases: "Vases", bowls: "Bowls", plates: "Plates", view_all: "View All",
    collections: "Collections", contact: "Contact", contact_us: "Contact Us",
    account: "Account", my_account: "My Account",
    search_placeholder: "Search for products...",

    // Hero
    hero_subtitle: "Luxury Collection",
    hero_title: "Artisan Crafted<br>Home Décor",
    hero_desc: "Discover our exquisite collection of handcrafted glassware, decorative pieces, and luxury home accessories.",
    shop_collection: "Shop Collection", explore: "Explore",
    admin_hero_slides: "Hero Slides", admin_browse_collections: "Browse Collections",

    // Featured Collections
    featured_collections_title: "Featured Collections",
    featured_collections_subtitle: "Explore our curated selections",
    collection_crystal: "Crystal Collection", collection_vases: "Decorative Vases",
    collection_bowls: "Artisan Bowls", collection_plates: "Decorative Plates",
    view_all_products: "View All Products",

    // Categories
    category_new: "New", category_outlet: "Outlet", glassware: "Glassware",
    category_glassware: "Glassware", category_lighting: "Lighting",
    category_serveware: "Serveware", category_decor: "Décor",
    category_candles: "Candle Holders",

    // Contact Form Options
    general_inquiry: "General Inquiry", order_status_inquiry: "Order Status",
    product_question: "Product Question", returns_inquiry: "Returns",

    // Products
    new_arrivals_title: "New Arrivals",
    new_arrivals_subtitle: "Discover our latest additions",
    badge_new: "New", add_to_cart: "Add to Cart", currency: "KWD",

    // Currency Names
    currency_kwd: "Kuwaiti Dinar", currency_sar: "Saudi Riyal",
    currency_aed: "UAE Dirham", currency_qar: "Qatari Riyal",
    currency_bhd: "Bahraini Dinar", currency_omr: "Omani Rial",
    currency_usd: "US Dollar",

    // Collection Pages
    all_collections: "All Collections",
    browse_collections: "Browse our curated collections of luxury home décor",
    filter: "Filters", sort_featured: "Featured",
    sort_price_low: "Price: Low to High", sort_price_high: "Price: High to Low",
    sort_newest: "Newest", sort_name: "Name: A-Z",
    products_count: "products", no_products: "No products found in this category.",
    browse_all: "Browse All Collections",
    added_wishlist: "Added to wishlist", removed_wishlist: "Removed from wishlist",

    // Cart & Checkout
    shopping_cart: "Shopping Cart", product: "Product", price: "Price",
    quantity: "Quantity", total: "Total", continue_shopping: "Continue Shopping",
    clear_cart: "Clear Cart", order_summary: "Order Summary", subtotal: "Subtotal",
    shipping: "Shipping", free: "Free",
    taxes_shipping_note: "Taxes and shipping calculated at checkout",
    proceed_to_checkout: "Proceed to Checkout", we_accept: "We accept",
    checkout: "Checkout", shipping_address: "Shipping Address",
    street_address: "Street Address *", city: "City *", state_area: "State/Area",
    // No asterisk baked into the label — every caller marks required itself,
    // which was rendering "Phone Number **" on the address form.
    country: "Country", postal_code: "Postal Code", phone_number: "Phone Number",
    use_current_location: "Use Current Location",
    drag_pin_hint: "Drag the pin to your exact delivery location.",
    saved_addresses: "Saved Addresses", payment_method: "Payment Method",
    credit_card: "Credit / Debit Card", secure_payment: "Secure online payment",
    knet: "KNET", knet_desc: "Kuwait local payment",
    cod: "Cash on Delivery", cod_desc: "Pay when you receive",
    order_notes: "Order Notes (Optional)", place_order: "Place Order",
    secure_checkout: "Secure checkout with encrypted payment",

    // Alerts
    confirm_clear_cart: "Are you sure you want to clear your cart?",
    cart_cleared: "Cart cleared", cart_empty_error: "Your cart is empty",
    added_to_cart: "Added to cart", removed_from_cart: "Removed from cart",
    remove: "Remove", processing: "Processing...",
    select_payment_method: "Please select a payment method",
    fill_required_fields: "Please fill in all required fields",
    payment_failed: "Payment failed", login_required: "Please login to checkout",
    knet_unavailable: "KNET payment is currently unavailable. Please choose another method.",

    // Contact Page
    get_in_touch: "Get in Touch", contact_desc: "We'd love to hear from you!",
    contact_subtitle: "Tell us what you are looking for and we will reply within one working day.",
    address: "Address", phone: "Phone", email: "Email", hours: "Hours",
    send_message: "Send a Message", first_name: "First Name", last_name: "Last Name",
    subject: "Subject", message: "Message", send_btn: "Send Message",
    contact_success: "Thank you! We will get back to you shortly.",
    business_hours: "Business Hours", business_hours_value: "Sat-Thu: 10AM-10PM",
    your_name: "Your Name", your_email: "Your Email",
    our_location: "Our Location", email_us: "Email Us", call_us: "Call Us",
    working_hours: "Working Hours",
    working_hours_value: "Sat – Thu · 10 AM to 10 PM",
    working_hours_friday: "Friday · 2 PM to 12 AM",
    message_sent: "Message sent",
    message_failed: "Your message could not be sent. Please try again.",
    message_sent_title: "Thank you",
    message_sent_desc: "Your message is with us — we will reply within one working day.",
    send_another: "Send another message",

    // Account Page
    login: "Login", register: "Register", welcome_back: "Welcome Back",
    create_account: "Create Account", email_address: "Email Address",
    password: "Password", confirm_password: "Confirm Password",
    full_name: "Full Name", sign_in: "Sign In",
    forgot_password: "Forgot your password?",
    forgot_password_desc: "Enter your email address and we'll send you an OTP to reset your password.",
    forgot_password_title: "Reset Password",
    send_otp: "Send OTP", verify_otp: "Verify OTP",
    verify_otp_desc: "Enter the 6-digit OTP sent to your email.",
    otp_code: "OTP Code", resend_otp: "Resend OTP",
    reset_password: "Reset Password",
    reset_password_desc: "Enter your new password.",
    new_password: "New Password", confirm_new_password: "Confirm New Password",
    password_reset_success: "Password Reset Successful",
    password_reset_success_desc: "Your password has been reset successfully. You can now login with your new password.",
    go_to_login: "Go to Login", back_to_login: "Back to Login",
    passwords_mismatch: "Passwords do not match",
    creating_account: "Creating account...",
    account_created: "Account created successfully!",
    registration_failed: "Registration failed",
    signing_in: "Signing in...",
    login_success: "Login successful! Welcome back.",
    login_failed: "Login failed", welcome_user: "Welcome",
    dashboard_desc: "Manage your account, orders, and preferences.",
    view_orders: "View My Orders", logout: "Logout",
    order_history: "Order History", loading_orders: "Loading orders...",
    no_orders: "No orders yet.", start_shopping: "Start shopping",
    failed_load_orders: "Failed to load orders.", order_status: "Status",
    send_reset_link: "Send Reset Link",
    admin_dashboard_btn: "Admin Dashboard", driver_dashboard_btn: "Driver Dashboard",
    manage_addresses: "Manage Addresses",

    // Order Success
    order_confirmed: "Order Confirmed!",
    order_success_msg: "Thank you for your order. We're preparing your items and will notify you when they ship.",
    order_number_label: "Order Number", track_order_btn: "Track My Order",
    view_orders_btn: "View My Orders", view_receipt_btn: "📄 View Receipt",
    email_confirmation: "📧 A confirmation email has been sent to your registered email address with order details and tracking information.",
    order_received: "Order Received",

    // Order Tracking
    track_your_order: "Track Your Order",
    track_order_desc: "Enter your order number to see real-time delivery status",
    track_btn: "Track", loading_tracking: "Loading order details...",
    track_driver: "Track Driver", hide_driver_tracking: "Hide Live Map",
    driver: "Driver",
    driver_location_pending: "Waiting for the driver to start sharing their location.",
    track_pick_order: "Choose an order to follow in real time",
    track_no_active: "You have no orders in transit right now.",
    track_no_active_hint: "Delivered and cancelled orders can't be tracked — you'll find them in your order history.",
    track_sign_in: "Sign in to track your orders",
    track_sign_in_hint: "Your active orders will be listed here once you're signed in.",
    track_view_history: "View order history",
    track_this_order: "Track this order",
    track_loading_orders: "Finding your active orders...",
    no_order_found: "No Order Found",
    no_order_msg: "Please enter a valid order number to track your delivery.",
    order_status_title: "Order Status", live_status: "Live",
    current_status_label: "Current Status", live_tracking: "Live Tracking",
    no_pilot: "No pilot assigned", waiting_assignment: "Waiting for assignment...",
    location_updates: "Location updates will appear here",
    last_update: "Last update",
    order_not_found_error: "Order not found. Please check the order number.",

    // Statuses
    status_pending: "Pending", status_placed: "Order Placed",
    status_confirmed: "Confirmed", status_processing: "Processing",
    status_packed: "Packed", status_handed_over: "Handed to Driver",
    status_out_for_delivery: "Out for Delivery", status_on_the_way: "On the Way",
    status_delivered: "Delivered", status_cancelled: "Cancelled",

    // Orders Page
    order_number: "Order #", date: "Date", status: "Status",
    items: "Items", action: "Action", track: "Track",
    view_details: "View Details", reorder: "Reorder",

    // Newsletter
    newsletter_title: "Subscribe to Our Newsletter",
    newsletter_subtitle: "Be the first to know about new arrivals and exclusive offers",
    newsletter_placeholder: "Enter your email address", subscribe: "Subscribe",

    // Footer
    footer_desc: "Discover the art of luxury living with our exquisite collection of handcrafted home décor and artisan glassware.",
    quick_links: "Quick Links", contact_info: "Contact Info",
    footer_copyright: "© 2026 ARTÉVA Maison. All rights reserved.",
    footer_payments: "We accept: KNET • Visa • Mastercard",

    // Cookie
    cookie_text: "We use cookies to provide the best experience on our website.",
    privacy_policy: "Privacy Policy", accept: "Accept",
    legal: "Legal", returns_refunds: "Returns & Refunds",
    terms_of_service: "Terms of Service", delete_my_data: "Delete My Data",

    // Cart Drawer
    your_cart: "Your Cart", cart_empty: "Your cart is empty",
    view_cart: "View Cart",

    // Delivery
    delivery_fee: "2 KD delivery in Kuwait", store_pickup: "Store pickup available",

    // Reviews
    customer_reviews: "Customer Reviews", write_review: "Write a Review",
    rating: "Rating", comment: "Review", submit_review: "Submit Review",
    cancel: "Cancel", average_rating: "Average Rating", reviews_count: "Reviews",
    verified_purchase: "Verified Purchase",
    no_reviews: "No reviews yet. Be the first to review!",
    review_submitted: "Review submitted successfully!",
    review_failed: "Failed to submit review",
    comment_placeholder: "Share your thoughts...",
    rating_required: "Please select a rating", submitting: "Submitting...",

    // Apple Pay
    apple_pay: "Apple Pay", apple_pay_desc: "Pay with Apple Pay",
    phone_placeholder: "965XXXXXXXX",

    // Email Campaign
    campaign_queued: "Campaign queued! Emails are being sent.",
    campaign_complete: "Campaign complete",
    campaign_sent: "sent", campaign_failed: "failed",

    // Addresses
    sidebar_dashboard: "Dashboard", sidebar_orders: "My Orders",
    sidebar_addresses: "Addresses", my_addresses: "My Addresses",
    add_new_address: "Add New Address",
    address_label: "Label (e.g. Home, Work)",
    address_label_placeholder: "Home", location: "Location",
    set_default_address: "Set as default address",
    save_address: "Save Address", add_new_address_card: "Add New Address",
    default_label: "Default", edit: "Edit", delete_text: "Delete",
    set_default: "Set Default",

    // Cart Page
    product_label: "Product", price_label: "Price",
    shipping_label: "Shipping", cart_empty_page: "Your cart is empty",

    // Admin
    admin_dashboard: "Dashboard", admin_products: "Products",
    admin_orders: "Orders", admin_users: "Users",
    admin_drivers: "Drivers", admin_marketing: "Marketing",
    admin_logout: "Logout", admin_total_users: "Total Users",
    admin_products_count: "Products", admin_orders_count: "Orders",
    admin_revenue: "Revenue (KWD)", admin_recent_orders: "Recent Orders",
    admin_add_product: "Add Product",
    admin_search_products: "Search products by name...",
    admin_search_orders: "Search by order number or customer name...",
    admin_search_users: "Search by name or email...",
    admin_search_drivers: "Search drivers by name...",
    admin_image: "Image", admin_name: "Name", admin_category: "Category",
    admin_price: "Price (KWD)", admin_stock: "Stock", admin_actions: "Actions",
    admin_order_number: "Order #", admin_customer: "Customer",
    admin_total: "Total", admin_status: "Status", admin_driver: "Driver",
    admin_date: "Date", admin_joined: "Joined", admin_role: "Role",
    admin_phone: "Phone", admin_active_orders: "Active Orders",
    admin_categories: "Categories", admin_email_marketing: "Email Marketing",
    admin_recipient_group: "Recipient Group", admin_all_users: "All Users",
    admin_subscribers_only: "Subscribers Only",
    admin_email_subject: "Email Subject",
    admin_enter_subject: "Enter email subject...",
    admin_message_content: "Message Content",
    admin_write_message: "Write your campaign message...",
    admin_attach_images: "Attach Images (Optional)",
    admin_attach_images_help: "You can attach multiple images to your email",
    admin_send_campaign: "Send Campaign",
    admin_product_name_en: "Product Name (English)",
    admin_product_name_ar: "Product Name (Arabic)",
    admin_select_category: "Select Category", admin_sku: "SKU",
    admin_images: "Images",
    admin_first_image_primary: "First image will be the primary image",
    admin_description_en: "Description (English)",
    admin_description_ar: "Description (Arabic)",
    admin_featured_product: "Featured Product",
    admin_new_arrival: "New Arrival",
    admin_cancel: "Cancel", admin_save_product: "Save Product",
    admin_product_details: "Product Details", admin_description: "Description",
    admin_track_driver: "Track Driver", admin_driver_info: "Driver Info",
    admin_location: "Location", admin_last_update: "Last Update",
    admin_coordinates: "Coordinates", admin_close: "Close",
    admin_order_details: "Order Details", admin_shipping: "Shipping",
    admin_payment: "Payment", admin_order_items: "Order Items",
    admin_subtotal: "Subtotal", admin_select_driver: "Select Driver",
    admin_unlock: "Unlock", admin_view: "View",
    admin_receipt: "Receipt", admin_track: "Track",
    admin_no_orders: "No orders found", admin_no_products: "No products found",
    admin_no_users: "No users found", admin_no_drivers: "No drivers found",
    admin_coming_soon: "Coming Soon",
    admin_save_address: "Save Address", admin_print_receipt: "Print Receipt",

    // UI chrome — navbar, drawers, dialogs
    menu: "Menu", search: "Search", close: "Close", next: "Next",
    loading: "Loading…", please_wait: "Please wait", items_unit: "items",
    categories_unavailable: "Categories are unavailable right now.",
    decrease_quantity: "Decrease quantity", increase_quantity: "Increase quantity",

    // Wishlist
    wishlist: "Wishlist", saved_for_later: "Saved for later",
    clear_wishlist: "Clear all",
    wishlist_empty: "Your wishlist is empty",
    wishlist_empty_desc: "Tap the heart on any piece to keep it here while you decide.",

    // Service promises
    promise_delivery_title: "1 DAY DELIVERY ACROSS KUWAIT",
    promise_delivery_desc: "Express delivery across Kuwait",
    promise_exclusive_title: "Exclusive Collections",
    promise_exclusive_desc: "Timeless craftsmanship",
    promise_secure_title: "Secure Payments",
    promise_secure_desc: "100% secure checkout",
    promise_support_title: "Dedicated Support",
    promise_support_desc: "We're here to help",

    // Checkout / payments
    secure_checkout_label: "Secure checkout",
    select_placeholder: "— Select —",
    field_required: "This field is required",
    invalid_phone: "Please enter a valid phone number",
    address_type_home: "Home", address_type_work: "Work", address_type_other: "Other",
    deema_bnpl: "Deema BNPL", deema_desc: "Buy now, pay later",
    payment_online_unavailable: "Card and KNET payments are temporarily unavailable. Please try again shortly or use Deema.",
    payment_none_available: "No payment methods are available right now. Please contact us and we'll complete your order for you.",
    chat_whatsapp: "Chat on WhatsApp",
    open_ticket: "Send us a message",
    need_help: "Need help?",
    payment_timeout: "The payment provider took too long to respond. Please try again.",

    // Delivery location picker
    delivery_location: "Delivery location",
    map_hint: "Drag the map to place the pin on your exact delivery point.",
    map_no_pin: "No location selected yet",
    map_unavailable: "The map could not be loaded. You can enter coordinates manually, or continue — they are optional.",
    map_address_lookup_failed: "Could not look up the address for this point. The pin location is still saved.",
    map_geolocation_unsupported: "Your browser does not support location access.",
    map_geolocation_denied: "Location access was denied. Drag the map to set your pin instead.",
    resolving_address: "Looking up address…",
    locating: "Locating…",
    latitude: "Latitude", longitude: "Longitude",
    zoom_in: "Zoom in", zoom_out: "Zoom out",

    // Promo codes
    promo_code: "Promo code", promo_placeholder: "Promo code",
    apply: "Apply", discount: "Discount",
    promo_applied: "Promo code applied",
    promo_removed: "Promo code removed",

    // Apple Pay
    apple_pay_unavailable: "Apple Pay is not available on this device.",
    apple_pay_cancelled: "Apple Pay was cancelled.",

    // Admin — orders, receipts, revenue
    all_orders: "All Orders", online_orders: "Online Orders",
    manual_orders: "Manual Receipts",
    delete_order: "Delete Order",
    delete_order_warning: "This permanently deletes the order and restores its stock. This cannot be undone.",
    confirm_delete_type: "Type the order number to confirm",
    order_deleted: "Order deleted",
    revenue: "Revenue", gross_revenue: "Gross Revenue", net_revenue: "Net Revenue",
    refunds: "Refunds", average_order: "Average Order",
    receipt_generator: "Receipt Generator",
    save_receipt: "Save Receipt", update_receipt: "Update Receipt",
    refund_item: "Refund item", refund_all: "Refund entire receipt",
    add_item: "Add item", line_items: "Line Items",

    // Refunds — requested over WhatsApp and settled by an admin, not by an API
    request_refund: "Request refund",
    refund_days_left: "{days} days left",
    pin_required: "Please drop a pin on the map so the driver can find you.",
    pin_saved: "Pinned location saved",
  },

  ar: {
    // Navigation
    home: "الرئيسية", categories: "الأقسام", new_arrivals: "جديدنا",
    crystals: "كريستال", lighting: "الإضاءات",
    vases_bowls: "المزهريات والأوعية", vases: "المزهريات",
    bowls: "الأوعية", plates: "الأطباق", view_all: "عرض الكل",
    collections: "المجموعات", contact: "اتصل بنا", contact_us: "اتصل بنا",
    account: "حسابي", my_account: "حسابي",
    search_placeholder: "ابحث عن المنتجات...",

    // Hero
    hero_subtitle: "مجموعة فاخرة",
    hero_title: "ديكور منزلي<br>مصنوع بحرفية",
    hero_desc: "اكتشف مجموعتنا الرائعة من الأواني الزجاجية المصنوعة يدوياً، والقطع الزخرفية، وإكسسوارات المنزل الفاخرة.",
    shop_collection: "تسوق المجموعة", explore: "استكشف",
    admin_hero_slides: "شرائح البداية", admin_browse_collections: "تصفح المجموعات",

    // Featured Collections
    featured_collections_title: "مجموعات مختارة",
    featured_collections_subtitle: "استكشف اختياراتنا المميزة",
    collection_crystal: "مجموعة الكريستال", collection_vases: "مزهريات ديكور",
    collection_bowls: "أوعية فنية", collection_plates: "أطباق ديكور",
    view_all_products: "عرض كل المنتجات",

    // Categories
    category_new: "جديد", category_outlet: "تخفيضات", glassware: "الأواني الزجاجية",
    category_glassware: "الأواني الزجاجية", category_lighting: "الإضاءة",
    category_serveware: "أدوات التقديم", category_decor: "ديكور",
    category_candles: "حاملات الشموع",

    // Contact Form Options
    general_inquiry: "استفسار عام", order_status_inquiry: "حالة الطلب",
    product_question: "سؤال عن منتج", returns_inquiry: "الإرجاع",

    // Products
    new_arrivals_title: "وصل حديثاً",
    new_arrivals_subtitle: "اكتشف أحدث إضافاتنا",
    badge_new: "جديد", add_to_cart: "أضف للسلة", currency: "د.ك",

    // Currency Names
    currency_kwd: "دينار كويتي", currency_sar: "ريال سعودي",
    currency_aed: "درهم إماراتي", currency_qar: "ريال قطري",
    currency_bhd: "دينار بحريني", currency_omr: "ريال عماني",
    currency_usd: "دولار أمريكي",

    // Collection Pages
    all_collections: "كل المجموعات",
    browse_collections: "تصفح مجموعاتنا المختارة من الديكور المنزلي الفاخر",
    filter: "تصنيف", sort_featured: "المميزة",
    sort_price_low: "السعر: من الأقل للأعلى",
    sort_price_high: "السعر: من الأعلى للأقل",
    sort_newest: "الأحدث", sort_name: "الاسم: أ-ي",
    products_count: "منتجات",
    no_products: "لم يتم العثور على منتجات في هذا القسم.",
    browse_all: "تصفح كل المجموعات",
    added_wishlist: "تمت الإضافة للمفضلة",
    removed_wishlist: "تم الحذف من المفضلة",

    // Cart & Checkout
    shopping_cart: "عربة التسوق", product: "المنتج", price: "السعر",
    quantity: "الكمية", total: "المجموع",
    continue_shopping: "متابعة التسوق", clear_cart: "إفراغ العربة",
    order_summary: "ملخص الطلب", subtotal: "المجموع الفرعي",
    shipping: "الشحن", free: "مجاني",
    taxes_shipping_note: "يتم حساب الضرائب والشحن عند الدفع",
    proceed_to_checkout: "إتمام الشراء", we_accept: "نقبل الدفع بـ",
    checkout: "الدفع", shipping_address: "عنوان الشحن",
    street_address: "العنوان *", city: "المدينة *",
    state_area: "المنطقة / المحافظة", country: "الدولة",
    postal_code: "الرمز البريدي", phone_number: "رقم الهاتف",
    use_current_location: "استخدم موقعي الحالي",
    drag_pin_hint: "اسحب الدبوس إلى موقع التوصيل الدقيق.",
    saved_addresses: "العناوين المحفوظة", payment_method: "طريقة الدفع",
    credit_card: "بطاقة ائتمان / خصم", secure_payment: "دفع آمن عبر الإنترنت",
    knet: "كي نت", knet_desc: "دفع محلي (الكويت)",
    cod: "الدفع عند الاستلام", cod_desc: "ادفع عند استلام طلبك",
    order_notes: "ملاحظات الطلب (اختياري)", place_order: "تأكيد الطلب",
    secure_checkout: "دفع آمن مع تشفير المعاملات",

    // Alerts
    confirm_clear_cart: "هل أنت متأكد أنك تريد إفراغ سلة التسوق؟",
    cart_cleared: "تم إفراغ السلة", cart_empty_error: "سلة التسوق فارغة",
    added_to_cart: "تمت الإضافة للسلة", removed_from_cart: "تم الحذف من السلة",
    remove: "حذف", processing: "جاري المعالجة...",
    select_payment_method: "يرجى اختيار طريقة الدفع",
    fill_required_fields: "يرجى تعبئة جميع الحقول المطلوبة",
    payment_failed: "فشلت عملية الدفع",
    login_required: "يرجى تسجيل الدخول للمتابعة",
    knet_unavailable: "الدفع عبر كي نت غير متوفر حالياً. يرجى اختيار طريقة أخرى.",

    // Contact Page
    get_in_touch: "تواصل معنا", contact_desc: "يسعدنا سماع رأيك. أرسل لنا رسالة وسنرد في أقرب وقت.",
    contact_subtitle: "أخبرنا بما تبحث عنه وسنرد عليك خلال يوم عمل واحد.",
    address: "العنوان", phone: "الهاتف", email: "البريد الإلكتروني",
    hours: "ساعات العمل", send_message: "إرسال الرسالة",
    first_name: "الاسم الأول", last_name: "اسم العائلة",
    subject: "الموضوع", message: "الرسالة",
    send_btn: "إرسال الرسالة",
    contact_success: "شكراً لك! سنقوم بالرد عليك قريباً.",
    business_hours: "ساعات العمل",
    business_hours_value: "السبت-الخميس: 10 صباحًا - 10 مساءً",
    your_name: "الاسم", your_email: "البريد الإلكتروني",
    our_location: "موقعنا", email_us: "راسلنا", call_us: "اتصل بنا",
    working_hours: "ساعات العمل",
    working_hours_value: "السبت – الخميس · من 10 صباحاً حتى 10 مساءً",
    working_hours_friday: "الجمعة · من 2 ظهراً حتى 12 منتصف الليل",
    message_sent: "تم إرسال الرسالة",
    message_failed: "تعذّر إرسال رسالتك. يرجى المحاولة مرة أخرى.",
    message_sent_title: "شكراً لك",
    message_sent_desc: "وصلتنا رسالتك — سنرد عليك خلال يوم عمل واحد.",
    send_another: "إرسال رسالة أخرى",

    // Account Page
    login: "تسجيل الدخول", register: "تسجيل جديد",
    welcome_back: "مرحباً بعودتك", create_account: "إنشاء حساب",
    email_address: "البريد الإلكتروني", password: "كلمة المرور",
    confirm_password: "تأكيد كلمة المرور", full_name: "الاسم الكامل",
    sign_in: "دخول", forgot_password: "نسيت كلمة المرور؟",
    forgot_password_desc: "أدخل عنوان بريدك الإلكتروني وسنرسل لك رمز OTP لإعادة تعيين كلمة المرور.",
    forgot_password_title: "إعادة تعيين كلمة المرور",
    send_otp: "إرسال رمز OTP", verify_otp: "التحقق من رمز OTP",
    verify_otp_desc: "أدخل رمز OTP المكون من 6 أرقام المرسل إلى بريدك الإلكتروني.",
    otp_code: "رمز OTP", resend_otp: "إعادة إرسال رمز OTP",
    reset_password: "إعادة تعيين كلمة المرور",
    reset_password_desc: "أدخل كلمة المرور الجديدة.",
    new_password: "كلمة المرور الجديدة",
    confirm_new_password: "تأكيد كلمة المرور الجديدة",
    password_reset_success: "تم إعادة تعيين كلمة المرور بنجاح",
    password_reset_success_desc: "تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    go_to_login: "الذهاب إلى تسجيل الدخول",
    back_to_login: "العودة إلى تسجيل الدخول",
    passwords_mismatch: "كلمات المرور غير متطابقة",
    creating_account: "جاري إنشاء الحساب...",
    account_created: "تم إنشاء الحساب بنجاح!",
    registration_failed: "فشل إنشاء الحساب",
    signing_in: "جاري تسجيل الدخول...",
    login_success: "تم تسجيل الدخول بنجاح! مرحباً بعودتك.",
    login_failed: "فشل تسجيل الدخول", welcome_user: "مرحبًا",
    dashboard_desc: "إدارة حسابك وطلباتك وتفضيلاتك.",
    view_orders: "عرض طلباتي", logout: "تسجيل الخروج",
    order_history: "سجل الطلبات", loading_orders: "جاري تحميل الطلبات...",
    no_orders: "لا توجد طلبات بعد.", start_shopping: "ابدأ التسوق",
    failed_load_orders: "فشل تحميل الطلبات.", order_status: "الحالة",
    send_reset_link: "إرسال رابط إعادة التعيين",
    admin_dashboard_btn: "لوحة التحكم", driver_dashboard_btn: "لوحة السائق",
    manage_addresses: "إدارة العناوين",

    // Order Success
    order_confirmed: "تم تأكيد الطلب!",
    order_success_msg: "شكراً لطلبك. نقوم حالياً بتجهيز العناصر وسنقوم بإعلامك عند شحنها.",
    order_number_label: "رقم الطلب", track_order_btn: "تتبع طلبي",
    view_orders_btn: "عرض طلباتي", view_receipt_btn: "📄 عرض الإيصال",
    email_confirmation: "📧 تم إرسال رسالة تأكيد إلى بريدك الإلكتروني المسجل تحتوي على تفاصيل الطلب ومعلومات التتبع.",
    order_received: "تم استلام الطلب",

    // Order Tracking
    track_your_order: "تتبع طلبك",
    track_order_desc: "أدخل رقم الطلب لمعرفة حالة التوصيل في الوقت الفعلي",
    track_btn: "تتبع", loading_tracking: "جاري تحميل تفاصيل الطلب...",
    track_driver: "تتبع السائق", hide_driver_tracking: "إخفاء الخريطة المباشرة",
    driver: "السائق",
    driver_location_pending: "بانتظار بدء السائق بمشاركة موقعه.",
    track_pick_order: "اختر طلباً لمتابعته مباشرة",
    track_no_active: "لا توجد لديك طلبات قيد التوصيل حالياً.",
    track_no_active_hint: "لا يمكن تتبع الطلبات المسلّمة أو الملغاة — ستجدها في سجل طلباتك.",
    track_sign_in: "سجّل الدخول لتتبع طلباتك",
    track_sign_in_hint: "ستظهر طلباتك النشطة هنا بعد تسجيل الدخول.",
    track_view_history: "عرض سجل الطلبات",
    track_this_order: "تتبع هذا الطلب",
    track_loading_orders: "جاري البحث عن طلباتك النشطة...",
    no_order_found: "لم يتم العثور على طلب",
    no_order_msg: "يرجى إدخال رقم طلب صحيح لتتبع شحنتك.",
    order_status_title: "حالة الطلب", live_status: "مباشر",
    current_status_label: "الحالة الحالية", live_tracking: "تتبع مباشر",
    no_pilot: "لم يتم تعيين سائق", waiting_assignment: "بانتظار التعيين...",
    location_updates: "ستظهر تحديثات الموقع هنا", last_update: "آخر تحديث",
    order_not_found_error: "الطلب غير موجود. يرجى التحقق من رقم الطلب.",

    // Statuses
    status_pending: "قيد الانتظار", status_placed: "تم الطلب",
    status_confirmed: "تم التأكيد", status_processing: "جاري المعالجة",
    status_packed: "تم التجهيز", status_handed_over: "تم التسليم للسائق",
    status_out_for_delivery: "خرج للتوصيل", status_on_the_way: "في الطريق",
    status_delivered: "تم التوصيل", status_cancelled: "ملغي",

    // Orders Page
    order_number: "رقم الطلب", date: "التاريخ", status: "الحالة",
    items: "العناصر", action: "الإجراء", track: "تتبع",
    view_details: "عرض التفاصيل", reorder: "إعادة الطلب",

    // Newsletter
    newsletter_title: "اشترك في نشرتنا البريدية",
    newsletter_subtitle: "كن أول من يعرف عن المنتجات الجديدة والعروض الحصرية",
    newsletter_placeholder: "أدخل بريدك الإلكتروني", subscribe: "اشترك",

    // Footer
    footer_desc: "اكتشف فن العيش الفاخر مع مجموعتنا الرائعة من ديكور المنزل المصنوع يدوياً والأواني الزجاجية الفنية.",
    quick_links: "روابط سريعة", contact_info: "معلومات الاتصال",
    footer_copyright: "© 2026 أرتيفا ميزون. جميع الحقوق محفوظة.",
    footer_payments: "نقبل: كي-نت • فيزا • ماستركارد",

    // Cookie
    cookie_text: "نستخدم ملفات تعريف الارتباط لتوفير أفضل تجربة على موقعنا.",
    privacy_policy: "سياسة الخصوصية", accept: "موافق",
    legal: "معلومات قانونية", returns_refunds: "الإرجاع والاسترداد",
    terms_of_service: "شروط الخدمة", delete_my_data: "حذف بياناتي",

    // Cart Drawer
    your_cart: "سلة التسوق", cart_empty: "سلة التسوق فارغة",
    view_cart: "عرض السلة",

    // Delivery
    delivery_fee: "توصيل بـ 2 د.ك في الكويت", store_pickup: "الاستلام من المتجر متاح",

    // Reviews
    customer_reviews: "آراء العملاء", write_review: "كتابة تقييم",
    rating: "التقييم", comment: "التعليق", submit_review: "إرسال التقييم",
    cancel: "إلغاء", average_rating: "متوسط التقييم", reviews_count: "التقييمات",
    verified_purchase: "شراء مؤكد",
    no_reviews: "لا توجد تقييمات بعد. كن أول من يقيم!",
    review_submitted: "تم إرسال التقييم بنجاح!",
    review_failed: "فشل إرسال التقييم",
    comment_placeholder: "شاركنا رأيك...",
    rating_required: "يرجى اختيار تقييم", submitting: "جاري الإرسال...",

    // Apple Pay
    apple_pay: "Apple Pay", apple_pay_desc: "الدفع عبر Apple Pay",
    phone_placeholder: "965XXXXXXXX",

    // Email Campaign
    campaign_queued: "تم إرسال الحملة! يتم إرسال الرسائل.",
    campaign_complete: "اكتملت الحملة",
    campaign_sent: "تم الإرسال", campaign_failed: "فشل",

    // Addresses
    sidebar_dashboard: "لوحة التحكم", sidebar_orders: "طلباتي",
    sidebar_addresses: "العناوين", my_addresses: "عناويني",
    add_new_address: "إضافة عنوان جديد",
    address_label: "التسمية (مثل: المنزل، العمل)",
    address_label_placeholder: "المنزل", location: "الموقع",
    set_default_address: "تعيين كعنوان افتراضي",
    save_address: "حفظ العنوان", add_new_address_card: "إضافة عنوان جديد",
    default_label: "افتراضي", edit: "تعديل",
    delete_text: "حذف", set_default: "تعيين افتراضي",

    // Cart Page
    product_label: "المنتج", price_label: "السعر",
    shipping_label: "الشحن", cart_empty_page: "سلة التسوق فارغة",

    // Admin
    admin_dashboard: "لوحة التحكم", admin_products: "المنتجات",
    admin_orders: "الطلبات", admin_users: "المستخدمون",
    admin_drivers: "السائقون", admin_marketing: "التسويق",
    admin_logout: "تسجيل الخروج", admin_total_users: "إجمالي المستخدمين",
    admin_products_count: "المنتجات", admin_orders_count: "الطلبات",
    admin_revenue: "الإيرادات (د.ك)", admin_recent_orders: "الطلبات الأخيرة",
    admin_add_product: "إضافة منتج",
    admin_search_products: "البحث عن المنتجات بالاسم...",
    admin_search_orders: "البحث برقم الطلب أو اسم العميل...",
    admin_search_users: "البحث بالاسم أو البريد الإلكتروني...",
    admin_search_drivers: "البحث عن السائقين بالاسم...",
    admin_image: "الصورة", admin_name: "الاسم", admin_category: "الفئة",
    admin_price: "السعر (د.ك)", admin_stock: "المخزون", admin_actions: "الإجراءات",
    admin_order_number: "رقم الطلب", admin_customer: "العميل",
    admin_total: "المجموع", admin_status: "الحالة", admin_driver: "السائق",
    admin_date: "التاريخ", admin_joined: "تاريخ الانضمام", admin_role: "الدور",
    admin_phone: "الهاتف", admin_active_orders: "الطلبات النشطة",
    admin_categories: "الفئات", admin_email_marketing: "التسويق عبر البريد الإلكتروني",
    admin_recipient_group: "مجموعة المستلمين", admin_all_users: "جميع المستخدمين",
    admin_subscribers_only: "المشتركون فقط",
    admin_email_subject: "موضوع البريد الإلكتروني",
    admin_enter_subject: "أدخل موضوع البريد الإلكتروني...",
    admin_message_content: "محتوى الرسالة",
    admin_write_message: "اكتب رسالة الحملة...",
    admin_attach_images: "إرفاق صور (اختياري)",
    admin_attach_images_help: "يمكنك إرفاق عدة صور في البريد الإلكتروني",
    admin_send_campaign: "إرسال الحملة",
    admin_product_name_en: "اسم المنتج (الإنجليزية)",
    admin_product_name_ar: "اسم المنتج (العربية)",
    admin_select_category: "اختر الفئة", admin_sku: "رمز المنتج",
    admin_images: "الصور",
    admin_first_image_primary: "الصورة الأولى ستكون الصورة الأساسية",
    admin_description_en: "الوصف (الإنجليزية)",
    admin_description_ar: "الوصف (العربية)",
    admin_featured_product: "منتج مميز", admin_new_arrival: "وصل حديثاً",
    admin_cancel: "إلغاء", admin_save_product: "حفظ المنتج",
    admin_product_details: "تفاصيل المنتج", admin_description: "الوصف",
    admin_track_driver: "تتبع السائق", admin_driver_info: "معلومات السائق",
    admin_location: "الموقع", admin_last_update: "آخر تحديث",
    admin_coordinates: "الإحداثيات", admin_close: "إغلاق",
    admin_order_details: "تفاصيل الطلب", admin_shipping: "الشحن",
    admin_payment: "الدفع", admin_order_items: "عناصر الطلب",
    admin_subtotal: "المجموع الفرعي", admin_select_driver: "اختر السائق",
    admin_unlock: "فتح", admin_view: "عرض",
    admin_receipt: "الإيصال", admin_track: "تتبع",
    admin_no_orders: "لا توجد طلبات", admin_no_products: "لا توجد منتجات",
    admin_no_users: "لا يوجد مستخدمون", admin_no_drivers: "لا يوجد سائقون",
    admin_coming_soon: "قريباً",
    admin_save_address: "حفظ العنوان", admin_print_receipt: "طباعة الإيصال",

    // UI chrome — navbar, drawers, dialogs
    menu: "القائمة", search: "بحث", close: "إغلاق", next: "التالي",
    loading: "جارٍ التحميل…", please_wait: "يرجى الانتظار", items_unit: "قطعة",
    categories_unavailable: "الأقسام غير متاحة حالياً.",
    decrease_quantity: "تقليل الكمية", increase_quantity: "زيادة الكمية",

    // Wishlist
    wishlist: "المفضلة", saved_for_later: "محفوظ للاحقاً",
    clear_wishlist: "مسح الكل",
    wishlist_empty: "قائمة المفضلة فارغة",
    wishlist_empty_desc: "اضغط على القلب في أي قطعة لحفظها هنا ريثما تقرر.",

    // Service promises
    promise_delivery_title: "توصيل خلال يوم في الكويت",
    promise_delivery_desc: "توصيل سريع لجميع مناطق الكويت",
    promise_exclusive_title: "مجموعات حصرية",
    promise_exclusive_desc: "حرفية خالدة",
    promise_secure_title: "دفع آمن",
    promise_secure_desc: "إتمام شراء آمن ١٠٠٪",
    promise_support_title: "دعم مخصص",
    promise_support_desc: "نحن هنا لمساعدتك",

    // Checkout / payments
    secure_checkout_label: "دفع آمن",
    select_placeholder: "— اختر —",
    field_required: "هذا الحقل مطلوب",
    invalid_phone: "الرجاء إدخال رقم هاتف صحيح",
    address_type_home: "المنزل", address_type_work: "العمل", address_type_other: "آخر",
    deema_bnpl: "ديمة - قسّطها", deema_desc: "اشترِ الآن وادفع لاحقاً",

    payment_online_unavailable: "الدفع بالبطاقة و«كي نت» غير متاح مؤقتاً. يرجى المحاولة بعد قليل أو استخدام «ديمة».",
    payment_none_available: "لا تتوفر أي وسيلة دفع حالياً. يرجى التواصل معنا وسنكمل طلبك.",
    chat_whatsapp: "تواصل عبر واتساب",
    open_ticket: "أرسل لنا رسالة",
    need_help: "تحتاج مساعدة؟",
    payment_timeout: "استغرق مزود الدفع وقتاً طويلاً. يرجى المحاولة مجدداً.",

    // Delivery location picker
    delivery_location: "موقع التوصيل",
    map_hint: "اسحب الخريطة لتحديد موقع التوصيل بدقة.",
    map_no_pin: "لم يتم تحديد موقع بعد",
    map_unavailable: "تعذر تحميل الخريطة. يمكنك إدخال الإحداثيات يدوياً أو المتابعة — فهي اختيارية.",
    map_address_lookup_failed: "تعذر إيجاد العنوان لهذه النقطة، ولكن الموقع محفوظ.",
    map_geolocation_unsupported: "متصفحك لا يدعم تحديد الموقع.",
    map_geolocation_denied: "تم رفض الوصول إلى الموقع. اسحب الخريطة لتحديد موقعك.",
    resolving_address: "جارٍ البحث عن العنوان…",
    locating: "جارٍ التحديد…",
    latitude: "خط العرض", longitude: "خط الطول",
    zoom_in: "تكبير", zoom_out: "تصغير",

    // Promo codes
    promo_code: "كود الخصم", promo_placeholder: "كود الخصم",
    apply: "تطبيق", discount: "الخصم",
    promo_applied: "تم تطبيق كود الخصم",
    promo_removed: "تم إزالة كود الخصم",

    // Apple Pay
    apple_pay_unavailable: "Apple Pay غير متاح على هذا الجهاز.",
    apple_pay_cancelled: "تم إلغاء Apple Pay.",

    // Admin — orders, receipts, revenue
    all_orders: "كل الطلبات", online_orders: "الطلبات الإلكترونية",
    manual_orders: "الإيصالات اليدوية",
    delete_order: "حذف الطلب",
    delete_order_warning: "سيتم حذف الطلب نهائياً وإرجاع المخزون. لا يمكن التراجع عن هذا الإجراء.",
    confirm_delete_type: "اكتب رقم الطلب للتأكيد",
    order_deleted: "تم حذف الطلب",
    revenue: "الإيرادات", gross_revenue: "إجمالي الإيرادات", net_revenue: "صافي الإيرادات",
    refunds: "المبالغ المستردة", average_order: "متوسط الطلب",
    receipt_generator: "منشئ الإيصالات",
    save_receipt: "حفظ الإيصال", update_receipt: "تحديث الإيصال",
    refund_item: "استرداد الصنف", refund_all: "استرداد الإيصال بالكامل",
    add_item: "إضافة صنف", line_items: "الأصناف",

    // Refunds — requested over WhatsApp and settled by an admin, not by an API
    request_refund: "طلب استرجاع",
    refund_days_left: "متبقٍ {days} يوم",
    pin_required: "يرجى تحديد موقعك على الخريطة ليتمكن السائق من الوصول إليك.",
    pin_saved: "تم حفظ الموقع المحدد",
  },
};
