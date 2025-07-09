# REEN - Technical and Functional Overview

**REEN** is a microservices-based, virtual-economy e-commerce simulation platform. Features are designed with robustness, UX clarity, and simulation fairness in mind.

## 1. **User Onboarding and Profile**

* Users sign up via Clerk.
* Post-signup: redirected to `/profile` page.
* Default data:
  * **Balance**: \$4,000,000.00
  * **Amount Spent**: \$0.00
  * **Amount Gained**: \$0.00
  * **Sales Count**: 0
  * **Purchases Count**: 0
  * **Products Count**: 0
  * **Role**: `NADMIN` (Non-Admin)
* Role badge displayed prominently; `ADMIN` styled distinctly.

## 2. **Navigation and Layout**

* Sidebar with routes:
  * **Profile**
  * **Users**
  * **Products**
  * **My Products**
  * **Orders**
* Footer of sidebar:
  * "Create a Product" button (enabled for Admins only)
  * "Become an ADMIN/NADMIN" toggle
* Header:
  * Sidebar toggler
  * Theme toggler (dark/light/system)
  * REEN icon (changes with theme)
  * Clerk user button
  * Cart icon with badge count

### 3. **Users Page (`/users`)**

* Data table: sortable, searchable, paginated
* Columns:
  * Name (linked to profile)
  * Role (with badge)
  * Balance (formatted in USD)
  * Date Joined (human-friendly)
  * Actions (View Profile)
* Faceted filters: filter by role (`ADMIN`, `NADMIN`)
* Menu badge shows total users
* Self-profile clicks redirect to `/profile`

## 4. **Products Page (`/products`)**

* Data table with:
  * **Name + Quantity** (popover with image preview; links to product page)
  * **Price**
  * **# Purchases**
  * **Admin Name** (linked to admin's profile)
  * **Actions** (View / Update / Delete depending on user role)
* Alert for low stock (< 8) if product belongs to current user
* Excludes anonymized products
* Menu badge shows total number of products

### 5. **Product Page (`/products/[productId]`)**

* Product carousel with all images
* Details: name, description, price
* "Add to Cart" button
  * disabled if:
    * Product belongs to current user
    * Product quantity is 0
* On add:
  * Dialog for quantity input (1 to available)
  * Cart item created and cart sheet shown
* "Other Products of `Admin's Name`" section (scrollable row)
* If product is anonymized:
  * "Other products of `Admin's Name`" omitted
  * Add to cart disabled

### 6. **Create/Update Product**

* Only Admins can create
* Costs 4% of (price \* quantity)
* Update fee calculated as:
  * 4% of ((newPrice \* newQty) - (oldPrice \* oldQty))
* Dialog includes:
  * Name, Description, Price, Quantity
  * Image URL Generator (up to 6 via robohash + UUID)
  * Real-time balance update, fee calculation
* Update uses same dialog with pre-filled fields

### 7. **Product Deletion Logic**

* Admins can delete only their products
* If product has no linked order items:
  * Fully deleted (also deletes related cart items)
* If linked to order items:
  * Anonymized (admin ID replaced with `ANONYMOUS` user)
  * Removed from listings, but product page remains viewable

### 8. **Cart and Checkout**

* Cart icon shows badge with item count
* Cart sheet automatically opens after adding item
* Checkout:
  * Stripe integration
  * Limit: max \$999,999.99 per checkout
  * Disabled and alert shown if limit exceeded
  * Users can adjust cart items
  * Before redirect: dialog with test card info (4242..., any date/CVC)
* After payment:
  * Success page: confetti, buttons to view orders or continue shopping
  * Failure page: retry button, return home, contact support

### 9. **Checkout Processing (Saga Flow)**

* Steps:
  1. Prepare and cache relevant data with Saga ID
  2. Update product quantities
  3. Update user/admin financial infos
  4. Clear user's cart
  5. Create order
  6. Update sales/purchase counts
  7. Notify buyer + product admins via email (Nodemailer)
  8. Clear Saga cache
* Rollback supported if any mutation fails mid-flow

### 10. **My Products Page (`/products?mine=true`)**

* Filtered version of Products Page (by current user's adminId)

### 11. **Orders Page (`/orders`)**

* Data table: total cost, item count, created at, actions
* Action: view order detail page
* Order detail page:
  * Data table: product name, quantity, subtotal
  * Subtotal includes price per item (shown smaller)

### 12. **Role Upgrade Flow**

* Non-admins see "Become an ADMIN" button
* Upgrade cost: \$160,000 (must have sufficient balance)
* Dialog explains benefits + fee
* Real-time balance update
* On success:
  * Role badge updated
  * "Create Product" button enabled
  * Balance and amount spent updated

### 13. **Account Deletion Handling**

* On user deletion via Clerk:
  1. Delete user's cart items
  2. Delete cart items linked to their products
  3. Delete/anonymize their products
  4. Delete user from DB
* Orders preserved (for analytics + integrity)

### 14. **Theming & User Preferences**

* Dark/Light/System toggle
* UI synced with theme (icons, Clerk button, REEN logo)

### 15. **Miscellaneous**

* Redis used for caching (Dockerized)
* Mutations use React Query for instant UI updates
* Clerk webhooks handled:
  * On update: sync name/email with DB, clear cache
  * On delete: triggers deletion flow
* Products, Users, and other badges show entity counts
