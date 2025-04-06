# 🧠 Gigster - Decentralized Data Labeling Platform

**Gigster** is a modern, decentralized data labeling platform where **users** create tasks such as image annotation or selection, and **workers** complete them to earn rewards in **SOL**. While the backend is centralized for performance and security, **payments are decentralized** and handled via the **Solana blockchain**.

---

## 🌐 Live

- 👨‍💻 **User Portal**: [gigster-user-frontend.vercel.app](https://gigster-user-frontend.vercel.app)
- 🧑‍🔧 **Worker Portal**: [gigster-worker-frontend.vercel.app](https://gigster-worker-frontend.vercel.app)
- ⚙️ **Backend API**: [gigster-backend-5tnx.onrender.com](https://gigster-backend-5tnx.onrender.com)

---

## ✨ Features

### 👥 Dual Roles

#### 👨‍💼 Users (Clients)
- Create labeling tasks (e.g., “Select the best thumbnail”).
- Upload media assets (stored on **Amazon S3 + CloudFront**).
- Pay in **SOL** for each task based on its complexity and number of contributors.
- View responses/submissions from workers in **REALTIME** via dashboard.

#### 🧑‍🔧 Workers (Freelancers)
- Browse available tasks.
- Submit responses based on task instructions.
- Earn a share of the total task cost in **SOL**.
- Withdraw earnings to their connected **Solana wallet**.

## 💸 Payments & SOL Handling

#### 🔹 For Users
- Payment is made in **SOL** through a connected wallet.
- **Transaction Validation:** Each SOL payment is validated and recorded on the Solana blockchain before task creation.
- **Overpayment Logic:**  
  If a user accidentally sends more SOL than required (e.g., sends `1 SOL` but only `0.5 SOL` is needed), the:
  - **Task is created** using the required amount.
  - **Extra SOL is stored as UNUSED** in the database.
  - This balance can be used automatically for future task creation.

#### 🔹 For Workers
- Workers complete tasks listed on the platform.
- For each valid submission, they are paid a **portion of the total task cost**.
- **Payouts are made in SOL**, directly to their connected wallet.
- All transactions are **transparent, verifiable, and decentralized** using Solana.
- Every payout is **logged**, preventing multiple rewards for the same task submission.
- Backend ensures **double payout prevention** and **submission tracking**.

---

## 🔁 Workflow Overview

1. **User logs in** and creates a task like “Choose the best thumbnail”.
2. User **uploads images**, which are securely stored using **S3 + CloudFront**.
3. User defines no. of **contributors** and pays in **SOL** using a connected wallet.
4. If user overpays, the extra SOL is stored as **unused** for future tasks.
5. **Workers** login, get the tasks, and submit their choices.
6. For every valid submission, the **worker earns a portion of the SOL**.
7. All payments are done via **Solana**, and all data is stored in **NeonDB**.
    
---

## ⚙️ Tech Stack

- **Next.js + Tailwind CSS**  - Frontend (User & Worker Interfaces)
- **Node.js + Express**       - Centralized backend API
- **Neon.tech (PostgreSQL)**  - Primary database
- **Amazon S3 + CloudFront**  - Media storage & global delivery
- **Vercel**                  - Hosting frontends
- **Render**                  - Hosting backend

---

## 🔐 Security & Trust

- 🔐 **Wallet-based authentication** for payments
- 📦 **JWT-based backend auth** for Users and Workers
- 🧾 **Transparent Solana transactions** (viewable on Solana explorer)
- 🗂️ **Data consistency ensured** via Neon PostgreSQL
- 🌍 **Fast and secure media delivery** using CloudFront CDN
