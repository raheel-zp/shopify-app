// server.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const app = express();

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST } = process.env;

let ACTIVE_SHOP_TOKENS = {}; // In-memory store for demo

// Step 1: Install/Authorization endpoint
app.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.send("Missing shop parameter");
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl =
    `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${SCOPES}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

// Step 2: OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.send("Missing parameters");
  // Exchange code for access token
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;
  const { data } = await axios.post(tokenUrl, {
    client_id: SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  });
  ACTIVE_SHOP_TOKENS[shop] = data.access_token;
  res.redirect(`/dashboard?shop=${shop}`);
});

// Step 3: Billing (optional, for recurring charge)
app.get("/billing", async (req, res) => {
  const { shop } = req.query;
  const accessToken = ACTIVE_SHOP_TOKENS[shop];
  if (!accessToken) return res.redirect(`/auth?shop=${shop}`);

  // Create a recurring charge (test mode)
  const mutation = `
    mutation {
      appSubscriptionCreate(
        name: "Basic Plan",
        returnUrl: "${HOST}/dashboard?shop=${shop}",
        test: true,
        lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: 5.0, currencyCode: USD } } } }]
      ) {
        confirmationUrl
        userErrors { field message }
      }
    }
  `;
  const resp = await axios.post(
    `https://${shop}/admin/api/2023-10/graphql.json`,
    { query: mutation },
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  const confirmationUrl = resp.data.data.appSubscriptionCreate.confirmationUrl;
  res.redirect(confirmationUrl);
});

// Step 4: Dashboard - Show Products and Customers
app.get("/dashboard", async (req, res) => {
  const { shop } = req.query;
  const accessToken = ACTIVE_SHOP_TOKENS[shop];
  if (!accessToken) return res.redirect(`/auth?shop=${shop}`);

  // Fetch products
  const productsQuery = `{ products(first: 5) { edges { node { id title } } } }`;
  const productsResp = await axios.post(
    `https://${shop}/admin/api/2023-10/graphql.json`,
    { query: productsQuery },
    { headers: { "X-Shopify-Access-Token": accessToken } }
  );
  const products = productsResp.data.data.products.edges.map((e) => e.node);

  // Render simple HTML
  res.send(`
    <h1>Shopify App Dashboard</h1>
    <h2>Products</h2>
    <ul>${products.map((p) => `<li>${p.title} (${p.id})</li>`).join("")}</ul>
    <a href="/billing?shop=${shop}">Test Billing</a>
  `);
});

// Home route
app.get("/", (req, res) => {
  res.send('<a href="/auth?shop=your-dev-store.myshopify.com">Install App</a>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
