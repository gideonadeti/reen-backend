# REEN – Scalable E-Commerce Platform 🛒

**[REEN](https://reen-commerce.vercel.app)** is a fully-featured, scalable e-commerce platform built as part of this [roadmap.sh project challenge](https://roadmap.sh/projects/scalable-ecommerce-platform), with extensive customization and feature additions.

This project simulates a virtual economy where users can browse, buy, sell, and manage digital products—with role-based upgrades, economic constraints, and robust transaction handling.

## ⚠ Note on Deployment

This project was originally deployed using AWS EC2.  
The service has since been terminated after the free-tier period ended.  
The application code, architecture, and core logic remain intact and can be redeployed if needed.

## 🚀 Features (User Journey Flow)

- **Clerk-based authentication**  
  Secure, modern auth with automatic syncing to REEN's database.

- **Dynamic profile dashboard**  
  Shows user role, virtual balance ($4M by default), purchases, sales, and earnings.

- **Role-based experience**  
  Users start as `NADMIN`s. Upgrade to `ADMIN` ($160K fee) to start selling products.

- **Interactive users page**  
  Explore other users' stats (balance, role, date joined). Includes sorting, searching, and faceted-filtering (`ADMIN`/`NADMIN`).

- **Comprehensive products page**  
  Browse all platform products in a paginated, searchable, sortable table. Includes product previews, image popovers, and creator info.

- **Detailed product pages**  
  Full image carousel, price, description, and "Add to Cart" flow with quantity validation and low-stock alerts.

- **Cart system with real-time feedback**  
  Add, update, or remove items. Cart badge updates instantly via React Query. Add-to-cart logic handles multiple edge cases (e.g., 0 quantity, self-purchase prevention).

- **Stripe-based checkout**  
  Pre-checkout validation, test card info, and redirect to secure Stripe payment page. Order value capped at $999,999.99 with proper alerts.

- **Robust checkout saga flow**  
  Transactional safety with rollback support in case of partial failure (e.g., payment success but order failure).

- **Email notifications**  
  Buyers and product owners are notified via email after successful transactions, including order details and user info.

- **Orders management**  
  View all past orders with details like total cost, number of items, and order breakdown (subtotal, per-item cost).

- **Smart product management (for ADMINs)**  
  Create, update, or delete products. Fees applied for creation (4% of price × quantity) and for increasing price/quantity on updates.

- **Image generation via Robohash**  
  No uploads needed—auto-generated product images using unique UUIDs.

- **Safe product deletion with anonymization**  
  If a product has been purchased before, it's anonymized instead of deleted to preserve order history.

- **Clerk profile integration**  
  Users can update name/email or delete their account. Backend listens to changes and syncs data accordingly.

- **Real-time UI updates**  
  Optimistic updates with React Query—no manual refreshing needed after actions.

- **Built-in theming**  
  Dark/light/system theme toggler synced across the UI.

- **Responsive layout with sticky header + sidebar**  
  Sidebar highlights current page and includes helpful badge counts (e.g. number of users, products).

## ⚙️ Under the Hood

- **Microservices architecture** – Built with NestJS, each service runs independently for better scalability and separation of concerns.

- **gRPC for service communication** – All internal services talk via gRPC for fast, strongly-typed RPC calls.

- **RabbitMQ for async operations** – Events like checkout, rollback flows, and email notifications are handled via a centralized events handler.

- **Redis caching** – Frequently accessed data like user info, users, and products are cached in Redis for fast retrieval and reduced DB load.

- **Stripe integration** – Secure payment sessions are generated using Stripe, with fake money used in a controlled sandbox environment.

- **Clerk authentication** – User creation, updates, and deletions are managed via Clerk, with backend syncing for consistency.

- **Docker Compose orchestration** – All services run in isolated containers with manual service discovery.

- **React Query** – Optimistic UI updates and automatic query refetching make the interface feel responsive and alive.

- **Nodemailer** – Sends post-checkout email notifications to both buyers and product creators with transaction summaries.

- **Manual deployment process** *(CI/CD pending)* – Images are built and pushed to GHCR, then pulled to EC2 manually via SSH. CI/CD (e.g., GitHub Actions) is planned.

- **Service logging** – All services log request/response data using NestJS Logger. A centralized logging solution (Prometheus + Grafana + ELK) is planned.

### 🔒 External HTTPS Workaround with Ngrok

Since I don’t yet have a production domain, and services like Stripe & Clerk require public HTTPS URLs with trusted certs, I couldn’t rely on self-signed certificates alone. To solve this, I:

- Created self-signed SSL certs for NGINX internally
- Then used **Ngrok** to expose port 443 via a **static HTTPS tunnel**
- This tunnel (e.g. `https://alert-brightly-pony.ngrok-free.app`) routes to my EC2 instance and forwards all HTTPS requests to **NGINX**, which then load balances to the internal API gateways

I run `ngrok http --domain=alert-brightly-pony.ngrok-free.app 443` in a **detached `tmux` session** on my EC2 so it stays alive. Stripe and Clerk are configured to talk to this Ngrok URL.

## Architecture Diagram

![REEN Architecture Diagram](./REEN.excalidraw.png)

## 🧩 Microservices Overview

REEN is architected as a modular microservices-based system, designed for scalability, observability, and maintainability. Here's how the pieces fit together:

### **1. NGINX (Reverse Proxy)**

- Public-facing entrypoint to the entire backend system.
- Handles SSL termination using self-signed certificates.
- Forwards requests to the API Gateway cluster using a `least_conn` load balancing strategy.

### **2. API Gateway Cluster (2 Instances)**

- Acts as the single entry point into internal services.
- Load balanced by NGINX to handle traffic distribution and resilience.
- Handles routing logic for authentication, product management, cart, orders, checkout, and more.

### **3. Auth Service**

- Handles all user-related data: sign-up, sign-in, role updates, Clerk ID linkage, and more.
- Uses MongoDB as its data store.
- Exposes gRPC methods for internal services to validate users and retrieve user data.

### **4. Products Service**

- Manages creation, update, deletion, and querying of products.
- Stores data in MongoDB.
- Supports searching by admin, bulk updates, and anonymization logic.

### **5. Cart Items Service**

- Manages users’ cart items, including add/update/remove operations.
- Supports batch creation (e.g., when restoring a cart or during checkout).
- Also uses MongoDB.

### **6. Checkout Service**

- Stateless service responsible for initiating Stripe Checkout Sessions.
- Interacts with Stripe to create payment sessions and redirect users to payment.

### **7. Orders Service**

- Records successful purchases post-checkout.
- Tracks product purchase counts and links products to users via order items.
- Stores order history and supports admin queries.

### **8. Events Handler**

- Centralized event-driven orchestrator for async operations.
- Implements saga-based transaction flows.
- Handles cart clearing, stock updates, financial info updates, user deletion, notifications, and rollback handling.
- Communicates over RabbitMQ.

### **9. Redis**

- Used for caching and ephemeral data management.
- Powers idempotency handling and performance optimization.

## 🐳 Docker & DevOps

- Entire backend is **containerized** using Docker Compose
- Services run in **isolated networks** with **manual service discovery**
- **Structured logging** via NestJS `Logger`; centralized observability with **ELK / Prometheus / Grafana** planned
- CI/CD pipeline **not yet automated** due to billing issues
  → For now: `Build → Push to GHCR → SSH into EC2 → Pull & restart containers manually`

## 🧱 Tech Stack

### 🖼️ Frontend

- **Framework:** Next.js
- **Styling & UI:** TailwindCSS, ShadCN UI
- **Authentication UI:** Clerk (sign-up, sign-in, user management)

### 🧠 Backend

- **Framework:** NestJS (monorepo architecture)
- **Communication:** gRPC (synchronous microservice communication)
- **Asynchronous Workflows:** RabbitMQ (used in events-handler service)

### ⚙️ DevOps

- **Containerization:** Docker, Docker Compose
- **Load Balancing:** NGINX (public-facing reverse proxy w/ SSL termination, uses `least_conn` strategy between API gateways)
- **Deployment:**
  - Manual: Build → Push (GHCR) → SSH EC2 → Pull & Restart
  - *(CI/CD with GitHub Actions + centralized logging planned)*
- **Logging:** NestJS Logger (custom middleware and interceptors for tracking req/res)
- **Secrets/Configs:** Managed via `.env` files mounted into containers

### 🧰 Other Tools & Services

- **Authentication & Authorization:** Clerk (JWT, refresh tokens, roles)
- **Database:** MongoDB (one per microservice)
- **ORM:** Prisma
- **Caching:** Redis

## 📺 Demo / Walkthrough

> Coming soon — YouTube playlist detailing REEN's architecture and build process.

## 📄 Full Technical Documentation

See [`DOCUMENTATION.md`](./DOCUMENTATION.md) for:

- Full feature set
- Checkout saga flow
- Anonymization logic
- Role upgrade system
- Product lifecycle
- And more...
