# 🚀 AI Barcode Scanner POS System (No Hardware Needed)

A fast, mobile-first **Point of Sale (POS)** system with barcode scanning — built using **Next.js + Firebase**.

Scan products → auto add to cart → generate bill → download receipt.
All from your phone. No expensive machines needed.

---

## 🎥 Demo

> Scan → Add → Bill → Done ⚡
> (Add a GIF or short video here showing full flow)

---

## ✨ Features

* 📷 Barcode Scanner (real-time)
* 🛒 Smart Cart (auto quantity update)
* 🧾 Billing System (instant total)
* 📄 PDF Receipt Generator
* 🔐 Admin Dashboard (add/edit/delete products)
* 🔥 Firebase Backend (real-time + scalable)
* 📱 Mobile-first design (shop-friendly)

---

## ⚡ Use Cases

* 🏪 Kirana Stores
* 🏋️ Gyms (supplements billing)
* 💊 Medical Shops
* 🛍️ Small Retail Businesses

---

## 🛠️ Tech Stack

* **Frontend:** Next.js + Tailwind CSS
* **Backend:** Firebase (Firestore + Auth)
* **Scanner:** html5-qrcode
* **PDF:** jsPDF

---

## 🚀 Quick Start

```bash
git clone https://github.com/raizianofficial/ai-barcode-billing-system.git
cd YOUR_REPO_NAME
npm install
npm run dev
```

---

## 🔐 Firebase Setup

1. Go to Firebase Console
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (Email/Password)

---

## 🔑 Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 📦 Firestore Structure

### products

* barcode (string)
* name (string)
* price (number)

### sales

* totalAmount
* createdAt

### items (subcollection)

* name
* price
* quantity

---

## 🧠 How It Works

1. Scan barcode 📷
2. Fetch product from Firebase
3. Add to cart 🛒
4. Click "Generate Bill"
5. Receipt generated 🧾

---

## 🗺️ Roadmap

* [ ] Multi-shop support
* [ ] Analytics dashboard
* [ ] WhatsApp receipt sharing
* [ ] Offline mode
* [ ] Thermal printer integration

---

## 🤝 Contributing

Contributions are welcome!

* Fork the repo
* Create a new branch
* Submit a pull request

---

## ⭐ Support

If you find this project useful:

👉 Star this repo
👉 Follow me for more projects

---

## 🧑‍💻 Author

Built by **Sunny (Raizian)**
🚀 Building real-world tools & systems

---

## 📜 License

MIT License — free to use and modify.
