<div align="center">
  <img
    src="./banner.png"
    alt="KarmaGully Banner"
    width="100%"
  />
</div>



## 🚀 Run Locally

### Prerequisites

- Node.js 20+
- Firebase Project
- Cloudinary Account
- Google AI API Key (Optional - Required for AI-powered blog generation)
- Telegram Bot (Optional - Admin notifications)
- Razorpay Account (Optional - Testing online payments)

### Installation

```bash
git clone https://github.com/contactkarmagully-star/karmagully_website.git
cd karmagully_website
npm install
```

### Environment Setup

This project uses environment variables for Firebase, Cloudinary, Google AI, Razorpay, and Telegram integration.

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and replace the placeholder values with your own credentials.

> **Note:** AI features, online payments, and Telegram notifications require their respective API keys. See `.env.example` for the complete list of required variables.

### Start the Development Server

```bash
npm run dev
```
