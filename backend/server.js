require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST } = process.env;
let ACTIVE_SHOP_TOKENS = {}; // In-memory token store (replace with DB for production)

// Step 1: Install / OAuth
app.get("/auth", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.send("Missing shop");
  const redirectUri = `${HOST}/auth/callback`;
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

// Step 2: OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.send("Missing parameters");

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const { data } = await axios.post(tokenUrl, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    });
    ACTIVE_SHOP_TOKENS[shop] = data.access_token;
    res.redirect(`${HOST}/?shop=${shop}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error exchanging token");
  }
});

// API route: Products
app.get("/api/products", async (req, res) => {
  const { shop } = req.query;
  const token = ACTIVE_SHOP_TOKENS[shop];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const query = `{ products(first: 10) { edges { node { id title } } } }`;
  try {
    const resp = await axios.post(
      `https://${shop}/admin/api/2023-10/graphql.json`,
      { query },
      { headers: { "X-Shopify-Access-Token": token } }
    );
    const products = resp.data.data.products.edges.map((e) => e.node);
    res.json(products);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// API route: Customers
app.get("/api/customers", async (req, res) => {
  const { shop } = req.query;
  const token = ACTIVE_SHOP_TOKENS[shop];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const query = `{ customers(first: 10) { edges { node { id firstName lastName email } } } }`;
  try {
    const resp = await axios.post(
      `https://${shop}/admin/api/2023-10/graphql.json`,
      { query },
      { headers: { "X-Shopify-Access-Token": token } }
    );
    const customers = resp.data.data.customers.edges.map((e) => e.node);
    res.json(customers);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// API route: Billing
app.get("/api/billing", async (req, res) => {
  const { shop } = req.query;
  const token = ACTIVE_SHOP_TOKENS[shop];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const mutation = `
    mutation {
      appSubscriptionCreate(
        name: "Basic Plan",
        returnUrl: "${HOST}/?shop=${shop}",
        test: true,
        lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: 5.0, currencyCode: USD } } } }]
      ) {
        confirmationUrl
        userErrors { field message }
      }
    }
  `;
  try {
    const resp = await axios.post(
      `https://${shop}/admin/api/2023-10/graphql.json`,
      { query: mutation },
      { headers: { "X-Shopify-Access-Token": token } }
    );
    const confirmationUrl =
      resp.data.data.appSubscriptionCreate.confirmationUrl;
    res.json({ confirmationUrl });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create billing" });
  }
});

// // Serve React frontend (production)
// app.use(express.static(path.join(__dirname, "../frontend/build")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
// });

module.exports = app;
