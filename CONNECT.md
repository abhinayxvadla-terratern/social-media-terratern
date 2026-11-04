# 🔌 How to Connect a New Landing Page in 5 Steps

Connect any external landing page (Webflow, WordPress, Framer, Carrd, Shopify, or Custom HTML) to the **TerraTern Lead Page Engine** with zero backend code required.

---

## ⚡ Step 1: Register or Connect Your Page

You have two options to obtain your unique **Page Key** (`page_key`) and **Slug**:

### Option A: From the Admin Panel UI
1. Navigate to [`/admin/pages`](http://localhost:3000/admin/pages).
2. Click **Connect Page** (top right).
3. Enter your **Page Name** (e.g. `UK Skilled Worker Visa Calculator`), **Page Type**, **Keyword**, and your landing page's web address (e.g. `https://uk-visa.terrateern.com`).
4. Click **Create & Generate Key**. Copy your generated `page_key`.

### Option B: Programmatically via API
Send an authenticated `POST` request:

```bash
curl -X POST https://your-engine-domain.vercel.app/api/v1/admin/pages/register \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UK Skilled Worker Visa Calculator",
    "page_type": "quiz",
    "keyword": "Skilled Worker",
    "page_url": "https://uk-visa.terrateern.com"
  }'
```

---

## 🌐 Step 2: Verify Your Domain in `allowed_origins`

Security restricts write operations (events and leads) strictly to your authorized domains (CORS):
1. In `/admin/pages`, click **Edit** on your page.
2. Ensure your landing page domain is listed under **Allowed Origins** (e.g., `https://uk-visa.terrateern.com`).
3. *(For local development, `http://localhost:3000` is automatically permitted).*

---

## 📦 Step 3: Add the Connector Script Tag

Paste this single `<script>` tag into the `<head>` or before `</body>` of your landing page:

```html
<script
  src="https://your-engine-domain.vercel.app/connect.js"
  data-page-key="YOUR_PAGE_KEY_HERE"
  async
></script>
```

### What happens automatically on page load:
* Checks campaign status (if paused or kill switch active, displays your closed message or redirects).
* Generates and persists a secure `visitor_id`.
* Automatically captures campaign UTM tags (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `?src=`, `kw=`, `post=`).
* Automatically fires a **`view`** event to your analytics funnel.

---

## 📝 Step 4: Build or Bind Your Lead Form

You can use standard HTML form inputs or Webflow/Framer forms.

### Option A: Auto-Binding (Easiest)
Give your `<form>` the ID `terrateern-lead-form`:

```html
<form id="terrateern-lead-form">
  <!-- 1. Phone (Phone-first recommended for higher mobile conversion) -->
  <div>
    <label>Mobile Number (India +91) *</label>
    <input type="tel" name="phone" placeholder="9876543210" required />
  </div>

  <!-- 2. Full Name -->
  <div>
    <label>Full Name *</label>
    <input type="text" name="name" placeholder="Rahul Sharma" required />
  </div>

  <!-- 3. Email Address -->
  <div>
    <label>Email Address *</label>
    <input type="email" name="email" placeholder="rahul@example.com" required />
  </div>

  <!-- 4. Consent -->
  <div>
    <input type="checkbox" name="consent" id="consent" checked required />
    <label for="consent">I agree to receive eligibility assessment details.</label>
  </div>

  <!-- Submit Button (Automatically disabled until all fields pass validation) -->
  <button type="submit" disabled>Submit & Claim Guide</button>
</form>
```

`connect.js` automatically:
* Provides live green/red visual validation feedback.
* Checks Indian mobile numbers (+91, exactly 10 digits starting with 6-9, rejects fake patterns).
* Displays a 1-click **"Did you mean name@gmail.com?"** suggestion if a visitor mistypes their email domain.
* Automatically captures a **Partial Lead** the instant 10 digits are typed (preventing lost drop-offs).
* Keeps the Submit button disabled until Name, Email, Phone, and Consent are valid.

### Option B: JavaScript Custom Integration (For Multi-Step Quizzes)
If you build a multi-step interactive quiz, you can call the exposed methods on `window.TTConnector`:

```javascript
// 1. When visitor clicks "Start Quiz":
TTConnector.trackStart();

// 2. When visitor answers Question 1:
TTConnector.trackAnswer(1, { answer: "Bachelor Degree", points: 15 });

// 3. When visitor answers Question 2:
TTConnector.trackAnswer(2, { answer: "B2 German", points: 10 });

// 4. When visitor reaches the final lead form:
TTConnector.submitLead({
  name: "Rahul Sharma",
  email: "rahul@gmail.com",
  phone: "+919876543210",
  country_code: "IN",
  consent: true,
  quiz_score: 65,
  quiz_result: "High Eligibility (Qualified)"
}).then(response => {
  if (response.success) {
    console.log("Lead captured! ID:", response.lead_id);
    if (response.download_url) {
      // 10-minute temporary signed PDF download URL
      window.location.href = response.download_url;
    }
  }
});
```

---

## 📊 Step 5: Test & Monitor Live in Admin

1. Open your landing page in an Incognito tab or mobile browser.
2. In the Admin Portal:
   * **`/admin/pages`**: Watch the **Leads Count** and **Conversion %** update.
   * **`/admin/leads`**: View the newly captured lead, test CSV export, and click the lead row to inspect the full timeline drawer.
   * **`/admin/traction`**: Inspect the funnel progression and question drop-off breakdown.
3. Test the **Master Kill Switch**: Flip the toggle on `/admin/pages` — immediately reload your landing page to see the automated paused message or redirect in action.
