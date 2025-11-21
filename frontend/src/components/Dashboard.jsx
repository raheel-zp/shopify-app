import {
  Page,
  Layout,
  Card,
  DataTable,
  Banner,
  Button,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard({ shop }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [billingUrl, setBillingUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shop) return;
    async function fetchData() {
      try {
        const p = await axios.get(`/api/products?shop=${shop}`);
        setProducts(p.data);
        const c = await axios.get(`/api/customers?shop=${shop}`);
        setCustomers(c.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load data");
      }
    }
    fetchData();
  }, [shop]);

  const handleBilling = async () => {
    try {
      const res = await axios.get(`/api/billing?shop=${shop}`);
      setBillingUrl(res.data.confirmationUrl);
    } catch {
      setError("Billing creation failed");
    }
  };

  const productRows = products.map((p) => [p.id, p.title]);
  const customerRows = customers.map((c) => [
    c.id,
    `${c.firstName} ${c.lastName}`,
    c.email,
  ]);

  return (
    <Page title="Shopify Dashboard">
      <Layout>
        {error && <Banner title={error} status="critical" />}
        <Layout.Section>
          <Card title="Products" sectioned>
            <DataTable
              columnContentTypes={["text", "text"]}
              headings={["ID", "Title"]}
              rows={productRows}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card title="Customers" sectioned>
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["ID", "Name", "Email"]}
              rows={customerRows}
            />
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card title="Billing" sectioned>
            <Button onClick={handleBilling}>Create / Confirm Billing</Button>
            {billingUrl && (
              <Banner title="Billing Confirmation" status="success">
                <a href={billingUrl} target="_blank" rel="noreferrer">
                  Go to Shopify Billing
                </a>
              </Banner>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
